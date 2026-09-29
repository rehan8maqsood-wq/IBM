import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import { useToast } from './hooks/useToast.js';
import { healthAPI, alertsAPI } from './services/api.js';

import Dashboard from './pages/Dashboard.jsx';
import Consumers from './pages/Consumers.jsx';
import ConsumerDetail from './pages/ConsumerDetail.jsx';
import Bills from './pages/Bills.jsx';
import AIInvestigation from './pages/AIInvestigation.jsx';
import Alerts from './pages/Alerts.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';

export const ToastContext = React.createContext(null);

export default function App() {
  const { toasts, addToast, removeToast } = useToast();
  const [backendOnline, setBackendOnline] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    healthAPI.check()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));

    alertsAPI.list({ status: 'New', limit: 1 })
      .then(r => setAlertCount(r.data?.total || 0))
      .catch(() => {});

    const interval = setInterval(() => {
      healthAPI.check()
        .then(() => setBackendOnline(true))
        .catch(() => setBackendOnline(false));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      <div className="app-layout">
        <Sidebar alertCount={alertCount} />
        <div className="main-content">
          <Header backendOnline={backendOnline} />
          <main className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/consumers" element={<Consumers />} />
              <Route path="/consumers/:id" element={<ConsumerDetail />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/ai-investigation" element={<AIInvestigation />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    </ToastContext.Provider>
  );
}
