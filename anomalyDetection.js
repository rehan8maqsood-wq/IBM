/**
 * GridGuard AI — Deterministic Anomaly Detection Engine
 * All numerical evidence is computed here BEFORE calling Grok.
 * Grok receives structured evidence; it does NOT perform calculations.
 */

const THRESHOLDS = {
  CONSUMPTION_DROP_PCT: -40,       // >40% drop from historical avg
  CONSUMPTION_SPIKE_PCT: 50,       // >50% spike from historical avg
  METER_BILL_MISMATCH_UNITS: 50,   // >50 unit difference
  METER_BILL_MISMATCH_PCT: 15,     // >15% difference
  MIN_HISTORY_MONTHS: 2,           // minimum months for reliable average
  REPEATED_ANOMALY_THRESHOLD: 2,   // consecutive months to flag repeated
  HIGH_DEVIATION_PCT: 70,          // very high deviation
  EXTREME_DEVIATION_PCT: 150,      // extreme deviation
};

const RISK_WEIGHTS = {
  CONSUMPTION_ANOMALY: 35,
  METER_BILL_MISMATCH: 30,
  HISTORICAL_DEVIATION: 20,
  REPEATED_ANOMALY: 15,
};

/**
 * Calculate mean of an array
 */
function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate standard deviation
 */
