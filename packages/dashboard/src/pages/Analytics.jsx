import React, { useState, useEffect, useCallback } from "react";
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell 
} from "recharts";
import { 
  BarChart3, TrendingUp, Users, MousePointer2, Target, 
  Download, Filter, Target as TargetIcon, Search,
  Info, Share2, LayoutGrid, AlertCircle
} from "lucide-react";
import { apiSafeFetch } from "../lib/api/client";

/**
 * Production-Hardened Analytics System
 * Implements strict status modeling: loading | empty | error | success
 */

// ── Shared UI States ──────────────────────────────────────────────────────

const LoadingIndicator = ({ message = "Loading analytics..." }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-5 text-muted animate__animated animate__fadeIn">
    <div className="spinner-border spinner-border-sm mb-3 text-primary" role="status"></div>
    <span className="extra-small fw-medium">{message}</span>
  </div>
);

const EmptyState = ({ message = "No data yet" }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-5 text-muted animate__animated animate__fadeIn">
    <BarChart3 size={32} strokeWidth={1} className="mb-3 opacity-20" />
    <span className="extra-small fw-medium">{message}</span>
  </div>
);

const ErrorState = ({ message = "Unable to load data", onRetry }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-5 text-danger animate__animated animate__fadeIn">
    <AlertCircle size={32} strokeWidth={1} className="mb-3 opacity-50" />
    <span className="extra-small fw-bold mb-3">{message}</span>
    {onRetry && (
      <button 
        className="btn btn-sm btn-outline-danger px-4 py-2 rounded-pill fw-bold" 
        style={{ fontSize: '0.65rem' }}
        onClick={onRetry}
      >
        Retry
      </button>
    )}
  </div>
);

const KPICard = ({ title, value, change, icon, color, status }) => (
  <div className="card-workspace p-3 flex-1 min-w-[200px]">
    <div className="d-flex justify-content-between align-items-start mb-2">
      <div className={`p-2 rounded-lg bg-${color} bg-opacity-10 text-${color}`}>
        {React.createElement(icon, { size: 20 })}
      </div>
      {status === 'success' && change !== undefined && (
        <div className={`extra-small fw-bold ${change >= 0 ? 'text-success' : 'text-danger'}`}>
          {change >= 0 ? '+' : ''}{change}%
        </div>
      )}
    </div>
    <div className="h4 fw-bold mb-0">
      {status === 'loading' ? '—' : (status === 'success' ? value : '—')}
    </div>
    <div className="extra-small text-muted">{title}</div>
  </div>
);

const HeatmapCell = ({ val }) => {
  const opacity = Math.max(0.05, val / 100);
  return (
    <div 
      className="heatmap-cell" 
      style={{ backgroundColor: `rgba(37, 99, 235, ${opacity})` }}
      title={val !== undefined ? `${val}% Performance` : 'No data'}
    />
  );
};

// ── Main Page Component ──────────────────────────────────────────────────────

