import React from 'react';
import PostCard from './PostCard';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SchedulerWeekGrid = ({ weekStart, scheduledItems, onDrop, onCardClick, onSlotClick }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate the dates for the 7 columns based on Monday weekStart
  const columns = DAYS.map((day, idx) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + idx);
    d.setHours(0, 0, 0, 0);
    return {
      name: day,
      date: d,
      isToday: d.getTime() === today.getTime(),
      formatted: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    };
  });

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleInternalDrop = (e, columnDate) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('post-task');
    if (!dataStr) return;
    
    try {
      const item = JSON.parse(dataStr);
      onDrop(item, columnDate);
    } catch (err) {
      console.error("Drop failed", err);
    }
  };

  return (
    <>
      <div className="calendar-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {columns.map((col, idx) => {
          const dayItems = scheduledItems.filter(item => {
            const itemDate = new Date(item.scheduled_at);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate.getTime() === col.date.getTime();
          }).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

          return (
            <div 
              key={idx}
              onDragOver={handleDragOver}
              onDrop={(e) => handleInternalDrop(e, col.date)}
              onClick={(e) => {
                if (e.target === e.currentTarget) onSlotClick?.(col.date);
              }}
              className={`calendar-col ${col.isToday ? 'is-today' : ''}`}
            >
              {/* Header */}
              <div className="calendar-col-header">
                 <div className="calendar-day-name">
                   {col.name}
                 </div>
                 <div className="calendar-day-val">
                   {col.formatted}
                 </div>
              </div>

              {/* List */}
              <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                maxHeight: '550px',
                paddingRight: '4px'
              }}>
                {dayItems.length === 0 ? (
                  <div className="text-center mt-5 opacity-25 text-muted fw-bold extra-small text-uppercase" style={{ pointerEvents: 'none' }}>
                    No posts scheduled
                  </div>
                ) : (
                  dayItems.map(item => (
                    <PostCard 
                      key={`${item.id}_${item.scheduled_at}`}
                      item={item} 
                      onDragStart={(e, i) => {
                        e.dataTransfer.setData('post-task', JSON.stringify(i));
                      }}
                      onClick={onCardClick}
                    />
                  ))
                )}
              </div>

              {/* Quick Add (Bottom) */}
              <button
                className="quick-add-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSlotClick?.(col.date);
                }}
                style={{
                  marginTop: 'auto',
                  border: '1px dashed var(--border-subtle)',
                  background: 'transparent',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  transition: 'all 0.2s'
                }}
              >
                + Quick Post
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        .quick-add-btn:hover {
          background: var(--surface-secondary);
          border-color: var(--pilot-blue);
          color: var(--pilot-blue);
        }
      `}</style>
    </>
  );
};

export default SchedulerWeekGrid;