function stdDev(arr) {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Main anomaly detection function
 * @param {Object} currentBill - The bill being analyzed
 * @param {Array}  historicalBills - Prior bills sorted oldest-first
 * @returns {Object} analysis result with anomalies, risk score, evidence
 */
function detectAnomalies(currentBill, historicalBills) {
  const actualConsumption = currentBill.currentMeterReading - currentBill.previousMeterReading;
  const meterBillDiff = actualConsumption - currentBill.billedUnits;

  const historicalConsumptions = historicalBills
    .map(b => b.currentMeterReading - b.previousMeterReading)
    .filter(c => c >= 0);

  const histAvg = mean(historicalConsumptions);
  const histStdDev = stdDev(historicalConsumptions);
  const hasHistory = historicalConsumptions.length >= THRESHOLDS.MIN_HISTORY_MONTHS;

  const percentageDeviation = hasHistory && histAvg > 0
    ? ((actualConsumption - histAvg) / histAvg) * 100
    : 0;

  // Count consecutive abnormal periods
  let consecutiveAbnormal = 0;
  for (let i = historicalBills.length - 1; i >= 0; i--) {
    const c = historicalBills[i].currentMeterReading - historicalBills[i].previousMeterReading;
    const dev = histAvg > 0 ? Math.abs((c - histAvg) / histAvg) * 100 : 0;
    if (dev > 40) consecutiveAbnormal++;
    else break;
  }
  const previousAnomalies = historicalBills.filter(b => b.isAnomalous).length;

  const anomalies = [];
  const evidence = [];
  let riskScore = 0;

  // ── 1. CONSUMPTION DROP ──────────────────────────────────────────────────
  if (hasHistory && percentageDeviation <= THRESHOLDS.CONSUMPTION_DROP_PCT) {
    const severity = percentageDeviation <= -THRESHOLDS.HIGH_DEVIATION_PCT ? 'High' : 'Medium';
    anomalies.push({
      type: 'Consumption Drop',
      severity,
      description: `Consumption dropped by ${Math.abs(percentageDeviation).toFixed(1)}% from historical average`,
      details: {
        historicalAverage: parseFloat(histAvg.toFixed(2)),
        currentConsumption: actualConsumption,
        deviation: parseFloat(percentageDeviation.toFixed(2)),
      }
    });
    evidence.push(`Consumption of ${actualConsumption} units is ${Math.abs(percentageDeviation).toFixed(1)}% below historical average of ${histAvg.toFixed(0)} units`);
    riskScore += Math.min(RISK_WEIGHTS.CONSUMPTION_ANOMALY, Math.abs(percentageDeviation) / 3);
  }

  // ── 2. CONSUMPTION SPIKE ─────────────────────────────────────────────────
  if (hasHistory && percentageDeviation >= THRESHOLDS.CONSUMPTION_SPIKE_PCT) {
    const severity = percentageDeviation >= THRESHOLDS.EXTREME_DEVIATION_PCT ? 'High' : 'Medium';
    anomalies.push({
      type: 'Consumption Spike',
      severity,
      description: `Consumption spiked by ${percentageDeviation.toFixed(1)}% above historical average`,
      details: {
        historicalAverage: parseFloat(histAvg.toFixed(2)),
        currentConsumption: actualConsumption,
        deviation: parseFloat(percentageDeviation.toFixed(2)),
      }
    });
    evidence.push(`Consumption of ${actualConsumption} units is ${percentageDeviation.toFixed(1)}% above historical average of ${histAvg.toFixed(0)} units`);
    riskScore += Math.min(RISK_WEIGHTS.CONSUMPTION_ANOMALY, percentageDeviation / 4);
  }

  // ── 3. METER/BILLING MISMATCH ─────────────────────────────────────────────
  const absMismatch = Math.abs(meterBillDiff);
  const mismatchPct = actualConsumption > 0 ? (absMismatch / actualConsumption) * 100 : 0;
  if (
    absMismatch >= THRESHOLDS.METER_BILL_MISMATCH_UNITS &&
    mismatchPct >= THRESHOLDS.METER_BILL_MISMATCH_PCT
  ) {
    const severity = mismatchPct > 30 ? 'High' : 'Medium';
    anomalies.push({
      type: 'Meter/Billing Mismatch',
      severity,
      description: `Meter reading indicates ${actualConsumption} units but only ${currentBill.billedUnits} units were billed (difference: ${meterBillDiff} units / ${mismatchPct.toFixed(1)}%)`,
      details: {
        actualConsumption,
        billedUnits: currentBill.billedUnits,
        difference: meterBillDiff,
        mismatchPercentage: parseFloat(mismatchPct.toFixed(2)),
      }
    });
    evidence.push(`Meter reading yields ${actualConsumption} units consumed; bill shows ${currentBill.billedUnits} units — a discrepancy of ${meterBillDiff} units (${mismatchPct.toFixed(1)}%)`);
    riskScore += Math.min(RISK_WEIGHTS.METER_BILL_MISMATCH, mismatchPct / 2);
  }

  // ── 4. HISTORICAL DEVIATION ───────────────────────────────────────────────
  if (hasHistory && histStdDev > 0) {
    const zScore = Math.abs((actualConsumption - histAvg) / histStdDev);
    if (zScore > 2.5) {
      evidence.push(`Statistical deviation: ${zScore.toFixed(2)} standard deviations from historical mean (historical σ = ${histStdDev.toFixed(1)})`);
      riskScore += Math.min(RISK_WEIGHTS.HISTORICAL_DEVIATION, (zScore - 2.5) * 8);
    }
  }

  // ── 5. REPEATED ANOMALY ───────────────────────────────────────────────────
  if (previousAnomalies >= THRESHOLDS.REPEATED_ANOMALY_THRESHOLD) {
    anomalies.push({
      type: 'Repeated Anomaly',
      severity: previousAnomalies >= 4 ? 'High' : 'Medium',
      description: `${previousAnomalies} previous anomalies detected in billing history`,
      details: { previousAnomalies, consecutiveAbnormalPeriods: consecutiveAbnormal }
    });
    evidence.push(`${previousAnomalies} anomalous billing periods detected in historical records`);
    riskScore += Math.min(RISK_WEIGHTS.REPEATED_ANOMALY, previousAnomalies * 3);
  }

  // ── 6. CONSECUTIVE ABNORMAL PERIODS ──────────────────────────────────────
  if (consecutiveAbnormal >= THRESHOLDS.REPEATED_ANOMALY_THRESHOLD) {
    evidence.push(`${consecutiveAbnormal} consecutive months of abnormal consumption patterns`);
    if (!anomalies.find(a => a.type === 'Repeated Anomaly')) {
      riskScore += Math.min(10, consecutiveAbnormal * 3);
    }
  }

  // ── 7. MULTIPLE SIMULTANEOUS INDICATORS ──────────────────────────────────
  if (anomalies.length >= 3) {
    anomalies.push({
      type: 'Multiple Indicators',
      severity: 'High',
      description: `${anomalies.length} simultaneous suspicious indicators detected`,
      details: { indicatorCount: anomalies.length }
    });
    evidence.push(`Multiple simultaneous suspicious indicators (${anomalies.length}) compound the risk`);
    riskScore += 10;
  }

  // Clamp risk score to 0–100
  riskScore = Math.min(100, Math.max(0, Math.round(riskScore)));

  const riskLevel = riskScore <= 30 ? 'Normal' : riskScore <= 60 ? 'Medium' : 'High';
  const isAnomalous = anomalies.length > 0;

  return {
    consumerId: currentBill.consumerId,
    meterNumber: currentBill.meterNumber,
    month: currentBill.month,
    isAnomalous,
    anomalies,
    evidence,
    riskScore,
    riskLevel,
    metrics: {
      actualConsumption,
      billedUnits: currentBill.billedUnits,
      meterBillDifference: meterBillDiff,
      historicalAverage: parseFloat(histAvg.toFixed(2)),
      historicalStdDev: parseFloat(histStdDev.toFixed(2)),
      percentageDeviation: parseFloat(percentageDeviation.toFixed(2)),
      previousAnomalies,
      consecutiveAbnormalPeriods: consecutiveAbnormal,
      historyMonths: historicalConsumptions.length,
    },
    anomalyTypes: anomalies.map(a => a.type),
  };
}

/**
 * Analyze all bills for a consumer and return the latest analysis
 */
function analyzeConsumerBills(allBills) {
  if (!allBills || allBills.length === 0) {
    return { isAnomalous: false, anomalies: [], evidence: [], riskScore: 0, riskLevel: 'Normal' };
  }

  // Sort bills by month chronologically
  const sorted = [...allBills].sort((a, b) => a.month.localeCompare(b.month));
  const latest = sorted[sorted.length - 1];
  const historical = sorted.slice(0, -1);

  return detectAnomalies(latest, historical);
}

module.exports = { detectAnomalies, analyzeConsumerBills, THRESHOLDS, RISK_WEIGHTS };
