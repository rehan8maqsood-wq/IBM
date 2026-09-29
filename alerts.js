const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');

// GET /api/alerts
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', severity = '', search = '' } = req.query;
    const query = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (search) {
      query.$or = [
        { consumerId: { $regex: search, $options: 'i' } },
        { consumerName: { $regex: search, $options: 'i' } },
        { alertType: { $regex: search, $options: 'i' } },
      ];
    }
    const total = await Alert.countDocuments(query);
    const alerts = await Alert.find(query)
      .sort({ detectedDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    res.json({ alerts, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load alerts' });
  }
});

// PATCH /api/alerts/:id
router.patch('/:id', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const update = {};
    if (status) update.status = status;
    if (notes !== undefined) update.notes = notes;
    if (status === 'Resolved') update.resolvedDate = new Date();
    const alert = await Alert.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

module.exports = router;
