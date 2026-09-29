import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { ArrowLeft, Brain, RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { consumersAPI, analyzeAPI, aiAPI, reportsAPI } from '../services/api.js';
import { RiskBadge, RiskScoreBar, AnomalyTag, Spinner, EmptyState } from '../components/UI.jsx';
import { ToastContext } from '../App.jsx';
import { formatMonth, formatCurrency, formatNumber, formatDeviation } from '../utils/helpers.js';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <b>{formatNumber(p.value)}</b></div>
      ))}
    </div>
  );
};

export default function ConsumerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useContext(ToastContext);

  const [consumer, setConsumer] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiStage, setAiStage] = useState(0);
  const [savingReport, setSavingReport] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await consumersAPI.get(id);
      setConsumer(res.data.consumer);
      setBills(res.data.bills || []);
    } catch (e) {
      addToast('Consumer not found', 'error');
      navigate('/consumers');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await analyzeAPI.run(id);
      addToast('Analysis complete', 'success');
      await loadData();
    } catch (e) {
      addToast('Analysis failed: ' + e.message, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const AI_STAGES = [
    'Loading electricity data',
    'Calculating historical patterns',
    'Detecting anomalies',
    'Preparing evidence',
    'Grok analyzing investigation',
    'Generating explanation',
  ];

  const handleGrokInvestigation = async () => {
    setAiLoading(true);
    setAiResult(null);
    setAiStage(0);

    // Animate stages
    for (let i = 0; i < AI_STAGES.length - 1; i++) {
      await new Promise(r => setTimeout(r, 600));
      setAiStage(i + 1);
    }

    try {
      const res = await aiAPI.investigate(id);
      setAiResult(res.data);
      setAiStage(AI_STAGES.length);
      addToast('AI investigation complete', 'success');
    } catch (e) {
      addToast('Investigation failed: ' + e.message, 'error');
      setAiLoading(false);
      return;
    }
    setAiLoading(false);
  };

  const handleSaveReport = async () => {
    if (!aiResult) return;
    setSavingReport(true);
    try {
      await reportsAPI.create({
        consumerId: id,
        riskScore: aiResult.deterministicAnalysis?.riskScore,
        riskLevel: aiResult.deterministicAnalysis?.riskLevel,
        anomalies: aiResult.deterministicAnalysis?.anomalies,
        evidence: aiResult.deterministicAnalysis?.evidence,
        aiExplanation: aiResult.aiAnalysis?.rawContent || '',
        aiSummary: aiResult.aiAnalysis?.investigationSummary || '',
        detectedIndicators: aiResult.aiAnalysis?.detectedIndicators || [],
        alternativeExplanations: aiResult.aiAnalysis?.alternativeExplanations || [],
        verificationSteps: aiResult.aiAnalysis?.verificationSteps || [],
      });
      addToast('Report saved successfully', 'success');
    } catch (e) {
      addToast('Failed to save report: ' + e.message, 'error');
    } finally {
      setSavingReport(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <Spinner size={36} />
    </div>
  );

  if (!consumer) return null;

  const chartData = bills.map(b => ({
    month: formatMonth(b.month),
    actual: b.actualConsumption || (b.currentMeterReading - b.previousMeterReading),
    billed: b.billedUnits,
    risk: b.riskScore || 0,
    isAnomalous: b.isAnomalous,
  }));

  const latestBill = bills[bills.length - 1];
  const avgConsumption = bills.length > 0 ? Math.round(bills.reduce((s, b) => s + (b.actualConsumption || 0), 0) / bills.length) : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn btn-secondary" onClick={() => navigate('/consumers')}>
          <ArrowLeft size={15} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{consumer.name}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{consumer.consumerId} · {consumer.meterNumber} · {consumer.area}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? <><Spinner size={14} /> Analyzing...</> : <><RefreshCw size={14} /> Re-Analyze</>}
          </button>
          <button className="btn btn-purple" onClick={handleGrokInvestigation} disabled={aiLoading}>
            {aiLoading ? <><Spinner size={14} /> Investigating...</> : <><Brain size={14} /> Investigate with Grok</>}
          </button>
        </div>
      </div>

      {/* Info + Risk */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Consumer Information</div>
          <div className="info-row"><span className="info-label">Consumer ID</span><span className="info-value" style={{ fontFamily: 'monospace', color: 'var(--accent-blue)' }}>{consumer.consumerId}</span></div>
          <div className="info-row"><span className="info-label">Name</span><span className="info-value">{consumer.name}</span></div>
          <div className="info-row"><span className="info-label">Meter Number</span><span className="info-value" style={{ fontFamily: 'monospace' }}>{consumer.meterNumber}</span></div>
          <div className="info-row"><span className="info-label">Area</span><span className="info-value">{consumer.area}</span></div>
          <div className="info-row"><span className="info-label">Connection Type</span><span className="info-value">{consumer.connectionType}</span></div>
          <div className="info-row"><span className="info-label">Status</span><span className="info-value">{consumer.status}</span></div>
          <div className="info-row"><span className="info-label">Total Anomalies</span><span className="info-value" style={{ color: consumer.totalAnomalies > 0 ? 'var(--risk-high)' : 'var(--risk-normal)' }}>{consumer.totalAnomalies}</span></div>
          <div className="info-row"><span className="info-label">Avg Consumption</span><span className="info-value">{formatNumber(avgConsumption)} units/month</span></div>
        </div>

        <div className="card">
          <div className="card-title">Risk Indicator — Investigation Required</div>
          <RiskScoreBar score={consumer.riskScore || 0} />
          <div style={{ marginTop: 16 }}>
            <RiskBadge level={consumer.riskLevel} score={consumer.riskScore} />
          </div>
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
            <p>⚠️ Risk scores indicate <b>suspicious patterns requiring investigation</b>, not confirmed fraud. Each case should be reviewed by a qualified investigator.</p>
          </div>
          {latestBill && (
            <div style={{ marginTop: 12 }}>
              <div className="info-row"><span className="info-label">Latest Bill</span><span className="info-value">{formatCurrency(latestBill.billAmount)}</span></div>
              <div className="info-row"><span className="info-label">Latest Month</span><span className="info-value">{formatMonth(latestBill.month)}</span></div>
              <div className="info-row"><span className="info-label">Latest Consumption</span><span className="info-value">{formatNumber(latestBill.actualConsumption)} units</span></div>
            </div>
          )}
        </div>
      </div>

      {/* Consumption Chart */}
      <div className="chart-card" style={{ marginBottom: 20 }}>
        <div className="chart-title">Consumption History</div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="actual" name="Actual Consumption" stroke="#3b82f6" fill="url(#aGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="billed" name="Billed Units" stroke="#f59e0b" fill="url(#bGrad)" strokeWidth={2} strokeDasharray="5 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bill History Table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Bill History</div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Prev Reading</th>
                <th>Curr Reading</th>
                <th>Actual Consumption</th>
                <th>Billed Units</th>
                <th>Difference</th>
                <th>Bill Amount</th>
                <th>Deviation</th>
                <th>Risk</th>
                <th>Anomalies</th>
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr><td colSpan={10}><EmptyState title="No bills found" message="No billing records for this consumer" /></td></tr>
              ) : bills.map(b => {
                const diff = b.meterBillDifference || 0;
                return (
                  <tr key={b._id} style={{ background: b.isAnomalous ? 'rgba(239,68,68,0.04)' : undefined }}>
                    <td style={{ fontWeight: 500 }}>{formatMonth(b.month)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{formatNumber(b.previousMeterReading)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{formatNumber(b.currentMeterReading)}</td>
                    <td style={{ fontWeight: 600 }}>{formatNumber(b.actualConsumption)}</td>
                    <td>{formatNumber(b.billedUnits)}</td>
                    <td style={{ color: Math.abs(diff) > 50 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                      {diff > 0 ? '+' : ''}{formatNumber(diff)}
                    </td>
                    <td>{formatCurrency(b.billAmount)}</td>
                    <td style={{ color: b.percentageDeviation < -30 ? 'var(--risk-high)' : b.percentageDeviation > 40 ? 'var(--risk-medium)' : 'var(--risk-normal)' }}>
                      {formatDeviation(b.percentageDeviation)}
                    </td>
                    <td><RiskBadge level={b.riskLevel || 'Normal'} /></td>
                    <td>
                      {b.anomalyTypes?.length > 0
                        ? b.anomalyTypes.slice(0, 2).map(t => <AnomalyTag key={t} type={t} />)
                        : <span style={{ color: 'var(--risk-normal)', fontSize: 11 }}>✓ Normal</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Processing / Result */}
      {aiLoading && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title"><Brain size={15} style={{ color: 'var(--accent-purple)' }} /> Grok AI Investigation in Progress</div>
          <div style={{ padding: '8px 0' }}>
            {AI_STAGES.map((stage, i) => (
              <div key={i} className={`ai-stage ${i < aiStage ? 'done' : i === aiStage ? 'active' : 'pending'}`}>
                <div className="ai-stage-icon">
                  {i < aiStage ? '✓' : i === aiStage ? <div className="spinner" /> : '○'}
                </div>
                {stage}
              </div>
            ))}
          </div>
        </div>
      )}

      {aiResult && !aiLoading && (
        <div style={{ marginBottom: 20 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 0 }}><Brain size={15} style={{ color: 'var(--accent-purple)' }} /> AI Investigation Summary</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={handleSaveReport} disabled={savingReport}>
                  <Download size={13} /> {savingReport ? 'Saving...' : 'Save Report'}
                </button>
              </div>
            </div>

            {/* Deterministic Risk */}
            <div style={{ marginBottom: 16, padding: 14, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>DETERMINISTIC RISK INDICATOR</div>
              <RiskScoreBar score={aiResult.deterministicAnalysis?.riskScore || 0} />
            </div>

            {/* AI Available */}
            {aiResult.aiAnalysis?.available ? (
              <div>
                {aiResult.aiAnalysis.investigationSummary && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Investigation Summary</div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-primary)', padding: '12px 14px', background: 'var(--bg-primary)', borderRadius: 8, borderLeft: '3px solid var(--accent-purple)' }}>
                      {aiResult.aiAnalysis.investigationSummary}
                    </div>
                  </div>
                )}

                {aiResult.aiAnalysis.detectedIndicators?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Detected Indicators</div>
                    {aiResult.aiAnalysis.detectedIndicators.map((ind, i) => (
                      <div key={i} className="evidence-item" style={{ marginBottom: 4 }}>{ind}</div>
                    ))}
                  </div>
                )}

                {aiResult.deterministicAnalysis?.evidence?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Numerical Evidence</div>
                    <div className="evidence-box">
                      {aiResult.deterministicAnalysis.evidence.map((e, i) => (
                        <div key={i} className="evidence-item">{e}</div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResult.aiAnalysis.alternativeExplanations?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Possible Alternative Explanations</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {aiResult.aiAnalysis.alternativeExplanations.map((exp, i) => (
                        <div key={i} style={{ padding: '8px 12px', background: 'rgba(16,185,129,0.06)', borderRadius: 6, border: '1px solid rgba(16,185,129,0.15)', fontSize: 13, color: 'var(--text-secondary)' }}>
                          💡 {exp}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResult.aiAnalysis.verificationSteps?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recommended Verification Steps</div>
                    <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {aiResult.aiAnalysis.verificationSteps.map((step, i) => (
                        <li key={i} style={{ fontSize: 13, color: 'var(--text-primary)' }}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {aiResult.aiAnalysis.riskObservation && (
                  <div style={{ padding: '10px 14px', background: 'rgba(59,130,246,0.08)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Risk Observation: </span>
                    <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{aiResult.aiAnalysis.riskObservation}</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '14px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--risk-medium)' }}>
                <AlertTriangle size={14} style={{ marginRight: 6 }} />
                {aiResult.aiAnalysis?.message || 'AI explanation temporarily unavailable. Numerical anomaly analysis is still available.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
