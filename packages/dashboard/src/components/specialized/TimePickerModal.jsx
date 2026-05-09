import React, { useState } from 'react';

const TimePickerModal = ({ isOpen, onClose, onConfirm, initialTime = "09:00" }) => {
  const [time, setTime] = useState(initialTime);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(time);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(15,23,42,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#fff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 25px 70px rgba(0,0,0,0.3)',
        padding: '32px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
           <div style={{ 
             width: '56px', height: '56px', borderRadius: '16px', background: '#eff6ff', 
             display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
             color: '#3b82f6'
           }}>
             <i className="fas fa-clock" style={{ fontSize: '1.5rem' }} />
           </div>
           <h5 style={{ fontWeight: 900, color: '#0f172a', margin: 0, fontSize: '1.25rem' }}>Schedule Delivery Time</h5>
           <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '8px' }}>Select the precise hour for deployment.</p>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 20px',
              fontSize: '2rem',
              fontWeight: 900,
              textAlign: 'center',
              border: '2px solid #e2e8f0',
              borderRadius: '16px',
              color: '#1e293b',
              outline: 'none',
              background: '#f8fafc',
              transition: 'all 0.2s'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={onClose}
            style={{ 
              flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', 
              background: '#fff', color: '#64748b', fontWeight: 700 
            }}
          >Cancel</button>
          <button 
            onClick={handleConfirm}
            style={{ 
              flex: 2, padding: '14px', borderRadius: '14px', border: 'none', 
              background: '#3b82f6', color: '#fff', fontWeight: 900,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >Confirm Timing</button>
        </div>
      </div>
    </div>
  );
};

export default TimePickerModal;
