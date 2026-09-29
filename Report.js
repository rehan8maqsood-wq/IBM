const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  consumerId: { type: String, required: true },
  consumerName: { type: String },
  meterNumber: { type: String },
  reportTitle: { type: String },
  generatedAt: { type: Date, default: Date.now },
  generatedBy: { type: String, default: 'System' },
  status: { type: String, enum: ['Draft', 'Final', 'Archived'], default: 'Final' },
  riskScore: { type: Number },
  riskLevel: { type: String },
  anomalies: [{ type: Object }],
  evidence: [{ type: String }],
  aiExplanation: { type: String },
  aiSummary: { type: String },
  detectedIndicators: [{ type: String }],
  alternativeExplanations: [{ type: String }],
  verificationSteps: [{ type: String }],
  investigationStatus: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Closed'],
    default: 'Pending'
  },
  billData: [{ type: Object }],
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
