const express = require('express');
const router = express.Router();
const Consumer = require('../models/Consumer');
const Bill = require('../models/Bill');
const Alert = require('../models/Alert');

// GET /api/consumers
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      risk = '',
      sort = 'riskScore',
      order = 'desc',
      area = '',
    } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { consumerId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { meterNumber: { $regex: search, $options: 'i' } },
        { area: { $regex: search, $options: 'i' } },
      ];
    }
    if (risk) query.riskLevel = risk;
    if (area) query.area = area;

    const total = await Consumer.countDocuments(query);
    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };

    const consumers = await Consumer.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // Attach last bill info
    const enriched = await Promise.all(consumers.map(async (c) => {
      const lastBill = await Bill.findOne({ consumerId: c.consumerId }).sort({ month: -1 }).lean();
      return { ...c, lastBill };
    }));

    res.json({
      consumers: enriched,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Consumers list error:', err);
    res.status(500).json({ error: 'Failed to load consumers' });
  }
});

// DELETE /api/consumers (bulk delete)
router.delete('/', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No consumer IDs provided' });
    }
    const billDel = await Bill.deleteMany({ consumerId: { $in: ids } });
    const alertDel = await Alert.deleteMany({ consumerId: { $in: ids } });
    const result = await Consumer.deleteMany({ consumerId: { $in: ids } });
    res.json({ deleted: result.deletedCount, alertsDeleted: alertDel.deletedCount, billsDeleted: billDel.deletedCount });
  } catch (err) {
    console.error('Bulk delete error:', err);
    res.status(500).json({ error: 'Failed to delete consumers' });
  }
});

// GET /api/consumers/:id
router.get('/:id', async (req, res) => {
  try {
    const consumer = await Consumer.findOne({ consumerId: req.params.id }).lean();
    if (!consumer) return res.status(404).json({ error: 'Consumer not found' });

    const bills = await Bill.find({ consumerId: req.params.id }).sort({ month: 1 }).lean();

    res.json({ consumer, bills });
  } catch (err) {
    console.error('Consumer detail error:', err);
    res.status(500).json({ error: 'Failed to load consumer' });
  }
});

module.exports = router;
