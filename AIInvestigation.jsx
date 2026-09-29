import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Search, ArrowRight } from 'lucide-react';
import { consumersAPI } from '../services/api.js';
import { RiskBadge } from '../components/UI.jsx';
import { ToastContext } from '../App.jsx';

export default function AIInvestigation() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const addToast = useContext(ToastContext);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await consumersAPI.list({ search, limit: 10 });
      setResults(res.data.consumers || []);
    } catch (e) {
      addToast('Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>AI Investigation</h1>
        <p>Select a consumer to run a Grok-powered investigation</p>
      </div>

      {/* Info Banner */}
      <div className="card" style={{ marginBottom: 24, borderLeft: '3px solid var(--accent-purple)' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <Brain size={24} style={{ color: 'var(--accent-purple)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>How Grok AI Investigation Works</div>
            <ol style={{ paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.8 }}>
              <li>The backend performs <b>deterministic numerical analysis</b> on billing history</li>
              <li>Anomalies, deviations, and meter mismatches are computed precisely</li>
              <li>Structured evidence is sent to <b>Grok API</b> (never from the frontend)</li>
              <li>Grok provides an investigation narrative, alternative explanations, and verification steps</li>
              <li>The API key remains <b>securely on the backend</b> at all times</li>
            </ol>
            <div style={{ marginTop: 10, padding: '6px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 6, border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: 'var(--risk-medium)' }}>
              ⚠️ AI analysis indicates <b>suspicious patterns requiring investigation</b> — not confirmed fraud.
            </div>
          </div>
        </div>
      </div>

      {/* Consumer Search */}
      <div className="card">
        <div className="card-title">Find Consumer to Investigate</div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <Search size={15} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by consumer ID, name, or meter number..."
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {results.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Consumer ID</th>
                  <th>Name</th>
                  <th>Area</th>
                  <th>Risk Level</th>
                  <th>Risk Score</th>
                  <th>Anomalies</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map(c => (
                  <tr key={c.consumerId}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--accent-blue)', fontSize: 12 }}>{c.consumerId}</td>
                    <td>{c.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.area}</td>
                    <td><RiskBadge level={c.riskLevel} /></td>
                    <td>{c.riskScore}</td>
                    <td style={{ color: c.totalAnomalies > 0 ? 'var(--risk-high)' : 'var(--text-muted)' }}>{c.totalAnomalies}</td>
                    <td>
                      <button
                        className="btn btn-purple btn-sm"
                        onClick={() => navigate(`/consumers/${c.consumerId}`)}
                      >
                        <Brain size={13} /> Investigate <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {results.length === 0 && search && !loading && (
          <div style={{ padding: '20px 0', color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>
            No consumers found. Try a different search.
          </div>
        )}
      </div>

      {/* Quick links to high-risk consumers */}
      <div style={{ marginTop: 20, color: 'var(--text-muted)', fontSize: 13 }}>
        <span>💡 Tip: Go to </span>
        <span
          style={{ color: 'var(--accent-blue)', cursor: 'pointer' }}
          onClick={() => navigate('/consumers?risk=High')}
        >Consumers → filter by High Risk</span>
        <span> to find consumers that most need investigation.</span>
      </div>
    </div>
  );
}
