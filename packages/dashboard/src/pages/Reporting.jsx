import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText, Download, Share2, Calendar, Layout,
  Plus, History, Clock, FileCheck,
  TrendingUp, BarChart, Target,
  ArrowRight, Copy, Search,
  Mail, RefreshCw, ExternalLink, Printer,
} from "lucide-react";

import { apiSafeFetch } from "../lib/api/client";

// ── Registry (mirrors report_registry.js) ───────────────────────────────────

const REPORT_REGISTRY = {
  exec_growth:     { template: 'executive',   label: 'Executive Growth Report',        icon: Target },
  social_perf:     { template: 'agency',      label: 'Social Performance Report',      icon: BarChart },
  seo_vis:         { template: 'executive',   label: 'SEO Visibility Report',          icon: Search },
  comp_bench:      { template: 'agency',      label: 'Competitive Benchmark Report',   icon: TrendingUp },
  brand_health:    { template: 'executive',   label: 'Brand Health Report',            icon: FileCheck },
  qbr:             { template: 'executive',   label: 'Quarterly Business Review',      icon: Calendar },
  content_perf:    { template: 'agency',      label: 'Content Performance Report',     icon: FileText },
  audience_intel:  { template: 'executive',   label: 'Audience Intelligence Report',   icon: Share2 },
  campaign_impact: { template: 'agency',      label: 'Campaign Impact Report',         icon: Target },
  whitelabel:      { template: 'white_label', label: 'White-label Client Report',      icon: Layout },
  boardroom:       { template: 'executive',   label: 'Boardroom Strategic Report',     icon: Layout },
  agency_perf:     { template: 'agency',      label: 'Agency Performance Report',      icon: BarChart },
};

const REPORT_MODES = [
  { id: 'snapshot',  label: 'Quick Snapshot',   desc: '1–2 pages. Weekly summaries and internal updates.' },
  { id: 'executive', label: 'Executive Report', desc: '6–15 pages. Leadership, agencies, and strategic reviews.' },
  { id: 'deck',      label: 'Strategic Deck',   desc: 'Presentation style. QBRs and boardroom reviews.' },
];

const DATE_RANGES = ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'This Quarter', 'Last Quarter', 'Year to Date'];

// ── Fetch helper that returns raw HTML ────────────────────────────────────────

