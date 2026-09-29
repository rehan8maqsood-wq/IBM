const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Report = require('../models/Report');
const Consumer = require('../models/Consumer');
const Bill = require('../models/Bill');

// DELETE /api/reports (bulk)
router.delete('/', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    // Cast string ids to ObjectId so Mongoose matches correctly
    const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));
    const result = await Report.deleteMany({ _id: { $in: objectIds } });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    console.error('Bulk report delete error:', err);
    res.status(500).json({ error: 'Failed to delete reports', detail: err.message });
  }
});

// GET /api/reports
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const total = await Report.countDocuments();
    const reports = await Report.find()
      .sort({ generatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    res.json({ reports, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load reports' });
  }
});

// POST /api/reports
router.post('/', async (req, res) => {
  try {
    const { consumerId, aiExplanation, anomalies, evidence, riskScore, riskLevel, detectedIndicators, alternativeExplanations, verificationSteps, aiSummary } = req.body;
    if (!consumerId) return res.status(400).json({ error: 'consumerId is required' });

    const consumer = await Consumer.findOne({ consumerId }).lean();
    if (!consumer) return res.status(404).json({ error: 'Consumer not found' });

    const bills = await Bill.find({ consumerId }).sort({ month: 1 }).lean();

    const report = await Report.create({
      consumerId,
      consumerName: consumer.name,
      meterNumber: consumer.meterNumber,
      reportTitle: `Investigation Report — ${consumer.name} (${consumerId})`,
      riskScore,
      riskLevel,
      anomalies: anomalies || [],
      evidence: evidence || [],
      aiExplanation: aiExplanation || '',
      aiSummary: aiSummary || '',
      detectedIndicators: detectedIndicators || [],
      alternativeExplanations: alternativeExplanations || [],
      verificationSteps: verificationSteps || [],
      billData: bills.slice(-6),
      investigationStatus: 'Pending',
    });

    res.json(report);
  } catch (err) {
    console.error('Report creation error:', err);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// GET /api/reports/:id
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).lean();
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load report' });
  }
});

// DELETE /api/reports/:id
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    console.error('Single report delete error:', err);
    res.status(500).json({ error: 'Failed to delete report', detail: err.message });
  }
});

module.exports = router;
