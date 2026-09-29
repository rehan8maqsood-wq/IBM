const express = require('express');
const router = express.Router();
const Consumer = require('../models/Consumer');
const Bill = require('../models/Bill');
const Alert = require('../models/Alert');
const { detectAnomalies } = require('../services/anomalyDetection');

// POST /api/analyze/:consumerId
router.post('/:consumerId', async (req, res) => {
  try {
    const { consumerId } = req.params;
    const consumer = await Consumer.findOne({ consumerId }).lean();
    if (!consumer) return res.status(404).json({ error: 'Consumer not found' });

    const allBills = await Bill.find({ consumerId }).sort({ month: 1 }).lean();
    if (allBills.length === 0) return res.status(400).json({ error: 'No bills found for this consumer' });

    const results = [];
    for (let i = 0; i < allBills.length; i++) {
      const hist = allBills.slice(Math.max(0, i - 8), i).map(b => ({ ...b, isAnomalous: b.isAnomalous || false }));
      const result = detectAnomalies(allBills[i], hist);
      results.push({ month: allBills[i].month, ...result });

      // Update bill in DB
      await Bill.findByIdAndUpdate(allBills[i]._id, {
        isAnomalous: result.isAnomalous,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        anomalyTypes: result.anomalyTypes,
        percentageDeviation: result.metrics.percentageDeviation,
        historicalAverage: result.metrics.historicalAverage,
        analyzed: true,
      });
    }

    // Update consumer risk
    const latest = results[results.length - 1];
    const totalAnomalies = results.filter(r => r.isAnomalous).length;
    await Consumer.findOneAndUpdate({ consumerId }, {
      riskScore: latest.riskScore,
      riskLevel: latest.riskLevel,
      totalAnomalies,
      lastAnalyzed: new Date(),
    });

    // Auto-generate alert if high risk
    if (latest.isAnomalous && latest.riskScore >= 50) {
      const primaryType = latest.anomalyTypes[0] || 'Multiple Indicators';
      await Alert.findOneAndUpdate(
        { consumerId, month: latest.month, alertType: primaryType },
        {
          consumerId,
          consumerName: consumer.name,
          meterNumber: consumer.meterNumber,
          alertType: primaryType,
          severity: latest.riskScore >= 70 ? 'Critical' : 'High',
          riskScore: latest.riskScore,
          month: latest.month,
          description: `${primaryType} detected in ${latest.month}`,
          evidence: latest.evidence,
          status: 'New',
          detectedDate: new Date(),
        },
        { upsert: true }
      );
    }

    res.json({ consumerId, totalBills: allBills.length, totalAnomalies, latestAnalysis: latest, allResults: results });
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: 'Analysis failed', message: err.message });
  }
});

module.exports = router;
