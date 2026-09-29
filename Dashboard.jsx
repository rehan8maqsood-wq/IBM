import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Users, FileText, AlertTriangle, TrendingUp, Shield, RefreshCw } from 'lucide-react';
import { dashboardAPI } from '../services/api.js';
import { RiskBadge } from '../components/UI.jsx';
import { ToastContext } from '../App.jsx';
import { formatMonth, formatNumber } from '../utils/helpers.js';

const PIE_COLORS = { Normal: '#10b981', Medium: '#f59e0b', High: '#ef4444' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--text-primary)' }}>{p.name}: <b>{formatNumber(p.value)}</b></div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const addToast = useContext(ToastContext);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await dashboardAPI.get();
      setData(res.data);
    } catch (e) {
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div>
      <div className="stats-grid">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="stat-card">
            <div className="skeleton" style={{ height: 14, width: 80, marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 32, width: 60 }} />
          </div>
        ))}
      </div>
    </div>
  );

  const stats = data?.stats || {};
  const consumption = (data?.consumptionTrend || []).map(d => ({
    month: formatMonth(d._id),
    avgConsumption: Math.round(d.avgConsumption || 0),
    bills: d.totalBills,
  }));
  const anomalyTrend = (data?.anomalyTrend || []).map(d => ({
    month: formatMonth(d._id),
    anomalies: d.count,
    avgRisk: Math.round(d.avgRisk || 0),
  }));
  const pieData = (data?.riskDistribution || []).map(d => ({
    name: d._id,
    value: d.count,
  }));
  const topSuspicious = data?.topSuspicious || [];

  return (
    <div>
      <div className="page-header">
        <h1>Analytics Overview</h1>
        <p>Real-time electricity billing fraud detection dashboard</p>
      </div>

      {/* Stats Row */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/consumers')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-icon icon-blue"><Users size={18} /></div>
          <div className="stat-card-label">Total Consumers</div>
          <div className="stat-card-value">{formatNumber(stats.totalConsumers)}</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/bills')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-icon icon-purple"><FileText size={18} /></div>
          <div className="stat-card-label">Bills Analysed</div>
          <div className="stat-card-value">{formatNumber(stats.totalBills)}</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/consumers?risk=Medium')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-icon icon-amber"><AlertTriangle size={18} /></div>
          <div className="stat-card-label">Suspicious Cases</div>
          <div className="stat-card-value" style={{ color: 'var(--risk-medium)' }}>{formatNumber(stats.suspiciousCases)}</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/consumers?risk=High')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-icon icon-red"><TrendingUp size={18} /></div>
          <div className="stat-card-label">High-Risk Cases</div>
          <div className="stat-card-value" style={{ color: 'var(--risk-high)' }}>{formatNumber(stats.highRiskCases)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon icon-green"><Shield size={18} /></div>
          <div className="stat-card-label">Normal Cases</div>
          <div className="stat-card-value" style={{ color: 'var(--risk-normal)' }}>{formatNumber(stats.normalCases)}</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="charts-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div className="chart-title">
            Electricity Consumption Trend
            <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} />Refresh</button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={consumption}>
              <defs>
                <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="avgConsumption" name="Avg Consumption" stroke="#3b82f6" fill="url(#cGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">Risk Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#6b7280'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">Anomaly Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={anomalyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="anomalies" name="Anomalies" fill="#ef4444" radius={[4,4,0,0]} />
              <Bar dataKey="avgRisk" name="Avg Risk" fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Suspicious */}
      <div className="card">
        <div className="card-title">Top Suspicious Consumers</div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Consumer ID</th>
                <th>Name</th>
                <th>Area</th>
                <th>Anomalies</th>
                <th>Risk Score</th>
                <th>Risk Level</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {topSuspicious.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No suspicious consumers found</td></tr>
              ) : topSuspicious.map(c => (
                <tr key={c.consumerId} onClick={() => navigate(`/consumers/${c.consumerId}`)}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--accent-blue)' }}>{c.consumerId}</td>
                  <td>{c.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.area}</td>
                  <td>{c.totalAnomalies}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                        <div style={{ width: `${c.riskScore}%`, height: '100%', background: c.riskLevel === 'High' ? 'var(--risk-high)' : 'var(--risk-medium)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.riskScore}</span>
                    </div>
                  </td>
                  <td><RiskBadge level={c.riskLevel} /></td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/consumers/${c.consumerId}`); }}
                    >
                      Investigate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
