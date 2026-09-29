import React, { useState, useRef, useContext } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { billsAPI } from '../services/api.js';
import { ToastContext } from '../App.jsx';

export default function Bills() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState('upload'); // upload | preview | importing | done
  const [previewData, setPreviewData] = useState(null);
  const [result, setResult] = useState(null);
  const fileRef = useRef();
  const addToast = useContext(ToastContext);

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      addToast('Only CSV and Excel (.xlsx, .xls) files are supported', 'error');
      return;
    }
    setFile(f);
    setStep('upload');
    setPreviewData(null);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handlePreview = async () => {
    if (!file) return;
    setStep('previewing');
    try {
      const res = await billsAPI.upload(file, true);
      setPreviewData(res.data);
      setStep('preview');
    } catch (e) {
      addToast('Preview failed: ' + e.message, 'error');
      setStep('upload');
    }
  };

  const handleImport = async () => {
    setStep('importing');
    try {
      const res = await billsAPI.upload(file, false);
      setResult(res.data);
      setStep('done');
      addToast(`Imported ${res.data.imported} records successfully`, 'success');
    } catch (e) {
      addToast('Import failed: ' + e.message, 'error');
      setStep('preview');
    }
  };

  const reset = () => {
    setFile(null);
    setStep('upload');
    setPreviewData(null);
    setResult(null);
  };

  const templateHeaders = 'consumerId,name,meterNumber,month,previousMeterReading,currentMeterReading,billedUnits,billAmount';
  const templateExample = 'C10001,John Smith,M2000001,2024-06,15000,15320,320,2130.00';

  return (
    <div>
      <div className="page-header">
        <h1>Bills Upload</h1>
        <p>Upload CSV or Excel files to import electricity billing records</p>
      </div>

      {/* Template Download */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">CSV Template Format</div>
        <div style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--bg-primary)', padding: 14, borderRadius: 8, border: '1px solid var(--border)', lineHeight: 1.8, color: 'var(--text-secondary)', overflowX: 'auto' }}>
          <div style={{ color: 'var(--accent-cyan)' }}>{templateHeaders}</div>
          <div>{templateExample}</div>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          style={{ marginTop: 12 }}
          onClick={() => {
            const content = `${templateHeaders}\n${templateExample}\n`;
            const blob = new Blob([content], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'gridguard_template.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <FileText size={14} /> Download Template
        </button>
      </div>

      {/* Upload Zone */}
      {(step === 'upload' || step === 'previewing') && (
        <div
          className={`upload-zone ${dragging ? 'dragging' : ''}`}
          style={{ marginBottom: 20 }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          <Upload size={40} style={{ color: 'var(--accent-blue)', opacity: 0.8 }} />
          {file ? (
            <>
              <h3 style={{ color: 'var(--accent-blue)' }}>✓ {file.name}</h3>
              <p>{(file.size / 1024).toFixed(1)} KB — Click to change file</p>
            </>
          ) : (
            <>
              <h3>Drop your file here or click to browse</h3>
              <p>Supports CSV, XLSX, XLS · Max 10 MB</p>
            </>
          )}
        </div>
      )}

      {file && step === 'upload' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button className="btn btn-primary" onClick={handlePreview}>
            <Eye size={15} /> Preview File
          </button>
        </div>
      )}

      {step === 'previewing' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', marginBottom: 20 }}>
          <div className="spinner" /> Previewing file...
        </div>
      )}

      {/* Preview */}
      {step === 'preview' && previewData && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">File Preview</div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ padding: '8px 14px', background: 'rgba(59,130,246,0.1)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Rows: </span><b>{previewData.total}</b>
              </div>
              <div style={{ padding: '8px 14px', background: 'rgba(16,185,129,0.1)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Valid Records: </span><b style={{ color: 'var(--risk-normal)' }}>{previewData.validCount}</b>
              </div>
              {previewData.errors?.length > 0 && (
                <div style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Errors: </span><b style={{ color: 'var(--risk-high)' }}>{previewData.errors.length}</b>
                </div>
              )}
            </div>

            {/* Sample rows */}
            <div className="table-wrapper" style={{ marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    {previewData.preview?.[0] && Object.keys(previewData.preview[0]).slice(0, 8).map(k => <th key={k}>{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(previewData.preview || []).map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).slice(0, 8).map((v, j) => (
                        <td key={j} style={{ fontSize: 12 }}>{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Validation errors */}
            {previewData.errors?.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--risk-high)', marginBottom: 8, fontWeight: 600 }}>Validation Errors (rows with errors will be skipped):</div>
                <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {previewData.errors.slice(0, 20).map((e, i) => (
                    <div key={i} style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--risk-high)', fontWeight: 600 }}>Row {e.row} ({e.consumerId}): </span>
                      {e.errors.join(', ')}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={handleImport} disabled={previewData.validCount === 0}>
              <Upload size={15} /> Import {previewData.validCount} Valid Records
            </button>
            <button className="btn btn-secondary" onClick={reset}>Cancel</button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', padding: 24 }}>
          <div className="spinner" /> Importing records...
        </div>
      )}

      {step === 'done' && result && (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={48} color="var(--risk-normal)" style={{ marginBottom: 12 }} />
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>Import Complete</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
              {result.imported} of {result.total} records imported successfully
              {result.errors?.length > 0 && ` (${result.errors.length} rows skipped due to errors)`}
            </p>
            <button className="btn btn-primary" onClick={reset}>Upload Another File</button>
          </div>
        </div>
      )}
    </div>
  );
}
