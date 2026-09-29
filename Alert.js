const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  consumerId: { type: String, required: true, index: true },
  consumerName: { type: String },
  meterNumber: { type: String },
  alertType: {
    type: String,
    enum: [
      'Consumption Drop',
      'Consumption Spike',
      'Meter/Billing Mismatch',
      'Repeated Anomaly',
      'Multiple Indicators',
      'Unusual Billing Amount',
      'Consecutive Abnormal Periods'
    ],
    required: true
  },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  riskScore: { type: Number, default: 0 },
  month: { type: String },
  description: { type: String },
  evidence: [{ type: String }],
  status: {
    type: String,
    enum: ['New', 'Under Investigation', 'Reviewed', 'Resolved'],
    default: 'New'
  },
  detectedDate: { type: Date, default: Date.now },
  resolvedDate: { type: Date },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
