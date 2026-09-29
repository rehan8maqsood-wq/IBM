const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  consumerId: { type: String, required: true, index: true },
  consumerRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Consumer' },
  meterNumber: { type: String, required: true },
  month: { type: String, required: true }, // e.g., "2024-01"
  previousMeterReading: { type: Number, required: true },
  currentMeterReading: { type: Number, required: true },
  actualConsumption: { type: Number }, // calculated: current - previous
  billedUnits: { type: Number, required: true },
  billAmount: { type: Number, required: true },
  meterBillDifference: { type: Number }, // actualConsumption - billedUnits
  // Anomaly fields
  isAnomalous: { type: Boolean, default: false },
  anomalyTypes: [{ type: String }],
  riskScore: { type: Number, default: 0 },
  riskLevel: { type: String, enum: ['Normal', 'Medium', 'High'], default: 'Normal' },
  percentageDeviation: { type: Number, default: 0 },
  historicalAverage: { type: Number, default: 0 },
  analyzed: { type: Boolean, default: false }
}, { timestamps: true });

// Calculate actualConsumption before save
billSchema.pre('save', function (next) {
  this.actualConsumption = this.currentMeterReading - this.previousMeterReading;
  this.meterBillDifference = this.actualConsumption - this.billedUnits;
  next();
});

module.exports = mongoose.model('Bill', billSchema);