const Analytics = ({ activeBrand, campaigns = [] }) => {
  const [range, setRange] = useState('7d');
  const [platform, setPlatform] = useState('all');
  const [campaign, setCampaign] = useState('all');
  const [search, setSearch] = useState('');

  // Consolidated State Model
  const [overview, setOverview] = useState({ status: 'loading', data: null });
  const [timeseries, setTimeseries] = useState({ status: 'loading', data: [] });
  const [content, setContent] = useState({ status: 'loading', data: [] });

  const fetchAnalytics = useCallback(async () => {
    if (!activeBrand?.id) {
      setOverview({ status: 'empty', data: null });
      setTimeseries({ status: 'empty', data: [] });
      setContent({ status: 'empty', data: [] });
      return;
    }

    // 1. Reset to loading
    setOverview(prev => ({ ...prev, status: 'loading' }));
    setTimeseries(prev => ({ ...prev, status: 'loading' }));
    setContent(prev => ({ ...prev, status: 'loading' }));

    // 2. Parallel safe fetches
    const [ovRes, tsRes, contentRes] = await Promise.all([
      apiSafeFetch(`/api/customer/analytics/overview?brandId=${activeBrand.id}&range=${range}&platform=${platform}&campaign=${campaign}`),
      apiSafeFetch(`/api/customer/analytics/timeseries?brandId=${activeBrand.id}&range=${range}&platform=${platform}&campaign=${campaign}`),
      apiSafeFetch(`/api/customer/analytics/content?brandId=${activeBrand.id}&range=${range}&platform=${platform}&campaign=${campaign}`)
    ]);

    setOverview(ovRes);
    setTimeseries(tsRes);
    setContent(contentRes);
  }, [activeBrand, range, platform, campaign]);

  useEffect(() => {
    const timer = setTimeout(() => fetchAnalytics(), 0);
    return () => clearTimeout(timer);
  }, [fetchAnalytics]);

  const handleExportCSV = () => {
    if (content.status !== 'success' || !content.data.length) return;
    
    const headers = ["Title", "Platform", "Status", "Reach", "Engagement", "Clicks", "Date"];
    const rows = content.data.map(d => [
      `"${d.title}"`, d.platform, d.status, d.reach, d.engagement, d.clicks, d.date
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics_export_${range}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter logic for content table (local search)
  const safeContentData = Array.isArray(content.data) ? content.data : [];
  const filteredContent = safeContentData.filter(item => 
    item.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="analytics-container animate__animated animate__fadeIn p-2">
      {/* 1. Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-0">Performance Command</h4>
          <p className="extra-small text-muted mb-0">Deep exploration across {platform === 'all' ? 'all platforms' : platform}.</p>
        </div>
        <button 
          className="btn-pilot d-flex align-items-center gap-2" 
          onClick={handleExportCSV}
          disabled={content.status !== 'success'}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* 2. Filter Bar */}
      <div className="card-workspace p-2 mb-4 d-flex align-items-center justify-content-between gap-3 flex-wrap">
        <div className="d-flex gap-2">
          {['7d', '30d', '90d'].map(r => (
            <button 
              key={r} 
              className={`btn-grey btn-sm px-3 ${range === r ? 'active' : ''}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
        
        <div className="d-flex gap-3 align-items-center">
          <div className="d-flex align-items-center gap-2 border-end pe-3">
            <Filter size={14} className="text-muted" />
            <select className="form-select form-select-sm border-0 bg-transparent fw-bold text-main" value={platform} onChange={e => setPlatform(e.target.value)}>
              <option value="all">All Platforms</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>

          <div className="d-flex align-items-center gap-2 border-end pe-3">
            <TargetIcon size={14} className="text-muted" />
            <select className="form-select form-select-sm border-0 bg-transparent fw-bold text-main" value={campaign} onChange={e => setCampaign(e.target.value)}>
              <option value="all">All Campaigns</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="d-flex align-items-center gap-2 bg-light px-2 rounded-lg">
            <Search size={14} className="text-muted" />
            <input 
              type="text" 
              className="form-control form-control-sm border-0 bg-transparent" 
              placeholder="Search local records..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 3. KPI Quick View */}
      <div className="d-flex gap-3 mb-4 flex-wrap">
        <KPICard 
          title="Total Reach" 
          value={overview.data?.totalReach?.toLocaleString() || '0'} 
          change={overview.data?.reachChange} 
          icon={Users} 
          color="primary" 
          status={overview.status}
        />
        <KPICard 
          title="Engagement" 
          value={overview.data?.totalEngagement?.toLocaleString() || '0'} 
          change={overview.data?.engagementChange} 
          icon={TrendingUp} 
          color="success" 
          status={overview.status}
        />
        <KPICard 
          title="Link Clicks" 
          value={overview.data?.totalClicks?.toLocaleString() || '0'} 
          change={overview.data?.clicksChange} 
          icon={MousePointer2} 
          color="warning" 
          status={overview.status}
        />
        <KPICard 
          title="Conversions" 
          value={overview.data?.totalConversions?.toLocaleString() || '0'} 
          change={overview.data?.conversionChange} 
          icon={TargetIcon} 
          color="info" 
          status={overview.status}
        />
      </div>

      {/* 4. Insight Strip */}
      <div className="bg-primary bg-opacity-10 border border-primary border-opacity-20 p-3 rounded-lg mb-4 d-flex align-items-center gap-3">
        <div className="bg-primary p-2 rounded-circle text-white">
          <Info size={16} />
        </div>
        <div className="flex-1 d-flex gap-4">
          <div className="extra-small fw-medium">
            <span className="fw-bold text-primary">Intelligence:</span> {overview.data?.topInsight || 'Analyzing performance patterns...'}
          </div>
          <div className="extra-small fw-medium border-start ps-4">
            <span className="fw-bold text-primary">Opportunity:</span> {overview.data?.topOpportunity || 'Awaiting more data for deep insights.'}
          </div>
        </div>
      </div>

      {/* 5. Visual Analytics (Charts) */}
      <div className="row g-4 mb-4">
        {/* Main Performance Line Chart */}
        <div className="col-lg-8">
          <div className="card-workspace h-100 p-4">
            <h6 className="fw-bold mb-4 d-flex align-items-center gap-2">
              <BarChart3 size={18} className="text-primary" /> Performance Over Time
            </h6>
            <div style={{ height: '300px' }}>
              {timeseries.status === 'loading' ? <LoadingIndicator /> :
               timeseries.status === 'empty' ? <EmptyState /> :
               timeseries.status === 'error' ? <ErrorState onRetry={fetchAnalytics} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeseries.data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="top" align="right" iconType="circle" />
                    <Line type="monotone" dataKey="reach" stroke="#2563eb" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="engagement" stroke="#10b981" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Platform Comparison */}
        <div className="col-lg-4">
          <div className="card-workspace h-100 p-4">
            <h6 className="fw-bold mb-4">Platform Share</h6>
            <div style={{ height: '240px' }}>
              {overview.status === 'loading' ? <LoadingIndicator /> :
               overview.status === 'empty' || !overview.data?.platformShare ? <EmptyState /> :
               overview.status === 'error' ? <ErrorState onRetry={fetchAnalytics} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.data.platformShare} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" fontSize={10} axisLine={false} tickLine={false} width={70} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                      {overview.data.platformShare.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#2563eb'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Data Table (Full Width) */}
      <div className="card-workspace p-0 overflow-hidden mb-5">
        <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
          <h6 className="fw-bold mb-0">Detailed Content Metrics</h6>
          <div className="extra-small text-muted">Showing {filteredContent.length} records</div>
        </div>
        
        {content.status === 'loading' ? <LoadingIndicator /> :
         content.status === 'empty' ? <EmptyState /> :
         content.status === 'error' ? <ErrorState onRetry={fetchAnalytics} /> : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="px-4 py-3">Content Title</th>
                  <th>Platform</th>
                  <th>Status</th>
                  <th className="text-end">Reach</th>
                  <th className="text-end">Engagement</th>
                  <th className="text-end">Clicks</th>
                  <th className="px-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredContent.map((post, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 fw-medium">
                      <div className="d-flex align-items-center gap-3">
                        <LayoutGrid size={14} className="text-info" />
                        <span className="text-truncate" style={{ maxWidth: '300px' }}>{post.title}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge bg-light text-dark border`}>{post.platform}</span>
                    </td>
                    <td>
                      <span className={`indicator-dot ${post.status === 'published' ? 'dot-green' : 'dot-yellow'}`}></span>
                      <span className="extra-small fw-bold text-uppercase">{post.status}</span>
                    </td>
                    <td className="text-end fw-bold">{post.reach?.toLocaleString() || '0'}</td>
                    <td className="text-end">{post.engagement?.toLocaleString() || '0'}</td>
                    <td className="text-end">{post.clicks?.toLocaleString() || '0'}</td>
                    <td className="px-4 text-muted small">{post.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .analytics-container { max-width: 1400px; margin: 0 auto; }
        .form-select-sm { cursor: pointer; font-size: 0.85rem; }
        .btn-grey.active { background: var(--pilot-blue); color: white; border-color: var(--pilot-blue); }
        .indicator-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
        .dot-green { background: #10b981; }
        .dot-yellow { background: #f59e0b; }
        .table th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
        .table td { font-size: 0.85rem; vertical-align: middle; }
      `}</style>
    </div>
  );
};

export default Analytics;
