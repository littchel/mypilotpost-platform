import React, { useMemo } from 'react';
import PostCard from './PostCard';

const SchedulerMonthView = ({ currentMonth, scheduledItems, onCardClick }) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the Monday of the first week
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startOffset);

    // Get the Sunday of the last week
    const endOffset = (7 - lastDay.getDay()) % 7;
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + endOffset);

    const days = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [year, month]);

  const _monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="scheduler-month-view slide-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
       <div className="calendar-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
         {/* Headers */}
         {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
           <div key={day} style={{ background: 'var(--surface-secondary)', padding: '12px', textAlign: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
             {day}
           </div>
         ))}

         {/* Grid */}
         {daysInMonth.map((date, idx) => {
           const isCurrentMonth = date.getMonth() === month;
           const isToday = date.toDateString() === new Date().toDateString();
           
           const dayItems = scheduledItems.filter(item => {
             const itemDate = new Date(item.scheduled_at);
             return itemDate.toDateString() === date.toDateString();
           }).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

           return (
             <div 
               key={idx}
               style={{
                 background: isToday ? 'var(--surface-background)' : (isCurrentMonth ? 'var(--surface-primary)' : 'var(--surface-secondary)'),
                 minHeight: '120px',
                 padding: '8px',
                 display: 'flex',
                 flexDirection: 'column',
                 opacity: isCurrentMonth ? 1 : 0.3,
                 border: isToday ? '1px solid var(--pilot-blue)' : 'none'
               }}
             >
               <div style={{ 
                 fontSize: '0.85rem', 
                 fontWeight: 700, 
                 color: isToday ? 'var(--pilot-blue)' : (isCurrentMonth ? 'var(--text-main)' : 'var(--text-muted)'),
                 marginBottom: '8px',
                 textAlign: 'right'
               }}>
                 {date.getDate()}
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
                 {dayItems.slice(0, 3).map(item => (
                   <PostCard 
                     key={`${item.id}_${item.scheduled_at}`}
                     item={item} 
                     isCompact={true}
                     onClick={onCardClick}
                   />
                 ))}
                 {dayItems.length > 3 && (
                   <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
                     + {dayItems.length - 3} more
                   </div>
                 )}
               </div>
             </div>
           );
         })}
       </div>
    </div>
  );
};

export default SchedulerMonthView;
