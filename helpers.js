export function getRiskColor(level) {
  switch (level) {
    case 'High': return 'var(--risk-high)';
    case 'Medium': return 'var(--risk-medium)';
    case 'Normal': return 'var(--risk-normal)';
    default: return 'var(--text-muted)';
  }
}

export function getRiskClass(level) {
  switch (level) {
    case 'High': return 'risk-high';
    case 'Medium': return 'risk-medium';
    case 'Normal': return 'risk-normal';
    default: return 'risk-normal';
  }
}

export function getRiskBarColor(score) {
  if (score >= 61) return 'var(--risk-high)';
  if (score >= 31) return 'var(--risk-medium)';
  return 'var(--risk-normal)';
}

export function getAnomalyTagClass(type) {
  if (!type) return '';
  if (type.includes('Drop')) return 'tag-drop';
  if (type.includes('Spike')) return 'tag-spike';
  if (type.includes('Mismatch')) return 'tag-mismatch';
  if (type.includes('Repeated')) return 'tag-repeated';
  if (type.includes('Multiple')) return 'tag-multiple';
  return '';
}

export function formatMonth(str) {
  if (!str) return '';
  try {
    const [y, m] = str.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  } catch { return str; }
}

export function formatCurrency(val) {
  if (val == null) return '—';
  return `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function formatNumber(val, decimals = 0) {
  if (val == null) return '—';
  return Number(val).toLocaleString('en-IN', { maximumFractionDigits: decimals });
}

export function formatDeviation(val) {
  if (val == null) return '—';
  const sign = val >= 0 ? '+' : '';
  return `${sign}${Number(val).toFixed(1)}%`;
}

export function severityColor(s) {
  switch (s) {
    case 'Critical': return '#fca5a5';
    case 'High': return 'var(--risk-high)';
    case 'Medium': return 'var(--risk-medium)';
    case 'Low': return 'var(--risk-normal)';
    default: return 'var(--text-muted)';
  }
}

export function alertStatusClass(status) {
  switch (status) {
    case 'New': return 'status-new';
    case 'Under Investigation': return 'status-investigating';
    case 'Reviewed': return 'status-reviewed';
    case 'Resolved': return 'status-resolved';
    default: return '';
  }
}

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
