const mongoose = require('mongoose');

const consumerSchema = new mongoose.Schema({
  consumerId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  meterNumber: { type: String, required: true, unique: true },
  area: { type: String, default: 'Unknown' },
  address: { type: String, default: '' },
  connectionType: { type: String, enum: ['Residential', 'Commercial', 'Industrial'], default: 'Residential' },
  sanctionedLoad: { type: Number, default: 5 }, // in kW
  status: { type: String, enum: ['Active', 'Suspended', 'Disconnected'], default: 'Active' },
  riskLevel: { type: String, enum: ['Normal', 'Medium', 'High'], default: 'Normal' },
  riskScore: { type: Number, default: 0 },
  totalAnomalies: { type: Number, default: 0 },
  lastAnalyzed: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Consumer', consumerSchema);
