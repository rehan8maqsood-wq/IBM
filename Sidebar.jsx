import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Zap, LayoutDashboard, Users, FileText, Brain,
  Bell, BarChart3, Settings, Shield
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/consumers', icon: Users, label: 'Consumers' },
  { to: '/bills', icon: FileText, label: 'Bills' },
  { to: '/ai-investigation', icon: Brain, label: 'AI Investigation' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ alertCount = 0 }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-title">
          <div className="sidebar-logo-icon">
            <Zap size={18} color="white" strokeWidth={2.5} />
          </div>
          GridGuard AI
        </div>
        <div className="sidebar-logo-sub">Fraud Detection Platform</div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={16} strokeWidth={1.8} />
            {label}
            {label === 'Alerts' && alertCount > 0 && (
              <span className="nav-badge">{alertCount > 99 ? '99+' : alertCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Shield size={12} />
          <span>Demo / Mock Data Active</span>
        </div>
        <div>GridGuard AI v1.0</div>
      </div>
    </aside>
  );
}
