import React from 'react';
import { useLocation } from 'react-router-dom';
import { Wifi, WifiOff } from 'lucide-react';

const titles = {
  '/': { title: 'Dashboard', sub: 'Overview of electricity billing analytics' },
  '/consumers': { title: 'Consumers', sub: 'Search and manage consumer accounts' },
  '/bills': { title: 'Bills', sub: 'Upload and manage billing records' },
  '/ai-investigation': { title: 'AI Investigation', sub: 'Grok-powered investigation analysis' },
  '/alerts': { title: 'Alerts', sub: 'Manage suspicious pattern alerts' },
  '/reports': { title: 'Reports', sub: 'Investigation reports and downloads' },
  '/settings': { title: 'Settings', sub: 'System configuration' },
};

export default function Header({ backendOnline }) {
  const { pathname } = useLocation();
  const key = Object.keys(titles).reverse().find(k => pathname.startsWith(k)) || '/';
  const { title, sub } = titles[key] || titles['/'];

  return (
    <header className="header">
      <div style={{ flex: 1 }}>
        <div className="header-title">{title}</div>
        <div className="header-sub">{sub}</div>
      </div>
      <div className="header-actions">
        <div
          className="header-badge"
          style={{
            background: backendOnline ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            color: backendOnline ? 'var(--risk-normal)' : 'var(--risk-high)',
            border: `1px solid ${backendOnline ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            display: 'flex', alignItems: 'center', gap: 5
          }}
        >
          {backendOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {backendOnline ? 'Connected' : 'Offline'}
        </div>
        <div className="header-badge">Demo Mode</div>
      </div>
    </header>
  );
}