async function fetchReportHTML(reportType, brandId) {
  const token = localStorage.getItem('mpp_token');
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const res = await fetch(`${apiBase}/api/customer/reports/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({ report_type: reportType, brand_id: brandId }),
  });
  if (!res.ok) throw new Error(`Render failed: ${res.status}`);
  return res.text();
}

// ── Main Component ────────────────────────────────────────────────────────────

const Reporting = ({ activeBrand }) => {
  const [view, setView] = useState('history');
  const [reportsState, setReportsState] = useState({ status: 'loading', data: null });
  const [reportConfig, setReportConfig] = useState({ type: 'exec_growth', mode: 'executive', dateRange: 'Last 30 Days' });
  const [renderState, setRenderState] = useState({ status: 'idle', blobUrl: null, error: null });
  const [shareCopied, setShareCopied] = useState(false);
  const iframeRef = useRef(null);

  const fetchReports = useCallback(async () => {
    if (!activeBrand?.id) { setReportsState({ status: 'empty', data: [] }); return; }
    setReportsState({ status: 'loading', data: null });
    const result = await apiSafeFetch(`/api/customer/reports?brandId=${activeBrand.id}`);
    setReportsState(result);
  }, [activeBrand]);

  useEffect(() => {
    const t = setTimeout(fetchReports, 0);
    return () => clearTimeout(t);
  }, [fetchReports]);

  // Revoke blob URL on unmount to avoid memory leak
  useEffect(() => {
    return () => { if (renderState.blobUrl) URL.revokeObjectURL(renderState.blobUrl); };
  }, [renderState.blobUrl]);

  const handleGenerate = async () => {
    if (renderState.blobUrl) URL.revokeObjectURL(renderState.blobUrl);
    setRenderState({ status: 'loading', blobUrl: null, error: null });
    try {
      const html = await fetchReportHTML(reportConfig.type, activeBrand?.id);
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      setRenderState({ status: 'ready', blobUrl, error: null });
    } catch (err) {
      setRenderState({ status: 'error', blobUrl: null, error: err.message });
    }
  };

  const handleOpenReport = () => {
    if (renderState.blobUrl) window.open(renderState.blobUrl, '_blank');
  };

  const handleExportPDF = () => {
    if (!renderState.blobUrl) return;
    const win = window.open(renderState.blobUrl, '_blank');
    if (win) setTimeout(() => win.print(), 900);
  };

  const handleShareReport = async () => {
    const text = `${window.location.origin}/dashboard/reporting — ${REPORT_REGISTRY[reportConfig.type]?.label || 'Report'} for ${activeBrand?.name || 'Brand'}`;
    try {
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2200);
    } catch { /* silent */ }
  };

  const handleSave = async () => {
    if (!activeBrand?.id) return;
    await apiSafeFetch('/api/customer/reports', {
      method: 'POST',
      body: JSON.stringify({
        title: `${REPORT_REGISTRY[reportConfig.type]?.label} — ${reportConfig.dateRange}`,
        date_range_start: new Date().toISOString().slice(0, 10),
        date_range_end: new Date().toISOString().slice(0, 10),
        report_type: reportConfig.type,
      }),
    });
    setView('history');
    fetchReports();
  };

  if (reportsState.status === 'loading' && view === 'history') {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: 400 }}>
        <RefreshCw className="text-primary mb-3" size={32} style={{ animation: 'spin 1s linear infinite' }} />
        <div className="fw-bold text-muted small">Loading reports…</div>
      </div>
    );
  }

  const history = reportsState.data || [];
  const selectedType = REPORT_REGISTRY[reportConfig.type];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div className="extra-small fw-bold text-primary text-uppercase mb-1" style={{ letterSpacing: '0.1em' }}>Executive Briefings</div>
          <h4 className="fw-bold mb-1" style={{ color: 'var(--text-main)' }}>Reporting &amp; Strategy</h4>
          <p className="text-muted extra-small mb-0">Generate strategic presentations, performance reviews, and client decks.</p>
        </div>
        {view === 'history' && (
          <button className="btn btn-primary btn-sm px-4 d-flex align-items-center gap-2 extra-small fw-bold"
            style={{ borderRadius: 8 }} onClick={() => setView('builder')}>
            <Plus size={15} /> Build Report
          </button>
        )}
        {view !== 'history' && (
          <button className="btn btn-light btn-sm extra-small fw-bold"
            style={{ borderRadius: 8 }} onClick={() => setView('history')}>
            <History size={14} className="me-1" /> History
          </button>
        )}
      </div>

      {/* ══ HISTORY ══════════════════════════════════════════════════════════ */}
      {view === 'history' && (
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card-workspace p-0 overflow-hidden bg-white" style={{ borderRadius: 14 }}>
              <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0" style={{ color: 'var(--text-main)' }}>Recent Reports</h6>
                <span className="extra-small text-muted fw-bold">All render through the same engine</span>
              </div>
              <table className="table table-hover mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="px-4 py-3 extra-small fw-bold text-muted text-uppercase">Report</th>
                    <th className="py-3 extra-small fw-bold text-muted text-uppercase">Date</th>
                    <th className="py-3 extra-small fw-bold text-muted text-uppercase">Status</th>
                    <th className="text-end px-4 py-3 extra-small fw-bold text-muted text-uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length > 0 ? history.map(r => (
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setView('builder')}>
                      <td className="px-4 py-3">
                        <div className="fw-bold small" style={{ color: 'var(--text-main)' }}>{r.title}</div>
                        <div className="extra-small text-muted">{r.report_type}</div>
                      </td>
                      <td className="small text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td><span className="badge bg-success bg-opacity-10 text-success extra-small fw-bold rounded-pill">Generated</span></td>
                      <td className="text-end px-4">
                        <div className="d-flex justify-content-end gap-2">
                          <button className="btn btn-link btn-sm p-0 text-muted"><Download size={15} /></button>
                          <button className="btn btn-link btn-sm p-0 text-muted"><Copy size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="text-center py-5 text-muted small">
                        No reports yet. Build your first executive briefing.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card-workspace p-4 bg-white" style={{ borderRadius: 14 }}>
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <Clock size={16} className="text-primary" /> Automated Delivery
              </h6>
              <p className="extra-small text-muted mb-3">Your next review will generate automatically and notify stakeholders.</p>
              <div className="bg-light p-3 rounded border">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-bold small" style={{ color: 'var(--text-main)' }}>Executive Growth Report</span>
                  <span className="extra-small text-primary fw-bold">In 12 days</span>
                </div>
                <div className="extra-small text-muted">Format: Strategic Deck</div>
              </div>
              <button className="btn btn-outline-secondary w-100 mt-3 extra-small fw-bold rounded">Configure Automation</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ BUILDER ══════════════════════════════════════════════════════════ */}
      {view === 'builder' && (
        <div className="card-workspace p-5 mx-auto bg-white" style={{ maxWidth: 860, borderRadius: 20 }}>
          <h4 className="fw-bold mb-1" style={{ color: 'var(--text-main)' }}>Configure Report</h4>
          <p className="text-muted small mb-5">Select mode and report type. The renderer applies cover, TOC, sections, and back page automatically.</p>

          {/* Mode */}
          <div className="mb-5">
            <label className="small fw-bold mb-3 d-block" style={{ color: 'var(--text-main)' }}>1. Reporting Mode</label>
            <div className="row g-3">
              {REPORT_MODES.map(m => (
                <div key={m.id} className="col-md-4">
                  <div
                    className="p-3 border rounded h-100 cursor-pointer"
                    style={{ borderColor: reportConfig.mode === m.id ? 'var(--pilot-blue)' : 'var(--border-subtle)', background: reportConfig.mode === m.id ? 'var(--pilot-blue-light)' : '#fff', transition: 'all .15s' }}
                    onClick={() => setReportConfig(c => ({ ...c, mode: m.id }))}>
                    <div className="small fw-bold mb-1" style={{ color: 'var(--text-main)' }}>{m.label}</div>
                    <div className="extra-small text-muted">{m.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Type */}
          <div className="mb-5">
            <label className="small fw-bold mb-3 d-block" style={{ color: 'var(--text-main)' }}>2. Report Type</label>
            <div className="row g-2">
              {Object.entries(REPORT_REGISTRY).map(([id, cfg]) => {
                const Icon = cfg.icon;
                const active = reportConfig.type === id;
                return (
                  <div key={id} className="col-md-3">
                    <div
                      className="p-3 border rounded cursor-pointer"
                      style={{ borderColor: active ? 'var(--pilot-blue)' : 'var(--border-subtle)', background: active ? 'var(--pilot-blue-light)' : '#fff', transition: 'all .15s' }}
                      onClick={() => setReportConfig(c => ({ ...c, type: id }))}>
                      <Icon size={18} style={{ color: active ? 'var(--pilot-blue)' : 'var(--text-muted)', marginBottom: 6 }} />
                      <div className="small fw-bold lh-sm" style={{ color: 'var(--text-main)', fontSize: '0.78rem' }}>{cfg.label}</div>
                      <div className="extra-small text-muted mt-1" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cfg.template}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Date range */}
          <div className="mb-5">
            <label className="small fw-bold mb-3 d-block" style={{ color: 'var(--text-main)' }}>3. Date Range</label>
            <div className="d-flex flex-wrap gap-2">
              {DATE_RANGES.map(r => (
                <button key={r}
                  className="btn btn-sm extra-small fw-bold"
                  style={{ borderRadius: 8, border: `1.5px solid ${reportConfig.dateRange === r ? 'var(--pilot-blue)' : 'var(--border-subtle)'}`, background: reportConfig.dateRange === r ? 'var(--pilot-blue-light)' : '#fff', color: reportConfig.dateRange === r ? 'var(--pilot-blue)' : 'var(--text-muted)' }}
                  onClick={() => setReportConfig(c => ({ ...c, dateRange: r }))}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="d-flex justify-content-end gap-3 pt-4 border-top">
            <button className="btn btn-light btn-sm px-4 fw-bold rounded" onClick={() => setView('history')}>Cancel</button>
            <button className="btn btn-primary btn-sm px-5 fw-bold rounded d-flex align-items-center gap-2"
              onClick={() => { setView('preview'); handleGenerate(); }}>
              Preview Report <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ══ PREVIEW (split: settings left, iframe right) ═════════════════════ */}
      {view === 'preview' && (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* ── Left: settings + actions ── */}
          <div style={{ width: 280, flexShrink: 0, position: 'sticky', top: 16 }}>

            {/* Config summary */}
            <div className="card-workspace p-4 bg-white mb-3" style={{ borderRadius: 14 }}>
              <div className="extra-small fw-bold text-muted text-uppercase mb-3" style={{ letterSpacing: '0.08em' }}>Report Configuration</div>

              <div className="mb-3">
                <div className="extra-small fw-bold text-muted mb-1">Type</div>
                <div className="small fw-bold" style={{ color: 'var(--text-main)' }}>{selectedType?.label}</div>
                <div className="extra-small text-muted" style={{ textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.06em' }}>
                  Template: {selectedType?.template}
                </div>
              </div>

              <div className="mb-3">
                <div className="extra-small fw-bold text-muted mb-1">Mode</div>
                <div className="small" style={{ color: 'var(--text-main)' }}>{REPORT_MODES.find(m => m.id === reportConfig.mode)?.label}</div>
              </div>

              <div className="mb-4">
                <div className="extra-small fw-bold text-muted mb-1">Brand</div>
                <div className="small" style={{ color: 'var(--text-main)' }}>{activeBrand?.name || '—'}</div>
              </div>

              <button className="btn btn-outline-secondary w-100 extra-small fw-bold rounded mb-2"
                onClick={() => setView('builder')}>
                ← Reconfigure
              </button>
              <button className="btn btn-primary w-100 extra-small fw-bold rounded d-flex align-items-center justify-content-center gap-2"
                onClick={handleGenerate} disabled={renderState.status === 'loading'}>
                {renderState.status === 'loading'
                  ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
                  : <><RefreshCw size={13} /> Regenerate</>}
              </button>
            </div>

            {/* Actions (only when ready) */}
            {renderState.status === 'ready' && (
              <div className="card-workspace p-4 bg-white mb-3" style={{ borderRadius: 14 }}>
                <div className="extra-small fw-bold text-muted text-uppercase mb-3" style={{ letterSpacing: '0.08em' }}>Export &amp; Share</div>
                <div className="d-flex flex-column gap-2">
                  <button className="btn btn-outline-secondary btn-sm extra-small fw-bold rounded d-flex align-items-center gap-2"
                    onClick={handleOpenReport}>
                    <ExternalLink size={13} /> Open Report
                  </button>
                  <button className="btn btn-primary btn-sm extra-small fw-bold rounded d-flex align-items-center gap-2"
                    onClick={handleExportPDF}>
                    <Printer size={13} /> Export PDF
                  </button>
                  <button className="btn btn-outline-secondary btn-sm extra-small fw-bold rounded d-flex align-items-center gap-2"
                    onClick={handleShareReport}>
                    {shareCopied ? <><Copy size={13} /> Copied!</> : <><Share2 size={13} /> Copy Link</>}
                  </button>
                  <button className="btn btn-outline-secondary btn-sm extra-small fw-bold rounded d-flex align-items-center gap-2"
                    onClick={handleSave}>
                    <FileCheck size={13} /> Save to History
                  </button>
                </div>
              </div>
            )}

            {renderState.status === 'error' && (
              <div className="alert alert-danger extra-small p-3" style={{ borderRadius: 10 }}>
                <strong>Render failed.</strong><br />{renderState.error || 'Please try again.'}
              </div>
            )}
          </div>

          {/* ── Right: iframe preview ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="bg-white" style={{ borderRadius: 14, border: '1px solid var(--border-subtle)', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>

              {/* Browser chrome bar */}
              <div style={{ padding: '10px 16px', background: 'var(--surface-secondary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fc5c65', display: 'inline-block' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffd32a', display: 'inline-block' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#05c46b', display: 'inline-block' }} />
                <div style={{ flex: 1, background: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', marginLeft: 8 }}>
                  {selectedType?.label} — {activeBrand?.name || 'Brand'}
                </div>
              </div>

              {/* States */}
              {renderState.status === 'idle' && (
                <div style={{ minHeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)' }}>
                  <FileText size={40} style={{ opacity: 0.3 }} />
                  <div className="small fw-bold text-muted">Click "Preview Report" to generate</div>
                </div>
              )}

              {renderState.status === 'loading' && (
                <div style={{ minHeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <RefreshCw size={32} className="text-primary" style={{ animation: 'spin 1s linear infinite' }} />
                  <div className="small fw-bold text-muted">Rendering report…</div>
                  <div className="extra-small text-muted">Cover · TOC · 13 sections · Back page</div>
                </div>
              )}

              {renderState.status === 'ready' && renderState.blobUrl && (
                <iframe
                  ref={iframeRef}
                  src={renderState.blobUrl}
                  title="Report Preview"
                  style={{ width: '100%', height: '80vh', border: 'none', display: 'block' }}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-modals"
                />
              )}

              {renderState.status === 'error' && (
                <div style={{ minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--status-danger)' }}>
                  <div className="small fw-bold">Render failed — check brand data and try again.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .cursor-pointer { cursor: pointer; }
      `}</style>
    </div>
  );
};

export default Reporting;
