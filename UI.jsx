import React from 'react';
import { getRiskClass, getRiskBarColor } from '../utils/helpers.js';

export function RiskBadge({ level, score }) {
  return (
    <span className={`risk-badge ${getRiskClass(level)}`}>
      {level === 'High' ? '🔴' : level === 'Medium' ? '🟡' : '🟢'} {level}
      {score != null && ` (${score})`}
    </span>
  );
}

export function RiskScoreBar({ score }) {
  const color = getRiskBarColor(score);
  return (
    <div className="risk-score-bar-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted)' }}>Risk Indicator</span>
        <span style={{ color, fontWeight: 700 }}>{score}/100</span>
      </div>
      <div className="risk-score-bar-track">
        <div
          className="risk-score-bar-fill"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--text-muted)' }}>
        <span>0 — Normal</span>
        <span>31 — Medium</span>
        <span>61 — High Risk</span>
      </div>
    </div>
  );
}

export function AnomalyTag({ type }) {
  const cls = type?.includes('Drop') ? 'tag-drop'
    : type?.includes('Spike') ? 'tag-spike'
    : type?.includes('Mismatch') ? 'tag-mismatch'
    : type?.includes('Repeated') ? 'tag-repeated'
    : type?.includes('Multiple') ? 'tag-multiple' : '';
  return <span className={`tag ${cls}`}>{type}</span>;
}

export function SkeletonRow({ cols = 6 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}>
          <div className="skeleton" style={{ height: 14, width: '80%', borderRadius: 4 }} />
        </td>
      ))}
    </tr>
  );
}

export function EmptyState({ icon, title, message }) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const items = [];
  for (let i = 1; i <= Math.min(pages, 7); i++) items.push(i);

  return (
    <div className="pagination">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1}>‹</button>
      {items.map(i => (
        <button key={i} className={page === i ? 'active' : ''} onClick={() => onChange(i)}>{i}</button>
      ))}
      {pages > 7 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
      {pages > 7 && (
        <button className={page === pages ? 'active' : ''} onClick={() => onChange(pages)}>{pages}</button>
      )}
      <button onClick={() => onChange(page + 1)} disabled={page >= pages}>›</button>
    </div>
  );
}

export function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid rgba(59,130,246,0.3)`,
      borderTopColor: 'var(--accent-blue)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite'
    }} />
  );
}
