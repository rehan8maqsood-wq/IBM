import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const icons = {
  success: <CheckCircle size={16} color="var(--risk-normal)" />,
  error: <AlertCircle size={16} color="var(--risk-high)" />,
  warning: <AlertTriangle size={16} color="var(--risk-medium)" />,
  info: <Info size={16} color="var(--accent-blue)" />,
};

export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map(({ id, message, type }) => (
        <div key={id} className={`toast toast-${type}`}>
          {icons[type]}
          <span style={{ flex: 1, color: 'var(--text-primary)' }}>{message}</span>
          <button
            onClick={() => removeToast(id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
