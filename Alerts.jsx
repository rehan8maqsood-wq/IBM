import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, RefreshCw, Eye } from 'lucide-react';
import { alertsAPI } from '../services/api.js';
import { SkeletonRow, EmptyState, Pagination } from '../components/UI.jsx';
import { ToastContext } from '../App.jsx';
import { formatMonth, severityColor, alertStatusClass } from '../utils/helpers.js';

const STATUS_OPTIONS = ['New', 'Under Investigation', 'Reviewed', 'Resolved'];

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [updating, setUpdating] = useState(null);
  const addToast = useContext(ToastContext);
  const navigate = useNavigate();

  useEffect(() => { loadAlerts(); }, [page, status, severity]);

  const loadAlerts = async (searchVal) => {
    setLoading(true);
    try {
      const res = await alertsAPI.list({
        page, limit: 20,
        search: searchVal !== undefined ? searchVal : search,
        status, severity
      });
      setAlerts(res.data.alerts || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (e) {
      addToast('Failed to load alerts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadAlerts(search);
  };

  const handleStatusChange = async (alertId, newStatus) => {
    setUpdating(alertId);
    try {
      await alertsAPI.update(alertId, { status: newStatus });
      setAlerts(prev => prev.map(a => a._id === alertId ? { ...a, status: newStatus } : a));
      addToast(`Alert status updated to "${newStatus}"`, 'success');
    } catch (e) {
      addToast('Failed to update alert status', 'error');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Alerts</h1>
        <p>{total} total alerts</p>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <div className="search-bar" style={{ width: 300 }}>
            <Search size={15} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search consumer or alert type..." />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>

        <select className="select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className="select" value={severity} onChange={e => { setSeverity(e.target.value); setPage(1); }}>
          <option value="">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setStatus(''); setSeverity(''); setPage(1); loadAlerts(''); }}>
          Clear
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => loadAlerts()}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Consumer</th>
              <th>Alert Type</th>
              <th>Severity</th>
              <th>Month</th>
              <th>Risk Score</th>
              <th>Detected</th>
              <th>Status</th>
              <th>Update Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => <SkeletonRow key={i} cols={9} />)
            ) : alerts.length === 0 ? (
              <tr><td colSpan={9}><EmptyState title="No alerts found" message="No alerts match the current filters" /></td></tr>
            ) : alerts.map(alert => (
              <tr key={alert._id}>
                <td>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent-blue)' }}>{alert.consumerId}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{alert.consumerName}</div>
                </td>
                <td style={{ fontSize: 12 }}>{alert.alertType}</td>
                <td>
                  <span style={{ color: severityColor(alert.severity), fontWeight: 600, fontSize: 12 }}>
                    {alert.severity}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatMonth(alert.month)}</td>
                <td>
                  <span style={{
                    fontWeight: 700, fontSize: 13,
                    color: alert.riskScore >= 61 ? 'var(--risk-high)' : alert.riskScore >= 31 ? 'var(--risk-medium)' : 'var(--risk-normal)'
                  }}>{alert.riskScore}</span>
                </td>
                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(alert.detectedDate).toLocaleDateString()}
                </td>
                <td>
                  <span className={`tag ${alertStatusClass(alert.status)}`} style={{ fontWeight: 600 }}>{alert.status}</span>
                </td>
                <td>
                  <select
                    className="select"
                    style={{ fontSize: 11, padding: '4px 8px' }}
                    value={alert.status}
                    onChange={e => handleStatusChange(alert._id, e.target.value)}
                    disabled={updating === alert._id}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/consumers/${alert.consumerId}`)}
                  >
                    <Eye size={12} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} onChange={setPage} />
    </div>
  );
}
