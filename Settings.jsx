import React, { useState, useContext } from 'react';
import { Shield, Key, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { healthAPI } from '../services/api.js';
import { ToastContext } from '../App.jsx';

export default function Settings() {
  const [health, setHealth] = useState(null);
  const [testing, setTesting] = useState(false);
  const addToast = useContext(ToastContext);

  const testConnection = async () => {
    setTesting(true);
    try {
      const res = await healthAPI.check();
      setHealth(res.data);
      addToast(`Backend connected — MongoDB: ${res.data.mongodb}`, 'success');
    } catch (e) {
      setHealth(null);
      addToast('Backend not reachable: ' + e.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>System configuration and connection status</p>
      </div>

      {/* Security Notice */}
      <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--risk-normal)' }}>
        <div className="card-title"><Shield size={15} style={{ color: 'var(--risk-normal)' }} /> Security Configuration</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Grok API Key', value: 'Stored in backend .env only — never exposed to frontend', ok: true },
            { label: 'CORS', value: 'Configured to allow only CLIENT_URL origin', ok: true },
            { label: 'File Upload', value: 'CSV/Excel only, 10 MB limit, memory storage', ok: true },
            { label: '.gitignore', value: '.env is excluded from version control', ok: true },
            { label: 'API Keys in Frontend', value: 'None — zero secrets in React code', ok: true },
          ].map(({ label, value, ok }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              {ok ? <CheckCircle size={15} style={{ color: 'var(--risk-normal)', flexShrink: 0 }} /> : <AlertTriangle size={15} style={{ color: 'var(--risk-high)', flexShrink: 0 }} />}
              <span style={{ color: 'var(--text-secondary)', minWidth: 160, fontSize: 13 }}>{label}</span>
              <span style={{ color: ok ? 'var(--risk-normal)' : 'var(--risk-high)', fontSize: 12 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* API Key Setup */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title"><Key size={15} style={{ color: 'var(--accent-blue)' }} /> Grok API Key Setup</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 14 }}>
          To enable AI investigations, add your Grok API key to the backend environment file.
        </p>
        <div style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--bg-primary)', padding: 14, borderRadius: 8, border: '1px solid var(--border)', lineHeight: 1.8 }}>
          <div style={{ color: 'var(--text-muted)' }}># backend/.env</div>
          <div><span style={{ color: 'var(--accent-cyan)' }}>GROK_API_KEY</span>=<span style={{ color: 'var(--risk-medium)' }}>your_key_here</span></div>
          <div><span style={{ color: 'var(--accent-cyan)' }}>MONGODB_URI</span>=<span style={{ color: 'var(--risk-medium)' }}>mongodb://localhost:27017/gridguard</span></div>
          <div><span style={{ color: 'var(--accent-cyan)' }}>PORT</span>=<span style={{ color: 'var(--risk-medium)' }}>5000</span></div>
          <div><span style={{ color: 'var(--accent-cyan)' }}>CLIENT_URL</span>=<span style={{ color: 'var(--risk-medium)' }}>http://localhost:5173</span></div>
        </div>
        <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, fontSize: 12, color: 'var(--risk-high)' }}>
          ⚠️ Never commit .env to GitHub. It is already in .gitignore.
        </div>
      </div>

      {/* Connection Test */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title"><Database size={15} style={{ color: 'var(--accent-cyan)' }} /> Backend Connection</div>
        <button className="btn btn-primary" onClick={testConnection} disabled={testing} style={{ marginBottom: 14 }}>
          {testing ? 'Testing...' : 'Test Backend Connection'}
        </button>
        {health && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Service', value: health.service },
              { label: 'Status', value: health.status, ok: health.status === 'ok' },
              { label: 'MongoDB', value: health.mongodb, ok: health.mongodb === 'connected' },
              { label: 'Timestamp', value: new Date(health.timestamp).toLocaleString() },
            ].map(({ label, value, ok }) => (
              <div key={label} className="info-row">
                <span className="info-label">{label}</span>
                <span className="info-value" style={ok !== undefined ? { color: ok ? 'var(--risk-normal)' : 'var(--risk-high)' } : {}}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* About */}
      <div className="card">
        <div className="card-title">About GridGuard AI</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <p style={{ marginBottom: 8 }}><b style={{ color: 'var(--text-primary)' }}>GridGuard AI</b> is an electricity bill fraud detection and investigation platform.</p>
          <p style={{ marginBottom: 8 }}>It uses deterministic statistical analysis to detect suspicious billing patterns, and Grok AI to provide human-readable investigation summaries.</p>
          <p style={{ marginBottom: 8, padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 6, border: '1px solid rgba(245,158,11,0.2)' }}>
            ⚠️ All risk indicators suggest <b>investigation is required</b> — they do not constitute proof of fraud.
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Version 1.0 · Demo / Mock Data Mode · College Project</p>
        </div>
      </div>
    </div>
  );
}
