const express = require('express');
const router = express.Router();
const Consumer = require('../models/Consumer');
const Bill = require('../models/Bill');
const Alert = require('../models/Alert');

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    const [totalConsumers, totalBills, suspiciousCases, highRiskCases, recentAlerts] = await Promise.all([
      Consumer.countDocuments(),
      Bill.countDocuments({ analyzed: true }),
      Consumer.countDocuments({ riskLevel: { $in: ['Medium', 'High'] } }),
      Consumer.countDocuments({ riskLevel: 'High' }),
      Alert.find({ status: 'New' }).sort({ detectedDate: -1 }).limit(10).lean(),
    ]);

    const normalCases = totalConsumers - suspiciousCases;

    // Risk distribution
    const riskDistribution = await Consumer.aggregate([
      { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
    ]);

    // Anomaly trend by month (last 6 months)
    const anomalyTrend = await Bill.aggregate([
      { $match: { isAnomalous: true } },
      { $group: { _id: '$month', count: { $sum: 1 }, avgRisk: { $avg: '$riskScore' } } },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]);

    // Consumption trend across all consumers by month
    const consumptionTrend = await Bill.aggregate([
      { $group: { _id: '$month', avgConsumption: { $avg: '$actualConsumption' }, totalBills: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]);

    // Top suspicious consumers
    const topSuspicious = await Consumer.find({ riskLevel: { $in: ['Medium', 'High'] } })
      .sort({ riskScore: -1 })
      .limit(10)
      .select('consumerId name area riskScore riskLevel totalAnomalies meterNumber')
      .lean();

    // Alert type distribution
    const alertTypes = await Alert.aggregate([
      { $group: { _id: '$alertType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      stats: { totalConsumers, totalBills, suspiciousCases, highRiskCases, normalCases },
      riskDistribution,
      anomalyTrend,
      consumptionTrend,
      topSuspicious,
      alertTypes,
      recentAlerts,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

module.exports = router;
