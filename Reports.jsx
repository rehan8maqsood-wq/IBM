import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, RefreshCw, FileText, Eye, Trash2 } from 'lucide-react';
import { reportsAPI } from '../services/api.js';
import { RiskBadge, SkeletonRow, EmptyState, Pagination } from '../components/UI.jsx';
import { ToastContext } from '../App.jsx';
import { downloadJSON } from '../utils/helpers.js';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false); // true = show confirm modal
  const addToast = useContext(ToastContext);
  const navigate = useNavigate();

  useEffect(() => { loadReports(); }, [page]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await reportsAPI.list({ page, limit: 20 });
      setReports(res.data.reports || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
      setSelectedIds(new Set()); // clear selection on reload
    } catch (e) {
      addToast('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allChecked = reports.length > 0 && reports.every(r => selectedIds.has(r._id));
  const someChecked = reports.some(r => selectedIds.has(r._id));

  const toggleAll = () => {
    if (allChecked) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reports.map(r => r._id)));
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDeleteSelected = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      if (ids.length === 1) {
        await reportsAPI.remove(ids[0]);
      } else {
        await reportsAPI.removeMany(ids);
      }
      addToast(`${ids.length} report${ids.length > 1 ? 's' : ''} deleted`, 'success');
      setConfirmDelete(false);
      setSelectedIds(new Set());
      if (selectedReport && ids.includes(selectedReport._id)) setSelectedReport(null);
      loadReports();
    } catch (e) {
      addToast(e.message || 'Failed to delete report(s)', 'error');
    }
  };

  const handleDownload = (report) => {
    downloadJSON(report, `report_${report.consumerId}_${new Date(report.generatedAt).toISOString().split('T')[0]}.json`);
    addToast('Report downloaded', 'success');
  };

  const handleViewReport = async (id) => {
    try {
      const res = await reportsAPI.get(id);
      setSelectedReport(res.data);
    } catch (e) {
      addToast('Failed to load report details', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Investigation Reports</h1>
        <p>{total} reports generated — click a consumer to generate new reports via Grok investigation</p>
      </div>

      {/* ── Confirm delete modal ─────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-title">
              <Trash2 size={18} style={{ marginRight: 8, color: '#ef4444' }} />
              Delete {selectedIds.size} Report{selectedIds.size > 1 ? 's' : ''}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Are you sure you want to permanently delete{' '}
              <strong>{selectedIds.size} selected report{selectedIds.size > 1 ? 's' : ''}</strong>?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button
                className="btn"
                style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                onClick={handleDeleteSelected}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report detail modal ──────────────────────────────────────────── */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-title">
              <FileText size={18} style={{ marginRight: 8 }} />
              {selectedReport.reportTitle}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Generated: {new Date(selectedReport.generatedAt).toLocaleString()} ·
              Consumer: {selectedReport.consumerId} · {selectedReport.consumerName}
            </div>

            {selectedReport.riskScore != null && (
              <div style={{ marginBottom: 14 }}>
                <RiskBadge level={selectedReport.riskLevel} score={selectedReport.riskScore} />
              </div>
            )}

            {selectedReport.aiSummary && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>AI Summary</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 8, borderLeft: '3px solid var(--accent-purple)' }}>
                  {selectedReport.aiSummary}
                </div>
              </div>
            )}

            {selectedReport.evidence?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Evidence</div>
                <div className="evidence-box">
                  {selectedReport.evidence.map((e, i) => <div key={i} className="evidence-item">{e}</div>)}
                </div>
              </div>
            )}

            {selectedReport.verificationSteps?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Verification Steps</div>
                <ol style={{ paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.8 }}>
                  {selectedReport.verificationSteps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => navigate(`/consumers/${selectedReport.consumerId}`)}>
                <Eye size={14} /> View Consumer
              </button>
              <button className="btn btn-primary" onClick={() => handleDownload(selectedReport)}>
                <Download size={14} /> Download JSON
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedReport(null)}>Close</button>
              <button
                className="btn"
                style={{ background: '#ef4444', color: '#fff', border: 'none', marginLeft: 'auto' }}
                onClick={() => {
                  setSelectedIds(new Set([selectedReport._id]));
                  setSelectedReport(null);
                  setConfirmDelete(true);
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <button className="btn btn-secondary btn-sm" onClick={loadReports}>
          <RefreshCw size={13} /> Refresh
        </button>

        {someChecked && (
          <button
            className="btn btn-sm"
            style={{ background: '#ef4444', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={13} />
            Delete selected ({selectedIds.size})
          </button>
        )}

        <div style={{ color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
          {someChecked
            ? `${selectedIds.size} of ${reports.length} selected`
            : 'Select rows to delete'}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                  onChange={toggleAll}
                  title="Select all"
                />
              </th>
              <th>Consumer</th>
              <th>Report Title</th>
              <th>Risk</th>
              <th>Anomalies</th>
              <th>Generated</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => <SkeletonRow key={i} cols={8} />)
            ) : reports.length === 0 ? (
              <tr><td colSpan={8}>
                <EmptyState
                  icon={<FileText size={48} />}
                  title="No reports yet"
                  message="Run a Grok investigation on a consumer and click 'Save Report' to generate investigation reports"
                />
              </td></tr>
            ) : reports.map(r => (
              <tr key={r._id} style={{ background: selectedIds.has(r._id) ? 'var(--bg-hover, rgba(59,130,212,0.06))' : undefined }}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r._id)}
                    onChange={() => toggleOne(r._id)}
                  />
                </td>
                <td>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent-blue)' }}>{r.consumerId}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.consumerName}</div>
                </td>
                <td style={{ fontSize: 13 }}>{r.reportTitle}</td>
                <td><RiskBadge level={r.riskLevel || 'Normal'} score={r.riskScore} /></td>
                <td style={{ fontSize: 12 }}>{r.anomalies?.length || 0} detected</td>
                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(r.generatedAt).toLocaleString()}</td>
                <td>
                  <span style={{ fontSize: 11, color: 'var(--accent-blue)', fontWeight: 600 }}>{r.investigationStatus}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleViewReport(r._id)}>
                      <Eye size={12} /> View
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleDownload(r)}>
                      <Download size={12} /> Export
                    </button>
                  </div>
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
