import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  Inbox, 
  Clock, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  LayoutGrid, 
  Activity, 
  Zap,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  ArrowLeft,
  Box
} from "lucide-react";
import WorkspaceCard from "../components/shared/WorkspaceCard";
import PilotButton from "../components/shared/PilotButton";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest } from "../lib/api/client";
import SchedulerWeekGrid from "../components/specialized/SchedulerWeekGrid";
import SchedulerMonthView from "../components/specialized/SchedulerMonthView";
import PostCard from "../components/specialized/PostCard";
import TimePickerModal from "../components/specialized/TimePickerModal";

const STATUS_COLORS = {
  draft: 'var(--text-muted)',
  approval: 'var(--status-warning)',
  approved: 'var(--pilot-blue)',
  scheduled: '#8b5cf6', // Keeping specific status color but will move to variable if needed
  published: 'var(--status-success)'
};

const CalendarSchedule = ({ activeBrand, onJobClick, listVersion }) => {
  const { token } = useAuth();
  
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState('calendar'); // calendar, queue
  const [viewMode, setViewMode] = useState('week'); // week, month
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(today.setDate(diff));
  });
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  // Data
  const [loading, setLoading] = useState(false);
  const [scheduledJobs, setScheduledJobs] = useState([]);
  const [allDrafts, setAllDrafts] = useState([]);
  
  // Modal State
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pendingDrop, setPendingDrop] = useState(null);

  const fetchContent = useCallback(async () => {
    if (!token || !activeBrand?.id) return;
    setLoading(true);
    try {
      const [draftsRes, schedRes] = await Promise.all([
        apiRequest("/api/customer/content/social/drafts"),
        apiRequest("/api/customer/content/social/scheduled")
      ]);
      setAllDrafts(draftsRes.data || []);
      setScheduledJobs(schedRes.data || []);
    } catch (err) {
      console.error("Scheduler fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, [token, activeBrand?.id]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent, listVersion]);

  // Derived Data
  const queueItems = useMemo(() => 
    allDrafts.filter(d => d.status === 'approved' && !scheduledJobs.some(j => j.id === d.id)),
  [allDrafts, scheduledJobs]);

  const activityHistory = useMemo(() => 
    allDrafts.filter(d => ['draft', 'approval', 'published'].includes(d.status))
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || b.created_at)),
  [allDrafts]);

  const upcomingList = useMemo(() => 
    [...scheduledJobs].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)),
  [scheduledJobs]);

  // Handlers
  const handleApprove = async (itemId) => {
    try {
      await apiRequest(`/api/customer/content/${itemId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' })
      });
      await fetchContent();
    } catch (err) {
      alert("Approve failed: " + err.message);
    }
  };

  const handleRequestChanges = async (itemId) => {
    const comment = window.prompt("Reason for requesting changes (optional):");
    try {
      await apiRequest(`/api/customer/content/${itemId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'draft', comment })
      });
      await fetchContent();
    } catch (err) {
      alert("Request changes failed: " + err.message);
    }
  };


  // Navigation handlers
  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentWeekStart(prev => {
        const next = new Date(prev);
        next.setDate(next.getDate() + 7);
        return next;
      });
    } else {
      setCurrentMonth(prev => {
        const next = new Date(prev);
        next.setMonth(next.getMonth() + 1);
        return next;
      });
    }
  };

  const handlePrev = () => {
    if (viewMode === 'week') {
      setCurrentWeekStart(prev => {
        const p = new Date(prev);
        p.setDate(p.getDate() - 7);
        return p;
      });
    } else {
      setCurrentMonth(prev => {
        const p = new Date(prev);
        p.setMonth(p.getMonth() - 1);
        return p;
      });
    }
  };

  const handleDropToGrid = (item, date) => {
    // 1. Status Validation (Strict)
    if (item.status !== 'approved' && item.status !== 'scheduled') {
      alert("Only approved content can be scheduled");
      return;
    }
    
    setPendingDrop({ item, date });
    setTimePickerOpen(true);
  };

  const handleConfirmSchedule = async (time) => {
    if (!pendingDrop) return;
    const { item, date } = pendingDrop;
    
    // Construct final date string
    const [hours, minutes] = time.split(':');
    const finalDate = new Date(date);
    finalDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    try {
      if (item.jobs && item.jobs.length > 0) {
        // RESCHEDULE: Update existing jobs
        const promises = item.jobs.map(job => 
          apiRequest(`/api/customer/schedule/${job.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              scheduled_at: finalDate.toISOString()
            })
          })
        );
        await Promise.all(promises);
      } else {
        // NEW SCHEDULE: Create separate jobs per platform
        const platforms = item.platforms || (item.variants ? Object.keys(item.variants) : ['facebook']);
        const promises = platforms.map(p => 
          apiRequest("/api/customer/schedule", {
            method: 'POST',
            body: JSON.stringify({
              content_type: 'social',
              content_id: item.id,
              platform: p,
              scheduled_at: finalDate.toISOString()
            })
          })
        );
        await Promise.all(promises);
      }
      
      await fetchContent();
    } catch (err) {
      alert("Action failed: " + err.message);
    } finally {
      setPendingDrop(null);
      setTimePickerOpen(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'calendar':
        return (
          <div className="calendar-tab-view slide-in">
             {viewMode === 'week' ? (
                <SchedulerWeekGrid 
                  weekStart={currentWeekStart} 
                  scheduledItems={scheduledJobs} 
                  onDrop={handleDropToGrid}
                  onCardClick={onJobClick}
                  onSlotClick={(date) => {
                    // Open New Post with prefilled date
                    props.onScheduleNew?.(date);
                  }}
                />
             ) : (
                <SchedulerMonthView 
                  currentMonth={currentMonth}
                  scheduledItems={scheduledJobs}
                  onCardClick={onJobClick}
                />
             )}
             
             {/* FOOTER: Upcoming Posts List */}
             <div className="card-workspace mt-4">
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
                   <Clock className="text-muted" size={16} />
                   Upcoming Execution Queue
                </h6>
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>Platform</th>
                        <th>Content</th>
                        <th>Deployment Window</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingList.length === 0 ? (
                        <tr><td colSpan="4" className="text-center py-4 text-muted">No scheduled jobs for execution.</td></tr>
                      ) : upcomingList.map(job => (
                        <tr key={`${job.id}_${job.scheduled_at}`}>
                          <td>
                             <div className="d-flex gap-1">
                               {job.platforms?.map(p => <span key={p} className="badge bg-light text-muted text-uppercase" style={{ fontSize: '0.65rem' }}>{p}</span>)}
                             </div>
                          </td>
                          <td className="fw-bold" style={{ maxWidth: '300px' }}>
                             <div className="text-truncate" style={{ fontSize: '0.85rem' }}>{job.content}</div>
                          </td>
                          <td className="text-muted" style={{ fontSize: '0.75rem' }}>{new Date(job.scheduled_at).toLocaleString()}</td>
                          <td>
                             <span className="badge" style={{ background: STATUS_COLORS[job.status] + '15', color: STATUS_COLORS[job.status], textTransform: 'uppercase', fontWeight: 800, fontSize: '0.65rem' }}>
                                ● {job.status}
                             </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>
        );
      
      case 'queue':
        return (
          <div className="queue-tab-view slide-in">
            {/* Awaiting Approval */}
            {(() => {
              const awaitingApproval = allDrafts.filter(d => d.status === 'approval');
              if (awaitingApproval.length === 0) return null;
              return (
                <div style={{ marginBottom: '40px', background: '#fffbeb', borderRadius: '20px', padding: '28px', border: '1px solid #fde68a' }}>
                  <h6 style={{ fontWeight: 900, marginBottom: '20px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={18} /> Awaiting Approval ({awaitingApproval.length})
                  </h6>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {awaitingApproval.map(item => (
                      <div key={item.id} style={{ background: '#fff', borderRadius: '14px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', border: '1px solid #fde68a' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.title || (item.content || '').substring(0, 60)}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            Submitted {new Date(item.updated_at || item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                          <button
                            className="btn btn-success btn-sm rounded-3 fw-bold"
                            onClick={() => handleApprove(item.id)}
                          >✓ Approve</button>
                          <button
                            className="btn btn-outline-danger btn-sm rounded-3 fw-bold"
                            onClick={() => handleRequestChanges(item.id)}
                          >↩ Request Changes</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Approved Ready-to-Schedule Queue */}
            <div style={{ background: '#f8fafc', padding: '32px', borderRadius: '24px', minHeight: '300px' }}>
               <h5 style={{ fontWeight: 900, marginBottom: '12px' }}>Ready to Schedule</h5>
               <p style={{ color: '#64748b', marginBottom: '32px' }}>Only approved content appears here. Drag items to the Calendar to schedule.</p>
               
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                 {queueItems.length === 0 ? (
                   <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 0', border: '2px dashed #e2e8f0', borderRadius: '20px' }}>
                      <Inbox size={48} className="mb-3 text-muted" style={{ opacity: 0.3 }} />
                      <div className="fw-bold text-muted">No approved content ready to schedule.</div>
                      <div className="small text-muted mt-2">Approve items above to populate this queue.</div>
                   </div>
                 ) : queueItems.map(item => (
                   <PostCard 
                     key={item.id} 
                     item={item} 
                     onDragStart={(e, i) => {
                       // Only approved content draggable
                       if (i.status !== 'approved') return;
                       e.dataTransfer.setData('post-task', JSON.stringify(i));
                       setActiveTab('calendar');
                     }}
                     onClick={onJobClick}
                   />
                 ))}
               </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const navItemStyle = (tab) => ({
    padding: '8px 20px',
    borderRadius: 'var(--radius-md)',
    background: activeTab === tab ? 'var(--surface-primary)' : 'transparent',
    color: activeTab === tab ? 'var(--text-main)' : 'var(--text-muted)',
    fontWeight: 700,
    fontSize: '0.85rem',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: activeTab === tab ? 'var(--card-shadow)' : 'none',
    transition: 'all 0.2s',
    cursor: 'pointer'
  });

  const weekRange = useMemo(() => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    return `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }, [currentWeekStart]);

  return (
    <>
      <div className="scheduler-container">
        {/* Header controls */}
        <div className="scheduler-header">
          <div>
             <h2 className="scheduler-title">Content Schedule</h2>
             <div className="d-flex align-items-center gap-3 mt-2">
                <div className="d-flex background-secondary rounded-pill border p-1" style={{ background: 'var(--surface-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <button onClick={handlePrev} className="btn btn-link p-1 text-muted"><ChevronLeft size={16} /></button>
                  <div className="align-self-center px-2 fw-bold text-main" style={{ fontSize: '0.85rem', minWidth: '140px', textAlign: 'center' }}>
                     {viewMode === 'week' ? weekRange : currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                  <button onClick={handleNext} className="btn btn-link p-1 text-muted"><ChevronRight size={16} /></button>
                </div>
                <div className="text-muted" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                   <CheckCircle2 size={12} className="text-success" /> All systems operational
                </div>
             </div>
          </div>
          
          <div className="d-flex gap-2 align-items-center">
             <button className="btn btn-light rounded-pill p-2" onClick={fetchContent} style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)' }}>
                <RefreshCw size={16} className={loading ? 'spin' : ''} />
             </button>
             <PilotButton type="primary" icon={Plus} onClick={() => setTimePickerOpen(true)}>Schedule Post</PilotButton>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="scheduler-nav-bar">
             <button onClick={() => setActiveTab('calendar')} className={`scheduler-nav-btn ${activeTab === 'calendar' ? 'active' : ''}`}><CalendarIcon size={16} /> Calendar</button>
             <button onClick={() => setActiveTab('queue')} className={`scheduler-nav-btn ${activeTab === 'queue' ? 'active' : ''}`}><Inbox size={16} /> Queue</button>
          </div>

          {activeTab === 'calendar' && (
            <div className="scheduler-nav-bar">
               <button 
                 onClick={() => setViewMode('week')} 
                 className={`scheduler-nav-btn ${viewMode === 'week' ? 'active' : ''}`}
                 style={{ fontSize: '0.7rem', padding: '4px 12px' }}
               >WEEK</button>
               <button 
                 onClick={() => setViewMode('month')} 
                 className={`scheduler-nav-btn ${viewMode === 'month' ? 'active' : ''}`}
                 style={{ fontSize: '0.7rem', padding: '4px 12px' }}
               >MONTH</button>
            </div>
          )}
        </div>

        {/* Legend */}
        {activeTab === 'calendar' && (
          <div className="d-flex gap-4 mb-3" style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
             {Object.entries(STATUS_COLORS).map(([s, c]) => (
               <span key={s} className="d-flex align-items-center gap-1">
                 <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c }} /> {s}
               </span>
             ))}
          </div>
        )}

        {/* Tab Contents */}
        <div className="tab-container flex-grow-1 overflow-auto">
          {loading && <div style={{ textAlign: 'center', padding: '100px 0', opacity: 0.5 }}><RefreshCw className="spin me-2" /> Loading mission data...</div>}
          {!loading && renderTabContent()}
        </div>
      </div>

      <TimePickerModal 
        isOpen={timePickerOpen} 
        onClose={() => setTimePickerOpen(false)}
        onConfirm={handleConfirmSchedule}
      />

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .slide-in { animation: slideIn 0.3s ease-out; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
};

export default CalendarSchedule;
