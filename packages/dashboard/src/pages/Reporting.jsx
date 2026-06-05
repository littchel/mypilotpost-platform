/**
 * myPilotPost — Reporting Tab
 * Report Configurator: two-panel layout.
 * Left panel (sticky): all config. Right panel: live iframe preview.
 * All report types resolve through REPORT_REGISTRY → renderReportHandler.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText, Share2, Calendar, Layout,
  Plus, History, Clock, FileCheck,
  TrendingUp, BarChart, Target,
  Copy, Search, Mail, RefreshCw, ExternalLink, Printer,
  Lock, MessageCircle,
} from "lucide-react";
import { apiSafeFetch } from "../lib/api/client";

// ── Registry (mirrors server-side report_registry.js) ───────────────────────

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

const TEMPLATES = [
  { id: 'executive',   label: 'Executive' },
  { id: 'agency',      label: 'Agency' },
  { id: 'internal',    label: 'Internal' },
  { id: 'white_label', label: 'White Label' },
];

const REPORT_MODES = [
  { id: 'snapshot',  label: 'Snapshot',  desc: '1–2 pages' },
  { id: 'executive', label: 'Executive', desc: '6–15 pages' },
  { id: 'deck',      label: 'Strategic', desc: 'QBR / Boardroom' },
];

const DATE_RANGES = [
  'Last 7 Days', 'Last 30 Days', 'Last 90 Days',
  'This Quarter', 'Last Quarter', 'Year to Date',
];

// ── API helper ───────────────────────────────────────────────────────────────

async function fetchReportHTML(reportType, templateOverride, whiteLabelConfig) {
  const token = localStorage.getItem('mpp_token');
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const res = await fetch(`${apiBase}/api/customer/reports/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({
      report_type: reportType,
      template_override: templateOverride,
      white_label_config: whiteLabelConfig || null,
    }),
  });
  if (!res.ok) throw new Error(`Render failed: ${res.status}`);
  return res.text();
}

// ── Skeleton report pages (shown while rendering) ────────────────────────────

function ReportSkeleton() {
  const Line = ({ w = '100%', h = 10, mb = 8, op = 1 }) => (
    <div style={{ height: h, borderRadius: 3, marginBottom: mb, width: w, opacity: op, background: '#f1f5f9' }} />
  );
  return (
    <div style={{ padding: 24, background: '#e8ecf0', minHeight: '80vh' }}>

      {/* Cover skeleton */}
      <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', borderRadius: 6, padding: '40px 48px', marginBottom: 16, minHeight: 260 }}>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 3, width: '28%', marginBottom: 28 }} />
        <div style={{ display: 'flex', gap: 28, alignItems: 'center', marginBottom: 28 }}>
          <div style={{ width: 90, height: 90, borderRadius: '50%', border: '7px solid rgba(255,255,255,0.07)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 3, width: '40%', marginBottom: 10 }} />
            <div style={{ height: 22, background: 'rgba(255,255,255,0.14)', borderRadius: 4, width: '68%', marginBottom: 10 }} />
            <div style={{ height: 7, background: 'rgba(255,255,255,0.05)', borderRadius: 3, width: '48%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[60, 75, 55, 68, 50].map((w, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, width: `${w}%` }} />
              <div style={{ height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 3, width: 28 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Contents skeleton */}
      <div style={{ background: '#fff', borderRadius: 6, padding: '36px 48px', marginBottom: 16 }}>
        <Line w="22%" h={22} mb={20} />
        {[92, 86, 90, 80, 88, 84, 90, 76].map((w, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f8fafc' }}>
            <div style={{ width: 20, height: 7, background: '#eff6ff', borderRadius: 3 }} />
            <Line w={`${w}%`} h={7} mb={0} />
          </div>
        ))}
      </div>

      {/* Body skeleton */}
      <div style={{ background: '#fff', borderRadius: 6, padding: '36px 48px' }}>
        <Line w="24%" h={16} mb={16} />
        <Line w="92%" mb={6} />
        <Line w="80%" mb={18} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 72, background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }} />
          ))}
        </div>
        <Line w="28%" h={14} mb={12} />
        <Line w="88%" mb={6} />
        <Line w="76%" mb={0} />
      </div>
    </div>
  );
}

