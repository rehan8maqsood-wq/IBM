import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ChevronUp, ChevronDown, Filter, Trash2 } from 'lucide-react';
import { consumersAPI } from '../services/api.js';
import { RiskBadge, SkeletonRow, EmptyState, Pagination } from '../components/UI.jsx';
import { ToastContext } from '../App.jsx';
import { formatCurrency, formatNumber, formatMonth } from '../utils/helpers.js';

export default function Consumers() {
  const [consumers, setConsumers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [risk, setRisk] = useState('');
  const [sort, setSort] = useState('riskScore');
  const [order, setOrder] = useState('desc');
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const addToast = useContext(ToastContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const r = searchParams.get('risk');
    if (r) setRisk(r);
  }, []);

  useEffect(() => {
    loadConsumers();
  }, [page, risk, sort, order]);

  const loadConsumers = async (searchVal) => {
    setLoading(true);
    try {
      const res = await consumersAPI.list({
        page, limit: 20,
        search: searchVal !== undefined ? searchVal : search,
        risk, sort, order
      });
      setConsumers(res.data.consumers || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (e) {
      addToast('Failed to load consumers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadConsumers(search);
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selected.length === consumers.length && consumers.length > 0) {
      setSelected([]);
    } else {
      setSelected(consumers.map(c => c.consumerId));
    }
  };

  const handleDelete = async () => {
    if (selected.length === 0) return;
    if (!window.confirm(`Delete ${selected.length} consumer(s)? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await consumersAPI.deleteMany(selected);
      const { deleted, alertsDeleted, billsDeleted } = res.data;
      addToast(`Deleted ${deleted} consumer(s), ${alertsDeleted} alert(s), ${billsDeleted} bill(s)`, 'success');
      setSelected([]);
      loadConsumers();
    } catch (e) {
      addToast('Failed to delete consumers', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const toggleSort = (col) => {
    if (sort === col) setOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setOrder('desc'); }
  };

  const SortIcon = ({ col }) => {
    if (sort !== col) return null;
    return order === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Consumers</h1>
          <p>{formatNumber(total)} total consumers</p>
        </div>
        {selected.length > 0 && (
          <button
            className="btn btn-sm"
            style={{ background: 'var(--risk-high)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 size={14} />
            {deleting ? 'Deleting…' : `Delete ${selected.length} selected`}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1 }}>
          <div className="search-bar" style={{ flex: 1, maxWidth: 360 }}>
            <Search size={15} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by ID, name, meter, area..."
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <select
            className="select"
            value={risk}
            onChange={e => { setRisk(e.target.value); setPage(1); }}
          >
            <option value="">All Risk Levels</option>
            <option value="Normal">Normal</option>
            <option value="Medium">Medium Risk</option>
            <option value="High">High Risk</option>
          </select>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => { setSearch(''); setRisk(''); setPage(1); loadConsumers(''); }}
        >
          Clear Filters
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={consumers.length > 0 && selected.length === consumers.length}
                  ref={el => { if (el) el.indeterminate = selected.length > 0 && selected.length < consumers.length; }}
                  onChange={toggleSelectAll}
                />
              </th>
              <th onClick={() => toggleSort('consumerId')}>Consumer ID <SortIcon col="consumerId" /></th>
              <th onClick={() => toggleSort('name')}>Name <SortIcon col="name" /></th>
              <th>Area</th>
              <th>Meter Number</th>
              <th onClick={() => toggleSort('totalAnomalies')}>Anomalies <SortIcon col="totalAnomalies" /></th>
              <th onClick={() => toggleSort('riskScore')}>Risk Score <SortIcon col="riskScore" /></th>
              <th>Risk Level</th>
              <th>Last Bill</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => <SkeletonRow key={i} cols={11} />)
            ) : consumers.length === 0 ? (
              <tr><td colSpan={11}><EmptyState title="No consumers found" message="Try adjusting your search or filters" /></td></tr>
            ) : consumers.map(c => (
              <tr key={c.consumerId} onClick={() => navigate(`/consumers/${c.consumerId}`)}>
                <td onClick={e => e.stopPropagation()} style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(c.consumerId)}
                    onChange={() => toggleSelect(c.consumerId)}
                  />
                </td>
                <td style={{ fontFamily: 'monospace', color: 'var(--accent-blue)', fontSize: 12 }}>{c.consumerId}</td>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{c.area}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{c.meterNumber}</td>
                <td>{c.totalAnomalies > 0 ? <span style={{ color: 'var(--risk-high)', fontWeight: 600 }}>{c.totalAnomalies}</span> : 0}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 50, height: 5, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${c.riskScore}%`, height: '100%', borderRadius: 3,
                        background: c.riskLevel === 'High' ? 'var(--risk-high)' : c.riskLevel === 'Medium' ? 'var(--risk-medium)' : 'var(--risk-normal)'
                      }} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.riskScore}</span>
                  </div>
                </td>
                <td><RiskBadge level={c.riskLevel} /></td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  {c.lastBill ? `${formatMonth(c.lastBill.month)} — ${formatCurrency(c.lastBill.billAmount)}` : '—'}
                </td>
                <td>
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: 11,
                    background: c.status === 'Active' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                    color: c.status === 'Active' ? 'var(--risk-normal)' : 'var(--risk-high)'
                  }}>{c.status}</span>
                </td>
                <td>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={e => { e.stopPropagation(); navigate(`/consumers/${c.consumerId}`); }}
                  >View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} onChange={p => setPage(p)} />
    </div>
  );
}
