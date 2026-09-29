const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Bill = require('../models/Bill');
const Consumer = require('../models/Consumer');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls'].includes(ext)) cb(null, true);
    else cb(new Error('Only CSV and Excel files are allowed'));
  }
});

// GET /api/bills
router.get('/', async (req, res) => {
  try {
    const { consumerId, page = 1, limit = 50 } = req.query;
    const query = consumerId ? { consumerId } : {};
    const bills = await Bill.find(query)
      .sort({ month: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    const total = await Bill.countDocuments(query);
    res.json({ bills, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load bills' });
  }
});

// POST /api/bills/upload
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    let records = [];

    if (ext === '.csv') {
      records = parse(req.file.buffer.toString(), {
        columns: true, skip_empty_lines: true, trim: true
      });
    } else {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      records = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }

    if (!records.length) return res.status(400).json({ error: 'File is empty or has no data rows' });

    // Validate required fields
    const requiredFields = ['consumerId', 'meterNumber', 'month', 'previousMeterReading', 'currentMeterReading', 'billedUnits', 'billAmount'];
    const errors = [];
    const validRecords = [];

    records.forEach((row, idx) => {
      const rowNum = idx + 2;
      const rowErrors = [];

      for (const field of requiredFields) {
        if (!row[field] && row[field] !== 0) rowErrors.push(`Missing ${field}`);
      }

      const prev = parseFloat(row.previousMeterReading);
      const curr = parseFloat(row.currentMeterReading);
      const billed = parseFloat(row.billedUnits);
      const amount = parseFloat(row.billAmount);

      if (!isNaN(prev) && !isNaN(curr) && curr < prev) rowErrors.push('Current reading cannot be less than previous reading');
      if (!isNaN(billed) && billed < 0) rowErrors.push('Billed units cannot be negative');
      if (!isNaN(amount) && amount < 0) rowErrors.push('Bill amount cannot be negative');
      if (row.month && !/^\d{4}-\d{2}$/.test(String(row.month).trim())) rowErrors.push('Month must be in YYYY-MM format');

      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, consumerId: row.consumerId || 'Unknown', errors: rowErrors });
      } else {
        validRecords.push({
          consumerId: String(row.consumerId).trim(),
          meterNumber: String(row.meterNumber).trim(),
          month: String(row.month).trim(),
          previousMeterReading: prev,
          currentMeterReading: curr,
          actualConsumption: curr - prev,
          billedUnits: billed,
          billAmount: amount,
          meterBillDifference: (curr - prev) - billed,
          analyzed: false,
        });
      }
    });

    if (req.query.preview === 'true') {
      return res.json({ preview: records.slice(0, 10), total: records.length, errors, validCount: validRecords.length });
    }

    // Import valid records
    let imported = 0;
    for (const record of validRecords) {
      await Bill.findOneAndUpdate(
        { consumerId: record.consumerId, month: record.month },
        record,
        { upsert: true, new: true }
      );
      // Upsert consumer if not exists
      await Consumer.findOneAndUpdate(
        { consumerId: record.consumerId },
        { $setOnInsert: { consumerId: record.consumerId, name: `Consumer ${record.consumerId}`, meterNumber: record.meterNumber, area: 'Unknown', riskLevel: 'Normal' } },
        { upsert: true }
      );
      imported++;
    }

    res.json({ success: true, imported, errors, total: records.length });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to process file' });
  }
});

module.exports = router;