// ── Left panel section label ─────────────────────────────────────────────────

function PanelSection({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

const Reporting = ({ activeBrand }) => {
  const [tab, setTab] = useState('configurator');
  const [reportConfig, setReportConfig] = useState({
    type: 'exec_growth',
    template: 'executive',
    mode: 'executive',
    dateRange: 'Last 30 Days',
  });
  const [wlConfig, setWlConfig] = useState({
    clientName: '',
    clientUrl: '',
    primaryColor: '#2563eb',
    footerText: '',
  });
  const [renderState, setRenderState] = useState({ status: 'idle', blobUrl: null, error: null });
  const [historyState, setHistoryState] = useState({ status: 'idle', data: [] });
  const [shareCopied, setShareCopied] = useState(false);
  const iframeRef = useRef(null);

  // Derived
  const selectedReg = REPORT_REGISTRY[reportConfig.type] || REPORT_REGISTRY.exec_growth;
  const isWhiteLabel = reportConfig.template === 'white_label';
  const canWhiteLabel = ['pro', 'agency', 'enterprise'].includes(activeBrand?.plan);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => { if (renderState.blobUrl) URL.revokeObjectURL(renderState.blobUrl); };
  }, [renderState.blobUrl]);

  // Load history when switching to that tab
  const loadHistory = useCallback(async () => {
    if (!activeBrand?.id) { setHistoryState({ status: 'empty', data: [] }); return; }
    setHistoryState({ status: 'loading', data: [] });
    const result = await apiSafeFetch(`/api/customer/reports?brandId=${activeBrand.id}`);
    setHistoryState({ status: result.status || 'ready', data: result.data || [] });
  }, [activeBrand]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, loadHistory]);

  // When report type changes, sync template to registry default
  const setReportType = (type) => {
    const reg = REPORT_REGISTRY[type] || REPORT_REGISTRY.exec_growth;
    setReportConfig(c => ({ ...c, type, template: reg.template }));
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!activeBrand?.id) return;
    if (renderState.blobUrl) URL.revokeObjectURL(renderState.blobUrl);
    setRenderState({ status: 'loading', blobUrl: null, error: null });
    try {
      const wl = (isWhiteLabel && canWhiteLabel) ? {
        client_name: wlConfig.clientName,
        client_url: wlConfig.clientUrl,
        primary_color: wlConfig.primaryColor,
        footer_text: wlConfig.footerText,
      } : null;
      const html = await fetchReportHTML(reportConfig.type, reportConfig.template, wl);
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

  const handleCopyLink = async () => {
    const text = `${selectedReg.label} — ${activeBrand?.name || ''}\n\nGenerated by myPilotPost · ${window.location.origin}/dashboard/reporting`;
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
        title: `${selectedReg.label} — ${reportConfig.dateRange}`,
        date_range_start: new Date().toISOString().slice(0, 10),
        date_range_end: new Date().toISOString().slice(0, 10),
        report_type: reportConfig.type,
      }),
    });
    setTab('history');
  };

  // Share text for email / WhatsApp
  const shareSubject = encodeURIComponent(`${selectedReg.label} — ${activeBrand?.name || ''}`);
  const shareBody = encodeURIComponent(
    `${selectedReg.label} for ${activeBrand?.name || 'your brand'}.\n\nGenerated by myPilotPost Brand Intelligence Platform.\nhttps://app.mypilotpost.com`
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div className="extra-small fw-bold text-primary text-uppercase mb-1" style={{ letterSpacing: '0.1em' }}>Executive Briefings</div>
          <h4 className="fw-bold mb-1" style={{ color: 'var(--text-main)' }}>Reporting &amp; Strategy</h4>
          <p className="text-muted extra-small mb-0">Configure your report, preview in real time, then export or share.</p>
        </div>
        <div className="d-flex gap-2">
          <button
            className={`btn btn-sm extra-small fw-bold rounded d-flex align-items-center gap-1 ${tab === 'configurator' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => setTab('configurator')}>
            <FileText size={13} /> Configurator
          </button>
          <button
            className={`btn btn-sm extra-small fw-bold rounded d-flex align-items-center gap-1 ${tab === 'history' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => setTab('history')}>
            <History size={13} /> History
          </button>
        </div>
      </div>

      {/* ══ CONFIGURATOR ════════════════════════════════════════════════════════ */}
      {tab === 'configurator' && (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* LEFT PANEL ─ sticky config */}
          <div style={{
            width: 276, flexShrink: 0,
            position: 'sticky', top: 16,
            maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
          }}>
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border-subtle)', padding: '16px 14px' }}>

              {/* Report Type */}
              <PanelSection label="Report Type">
                {Object.entries(REPORT_REGISTRY).map(([id, cfg]) => {
                  const Icon = cfg.icon;
                  const active = reportConfig.type === id;
                  return (
                    <button key={id} onClick={() => setReportType(id)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 9px', borderRadius: 8, marginBottom: 3,
                      border: `1px solid ${active ? '#2563eb' : '#f1f5f9'}`,
                      background: active ? '#eff6ff' : '#fafbfc',
                      cursor: 'pointer', textAlign: 'left', transition: 'all .12s',
                    }}>
                      <Icon size={13} style={{ color: active ? '#2563eb' : '#94a3b8', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: active ? '#1d4ed8' : '#374151', lineHeight: 1.3 }}>
                          {cfg.label}
                        </div>
                        <div style={{ fontSize: '0.58rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {cfg.template}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </PanelSection>

              {/* Template */}
              <PanelSection label="Template">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => setReportConfig(c => ({ ...c, template: t.id }))} style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                      border: `1.5px solid ${reportConfig.template === t.id ? '#2563eb' : '#e5e7eb'}`,
                      background: reportConfig.template === t.id ? '#eff6ff' : '#fff',
                      color: reportConfig.template === t.id ? '#1d4ed8' : '#64748b',
                      transition: 'all .1s',
                    }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </PanelSection>

              {/* Mode */}
              <PanelSection label="Mode">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {REPORT_MODES.map(m => (
                    <button key={m.id} onClick={() => setReportConfig(c => ({ ...c, mode: m.id }))} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 9px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                      border: `1.5px solid ${reportConfig.mode === m.id ? '#2563eb' : '#e5e7eb'}`,
                      background: reportConfig.mode === m.id ? '#eff6ff' : '#fff',
                      transition: 'all .1s',
                    }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: reportConfig.mode === m.id ? '#1d4ed8' : '#374151' }}>
                        {m.label}
                      </span>
                      <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{m.desc}</span>
                    </button>
                  ))}
                </div>
              </PanelSection>

              {/* Date Range */}
              <PanelSection label="Date Range">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {DATE_RANGES.map(r => (
                    <button key={r} onClick={() => setReportConfig(c => ({ ...c, dateRange: r }))} style={{
                      padding: '4px 9px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
                      border: `1.5px solid ${reportConfig.dateRange === r ? '#2563eb' : '#e5e7eb'}`,
                      background: reportConfig.dateRange === r ? '#eff6ff' : '#fff',
                      color: reportConfig.dateRange === r ? '#1d4ed8' : '#64748b',
                      transition: 'all .1s',
                    }}>{r}</button>
                  ))}
                </div>
              </PanelSection>

              {/* Brand */}
              <PanelSection label="Brand">
                <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>
                    {activeBrand?.name || '—'}
                  </div>
                  {activeBrand?.industry && (
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 2 }}>{activeBrand.industry}</div>
                  )}
                </div>
              </PanelSection>

              {/* White Label Config (only when white_label template selected) */}
              {isWhiteLabel && (
                <PanelSection label="White Label">
                  {canWhiteLabel ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <input
                        placeholder="Client Name"
                        value={wlConfig.clientName}
                        onChange={e => setWlConfig(c => ({ ...c, clientName: e.target.value }))}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #e5e7eb', fontSize: '0.78rem', outline: 'none', color: '#374151', background: '#fff' }}
                      />
                      <input
                        placeholder="Client URL (e.g. clientbrand.com)"
                        value={wlConfig.clientUrl}
                        onChange={e => setWlConfig(c => ({ ...c, clientUrl: e.target.value }))}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #e5e7eb', fontSize: '0.78rem', outline: 'none', color: '#374151', background: '#fff' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="color"
                          value={wlConfig.primaryColor}
                          onChange={e => setWlConfig(c => ({ ...c, primaryColor: e.target.value }))}
                          style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 2, background: 'transparent' }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Primary colour</span>
                        <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#94a3b8' }}>{wlConfig.primaryColor}</span>
                      </div>
                      <input
                        placeholder="Footer text (optional)"
                        value={wlConfig.footerText}
                        onChange={e => setWlConfig(c => ({ ...c, footerText: e.target.value }))}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #e5e7eb', fontSize: '0.78rem', outline: 'none', color: '#374151', background: '#fff' }}
                      />
                      <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.5 }}>
                        Presentation only · Scores and data unchanged · Generated by myPilotPost
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '14px 12px', background: '#fafbfc', borderRadius: 8, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                      <Lock size={16} style={{ color: '#94a3b8', marginBottom: 6 }} />
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#374151', marginBottom: 4 }}>Pro Plan Required</div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', lineHeight: 1.55, marginBottom: 10 }}>
                        White-label reports are available on Pro and above.
                      </div>
                      <button className="btn btn-primary btn-sm extra-small fw-bold rounded" style={{ fontSize: '0.65rem', padding: '4px 12px' }}>
                        Upgrade Plan
                      </button>
                    </div>
                  )}
                </PanelSection>
              )}

              {/* Actions */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                <button
                  className="btn btn-primary btn-sm fw-bold extra-small w-100 d-flex align-items-center justify-content-center gap-2 rounded"
                  onClick={handleGenerate}
                  disabled={renderState.status === 'loading' || !activeBrand?.id}
                  style={{ marginBottom: 8 }}>
                  {renderState.status === 'loading'
                    ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Rendering…</>
                    : <><RefreshCw size={13} /> Generate Report</>}
                </button>

                {renderState.status === 'ready' && (
                  <>
                    <div style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', margin: '10px 0 6px' }}>Export</div>
                    <button className="btn btn-outline-secondary btn-sm extra-small fw-bold w-100 d-flex align-items-center gap-2 rounded mb-2" onClick={handleOpenReport}>
                      <ExternalLink size={12} /> Open Report
                    </button>
                    <button className="btn btn-outline-secondary btn-sm extra-small fw-bold w-100 d-flex align-items-center gap-2 rounded mb-2" onClick={handleExportPDF}>
                      <Printer size={12} /> Export PDF
                    </button>

                    <div style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', margin: '10px 0 6px' }}>Share</div>
                    <button className="btn btn-outline-secondary btn-sm extra-small fw-bold w-100 d-flex align-items-center gap-2 rounded mb-2" onClick={handleCopyLink}>
                      <Copy size={12} /> {shareCopied ? 'Copied!' : 'Copy Link'}
                    </button>
                    <a
                      href={`mailto:?subject=${shareSubject}&body=${shareBody}`}
                      className="btn btn-outline-secondary btn-sm extra-small fw-bold w-100 d-flex align-items-center gap-2 rounded mb-2"
                      style={{ textDecoration: 'none' }}>
                      <Mail size={12} /> Share via Email
                    </a>
                    <a
                      href={`https://wa.me/?text=${shareBody}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm extra-small fw-bold w-100 d-flex align-items-center gap-2 rounded mb-2"
                      style={{ textDecoration: 'none', border: '1px solid #bbf7d0', color: '#16a34a', background: '#f0fdf4' }}>
                      <MessageCircle size={12} /> Share via WhatsApp
                    </a>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8, marginTop: 4 }}>
                      <button className="btn btn-light btn-sm extra-small fw-bold w-100 d-flex align-items-center gap-2 rounded" onClick={handleSave}>
                        <FileCheck size={12} /> Save to History
                      </button>
                    </div>
                  </>
                )}

                {renderState.status === 'error' && (
                  <div className="alert alert-danger extra-small p-2 mb-0 mt-2" style={{ borderRadius: 8, fontSize: '0.72rem' }}>
                    <strong>Render failed.</strong><br />{renderState.error || 'Check brand data and try again.'}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* RIGHT PANEL ─ iframe preview */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ borderRadius: 14, border: '1px solid var(--border-subtle)', overflow: 'hidden', background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,.07)' }}>

              {/* Browser chrome */}
              <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fc5c65', display: 'inline-block' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffd32a', display: 'inline-block' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#05c46b', display: 'inline-block' }} />
                <div style={{
                  flex: 1, background: '#fff', borderRadius: 6, padding: '4px 10px',
                  fontSize: '0.72rem', color: '#64748b', border: '1px solid #e5e7eb', marginLeft: 8,
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>
                  {selectedReg.label}{activeBrand?.name ? ` — ${activeBrand.name}` : ''} · {reportConfig.template} template · {reportConfig.dateRange}
                </div>
              </div>

              {/* Idle state */}
              {renderState.status === 'idle' && (
                <div style={{ minHeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 48 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={28} style={{ color: '#94a3b8' }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 6 }}>Configure and generate your report</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.6, maxWidth: 340 }}>
                      Select a report type and template on the left, then click Generate. The renderer applies cover, TOC, all 13 sections, and back page automatically.
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm px-4 fw-bold extra-small rounded d-flex align-items-center gap-2"
                    onClick={handleGenerate}
                    disabled={!activeBrand?.id}>
                    <RefreshCw size={13} /> Generate Report
                  </button>
                </div>
              )}

              {/* Loading — skeleton pages */}
              {renderState.status === 'loading' && <ReportSkeleton />}

              {/* Ready — iframe */}
              {renderState.status === 'ready' && renderState.blobUrl && (
                <iframe
                  ref={iframeRef}
                  src={renderState.blobUrl}
                  title="Report Preview"
                  style={{ width: '100%', height: '80vh', border: 'none', display: 'block' }}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-modals"
                />
              )}

              {/* Error */}
              {renderState.status === 'error' && (
                <div style={{ minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#dc2626' }}>Render failed</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{renderState.error || 'Check brand data and try again.'}</div>
                  <button className="btn btn-outline-danger btn-sm extra-small rounded mt-2" onClick={handleGenerate}>
                    <RefreshCw size={13} className="me-1" /> Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ HISTORY ═════════════════════════════════════════════════════════════ */}
      {tab === 'history' && (
        <div className="row g-4">
          <div className="col-lg-8">
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
              <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0" style={{ color: 'var(--text-main)' }}>Report History</h6>
                <button
                  className="btn btn-primary btn-sm extra-small fw-bold rounded d-flex align-items-center gap-1"
                  onClick={() => setTab('configurator')}>
                  <Plus size={13} /> New Report
                </button>
              </div>

              {historyState.status === 'loading' ? (
                <div className="d-flex align-items-center justify-content-center p-5">
                  <RefreshCw size={24} className="text-primary" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              ) : (
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
                    {historyState.data?.length > 0 ? historyState.data.map(r => (
                      <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setTab('configurator')}>
                        <td className="px-4 py-3">
                          <div className="fw-bold small" style={{ color: 'var(--text-main)' }}>{r.title}</div>
                          <div className="extra-small text-muted">{r.report_type}</div>
                        </td>
                        <td className="small text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td>
                          <span className="badge bg-success bg-opacity-10 text-success extra-small fw-bold rounded-pill">Saved</span>
                        </td>
                        <td className="text-end px-4">
                          <div className="d-flex justify-content-end gap-2">
                            <button className="btn btn-link btn-sm p-0 text-muted" title="Re-render in Configurator">
                              <RefreshCw size={14} />
                            </button>
                            <button className="btn btn-link btn-sm p-0 text-muted" title="Copy link">
                              <Copy size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="text-center py-5 text-muted small">
                          No saved reports yet. Generate and save your first report.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="col-lg-4">
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border-subtle)', padding: 20 }}>
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <Clock size={15} className="text-primary" /> Automated Delivery
              </h6>
              <p className="extra-small text-muted mb-3">Scheduled reports generate and notify stakeholders automatically.</p>
              <div className="bg-light p-3 rounded border mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-bold small" style={{ color: 'var(--text-main)' }}>Executive Growth Report</span>
                  <span className="extra-small text-primary fw-bold">In 12 days</span>
                </div>
                <div className="extra-small text-muted">Format: Executive · Monthly</div>
              </div>
              <button className="btn btn-outline-secondary w-100 extra-small fw-bold rounded">Configure Automation</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>
    </div>
  );
};

export default Reporting;
