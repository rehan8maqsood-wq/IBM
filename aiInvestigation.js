const express = require('express');
const router = express.Router();
const Consumer = require('../models/Consumer');
const Bill = require('../models/Bill');
const { detectAnomalies } = require('../services/anomalyDetection');
const { investigateWithGrok } = require('../services/grokService');

// POST /api/ai-investigation/:consumerId
router.post('/:consumerId', async (req, res) => {
  try {
    const { consumerId } = req.params;

    // Step 1: Load consumer
    const consumer = await Consumer.findOne({ consumerId }).lean();
    if (!consumer) return res.status(404).json({ error: 'Consumer not found' });

    // Step 2: Load billing history
    const allBills = await Bill.find({ consumerId }).sort({ month: 1 }).lean();
    if (allBills.length === 0) return res.status(400).json({ error: 'No billing records found' });

    // Step 3: Deterministic anomaly detection on latest bill
    const latest = allBills[allBills.length - 1];
    const historical = allBills.slice(0, -1).map(b => ({ ...b, isAnomalous: b.isAnomalous || false }));
    const analysis = detectAnomalies(latest, historical);

    // Step 4: Prepare structured evidence for Grok
    const evidencePackage = {
      consumerId,
      consumerName: consumer.name,
      meterNumber: consumer.meterNumber,
      month: latest.month,
      metrics: analysis.metrics,
      anomalies: analysis.anomalies,
      evidenceList: analysis.evidence,
      riskScore: analysis.riskScore,
      riskLevel: analysis.riskLevel,
    };

    // Step 5: Call Grok
    const grokResult = await investigateWithGrok(evidencePackage);

    // Step 6: Build response
    const response = {
      consumerId,
      consumerName: consumer.name,
      meterNumber: consumer.meterNumber,
      month: latest.month,
      deterministicAnalysis: {
        isAnomalous: analysis.isAnomalous,
        anomalies: analysis.anomalies,
        evidence: analysis.evidence,
        riskScore: analysis.riskScore,
        riskLevel: analysis.riskLevel,
        metrics: analysis.metrics,
      },
      aiAnalysis: grokResult.success
        ? {
            available: true,
            model: grokResult.model,
            ...grokResult.analysis,
          }
        : {
            available: false,
            error: grokResult.error,
            message: 'AI explanation temporarily unavailable. Numerical anomaly analysis is still available.',
          },
      billingHistory: allBills.map(b => ({
        month: b.month,
        actualConsumption: b.actualConsumption || (b.currentMeterReading - b.previousMeterReading),
        billedUnits: b.billedUnits,
        billAmount: b.billAmount,
        riskScore: b.riskScore,
        riskLevel: b.riskLevel,
        isAnomalous: b.isAnomalous,
      })),
    };

    res.json(response);
  } catch (err) {
    console.error('AI investigation error:', err);
    res.status(500).json({ error: 'Investigation failed', message: err.message });
  }
});

module.exports = router;
