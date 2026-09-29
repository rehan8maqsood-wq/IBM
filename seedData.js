/**
 * GridGuard AI — Seed Data Generator
 * Creates 100+ realistic consumers with multiple months of billing data
 * including normal, suspicious, and high-risk patterns.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Consumer = require('../models/Consumer');
const Bill = require('../models/Bill');
const Alert = require('../models/Alert');
const { detectAnomalies } = require('../services/anomalyDetection');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gridguard';

const areas = ['North Zone', 'South Zone', 'East Zone', 'West Zone', 'Central Zone', 'Industrial Area', 'Commercial Hub', 'Suburban District'];
const firstNames = ['Rajesh', 'Priya', 'Amit', 'Sunita', 'Vikram', 'Kavita', 'Suresh', 'Meena', 'Arun', 'Deepa', 'Mohan', 'Lata', 'Ravi', 'Anita', 'Dinesh', 'Pooja', 'Sanjay', 'Geeta', 'Ramesh', 'Nisha'];
const lastNames = ['Sharma', 'Patel', 'Singh', 'Verma', 'Gupta', 'Mishra', 'Yadav', 'Tiwari', 'Joshi', 'Kapoor', 'Malhotra', 'Agarwal', 'Bose', 'Mehta', 'Reddy'];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function addNoise(base, pct = 0.15) {
  return Math.max(50, Math.round(base * (1 + (Math.random() - 0.5) * 2 * pct)));
}

const MONTHS = ['2023-07','2023-08','2023-09','2023-10','2023-11','2023-12','2024-01','2024-02','2024-03','2024-04','2024-05','2024-06'];

function generateNormalBills(consumerId, meterNumber, baseConsumption, startReading) {
  const bills = [];
  let meterReading = startReading;
  for (const month of MONTHS) {
    const consumption = addNoise(baseConsumption, 0.12);
    const prev = meterReading;
    const curr = prev + consumption;
    const billed = consumption; // normal: billed = actual
    const amount = +(billed * 6.5 + 50).toFixed(2);
    bills.push({ consumerId, meterNumber, month, previousMeterReading: prev, currentMeterReading: curr, billedUnits: billed, billAmount: amount });
    meterReading = curr;
  }
  return bills;
}

function generateDropBills(consumerId, meterNumber, baseConsumption, startReading) {
  const bills = [];
  let meterReading = startReading;
  for (let i = 0; i < MONTHS.length; i++) {
    const month = MONTHS[i];
    let consumption;
    if (i >= MONTHS.length - 3) {
      consumption = addNoise(baseConsumption * 0.22, 0.08); // sudden drop in last 3 months
    } else {
      consumption = addNoise(baseConsumption, 0.10);
    }
    const prev = meterReading;
    const curr = prev + consumption;
    const billed = consumption;
    const amount = +(billed * 6.5 + 50).toFixed(2);
    bills.push({ consumerId, meterNumber, month, previousMeterReading: prev, currentMeterReading: curr, billedUnits: billed, billAmount: amount });
    meterReading = curr;
  }
  return bills;
}

function generateSpikeBills(consumerId, meterNumber, baseConsumption, startReading) {
  const bills = [];
  let meterReading = startReading;
  for (let i = 0; i < MONTHS.length; i++) {
    const month = MONTHS[i];
    const spikeMonth = MONTHS.length - 2;
    const consumption = i === spikeMonth
      ? addNoise(baseConsumption * 2.8, 0.05)
      : addNoise(baseConsumption, 0.10);
    const prev = meterReading;
    const curr = prev + consumption;
    const billed = consumption;
    const amount = +(billed * 6.5 + 50).toFixed(2);
    bills.push({ consumerId, meterNumber, month, previousMeterReading: prev, currentMeterReading: curr, billedUnits: billed, billAmount: amount });
    meterReading = curr;
  }
  return bills;
}

function generateMismatchBills(consumerId, meterNumber, baseConsumption, startReading) {
  const bills = [];
  let meterReading = startReading;
  for (let i = 0; i < MONTHS.length; i++) {
    const month = MONTHS[i];
    const consumption = addNoise(baseConsumption, 0.10);
    const prev = meterReading;
    const curr = prev + consumption;
    // Mismatch: billed units significantly lower than actual
    const mismatch = i >= MONTHS.length - 4;
    const billed = mismatch ? Math.round(consumption * 0.55) : consumption;
    const amount = +(billed * 6.5 + 50).toFixed(2);
    bills.push({ consumerId, meterNumber, month, previousMeterReading: prev, currentMeterReading: curr, billedUnits: billed, billAmount: amount });
    meterReading = curr;
  }
  return bills;
}

function generateRepeatedAnomalyBills(consumerId, meterNumber, baseConsumption, startReading) {
  const bills = [];
  let meterReading = startReading;
  for (let i = 0; i < MONTHS.length; i++) {
    const month = MONTHS[i];
    const isOdd = i % 2 === 1;
    const consumption = isOdd
      ? addNoise(baseConsumption * 0.28, 0.08)
      : addNoise(baseConsumption, 0.10);
    const prev = meterReading;
    const curr = prev + consumption;
    const billed = consumption;
    const amount = +(billed * 6.5 + 50).toFixed(2);
    bills.push({ consumerId, meterNumber, month, previousMeterReading: prev, currentMeterReading: curr, billedUnits: billed, billAmount: amount });
    meterReading = curr;
  }
  return bills;
}

function generateMultipleIndicatorBills(consumerId, meterNumber, baseConsumption, startReading) {
  const bills = [];
  let meterReading = startReading;
  for (let i = 0; i < MONTHS.length; i++) {
    const month = MONTHS[i];
    const last = i >= MONTHS.length - 3;
    const consumption = last ? addNoise(baseConsumption * 0.18, 0.05) : addNoise(baseConsumption, 0.10);
    const prev = meterReading;
    const curr = prev + consumption;
    const billed = last ? Math.round(consumption * 1.4) : consumption; // mismatch + drop combo
    const amount = +(billed * 6.5 + 50).toFixed(2);
    bills.push({ consumerId, meterNumber, month, previousMeterReading: prev, currentMeterReading: curr, billedUnits: billed, billAmount: amount });
    meterReading = curr;
  }
  return bills;
}

const patterns = [
  { fn: generateNormalBills, weight: 45 },
  { fn: generateDropBills, weight: 15 },
  { fn: generateSpikeBills, weight: 12 },
  { fn: generateMismatchBills, weight: 12 },
  { fn: generateRepeatedAnomalyBills, weight: 10 },
  { fn: generateMultipleIndicatorBills, weight: 6 },
];

function pickPattern() {
  const total = patterns.reduce((s, p) => s + p.weight, 0);
  let rand = Math.random() * total;
  for (const p of patterns) {
    rand -= p.weight;
    if (rand <= 0) return p.fn;
  }
  return patterns[0].fn;
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Consumer.deleteMany({});
  await Bill.deleteMany({});
  await Alert.deleteMany({});
  console.log('Cleared existing data');

  const consumerDocs = [];
  const billDocs = [];
  const alertDocs = [];

  const connectionTypes = ['Residential', 'Residential', 'Residential', 'Commercial', 'Industrial'];

  for (let i = 1; i <= 120; i++) {
    const consumerId = `C${String(10000 + i).padStart(5, '0')}`;
    const meterNumber = `M${String(200000 + i).padStart(7, '0')}`;
    const name = `${randomFrom(firstNames)} ${randomFrom(lastNames)}`;
    const area = randomFrom(areas);
    const connType = randomFrom(connectionTypes);
    const baseConsumption = connType === 'Industrial' ? randomInt(800, 2000) : connType === 'Commercial' ? randomInt(300, 800) : randomInt(150, 600);
    const startReading = randomInt(5000, 50000);
    const patternFn = pickPattern();
    const bills = patternFn(consumerId, meterNumber, baseConsumption, startReading);

    // Analyze latest bill for risk
    let riskScore = 0, riskLevel = 'Normal', totalAnomalies = 0;
    const analyzedBills = [];
    for (let j = 0; j < bills.length; j++) {
      const curr = bills[j];
      const hist = analyzedBills.slice(Math.max(0, j - 8), j);
      const result = detectAnomalies(curr, hist.map(b => ({ ...b, isAnomalous: b.isAnomalous || false })));
      analyzedBills.push({ ...curr, isAnomalous: result.isAnomalous, riskScore: result.riskScore, riskLevel: result.riskLevel, anomalyTypes: result.anomalyTypes });
      if (j === bills.length - 1) {
        riskScore = result.riskScore;
        riskLevel = result.riskLevel;
      }
      if (result.isAnomalous) totalAnomalies++;
    }

    consumerDocs.push({
      consumerId, name, meterNumber, area,
      connectionType: connType,
      sanctionedLoad: connType === 'Industrial' ? randomInt(10, 50) : connType === 'Commercial' ? randomInt(5, 15) : randomInt(3, 10),
      riskScore, riskLevel, totalAnomalies,
      status: 'Active',
      lastAnalyzed: new Date(),
    });

    for (const b of analyzedBills) {
      billDocs.push({
        consumerId: b.consumerId,
        meterNumber: b.meterNumber,
        month: b.month,
        previousMeterReading: b.previousMeterReading,
        currentMeterReading: b.currentMeterReading,
        actualConsumption: b.currentMeterReading - b.previousMeterReading,
        billedUnits: b.billedUnits,
        billAmount: b.billAmount,
        meterBillDifference: (b.currentMeterReading - b.previousMeterReading) - b.billedUnits,
        isAnomalous: b.isAnomalous,
        riskScore: b.riskScore,
        riskLevel: b.riskLevel,
        anomalyTypes: b.anomalyTypes,
        analyzed: true,
      });

      // Generate alerts for anomalous bills in recent months
      if (b.isAnomalous && b.riskScore > 40 && ['2024-04','2024-05','2024-06'].includes(b.month)) {
        const primaryType = b.anomalyTypes[0] || 'Multiple Indicators';
        alertDocs.push({
          consumerId: b.consumerId,
          consumerName: name,
          meterNumber: b.meterNumber,
          alertType: primaryType,
          severity: b.riskScore >= 70 ? 'Critical' : b.riskScore >= 50 ? 'High' : 'Medium',
          riskScore: b.riskScore,
          month: b.month,
          description: `${primaryType} detected for consumer ${consumerId} in ${b.month}`,
          evidence: [`Risk Score: ${b.riskScore}`, `Anomaly Types: ${b.anomalyTypes.join(', ')}`],
          status: randomFrom(['New', 'New', 'Under Investigation', 'Reviewed']),
          detectedDate: new Date(),
        });
      }
    }
  }

  await Consumer.insertMany(consumerDocs);
  console.log(`✅ Inserted ${consumerDocs.length} consumers`);

  // Insert bills in batches
  for (let i = 0; i < billDocs.length; i += 500) {
    await Bill.insertMany(billDocs.slice(i, i + 500));
  }
  console.log(`✅ Inserted ${billDocs.length} bills`);

  await Alert.insertMany(alertDocs);
  console.log(`✅ Inserted ${alertDocs.length} alerts`);

  await mongoose.disconnect();
  console.log('✅ Seed complete!');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
