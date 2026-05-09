import React from "react";

const PilotButton = ({ 
  children, 
  onClick, 
  type = "primary", // primary, secondary, outline, danger
  size = "md", // sm, md, lg
  disabled = false,
  className = "",
  icon: Icon
}) => {
  return (
    <>
      <button 
        className={`pilot-btn btn-${type} btn-${size} ${className}`}
        onClick={onClick}
        disabled={disabled}
      >
        {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
        <span>{children}</span>
      </button>

      <style>{`
        .pilot-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: var(--radius-md);
          font-weight: 600;
          transition: all 0.2s;
          white-space: nowrap;
          border: none;
        }

        /* Types */
        .btn-primary {
          background: var(--pilot-blue);
          color: white;
        }
        .btn-primary:hover:not(:disabled) {
          background: var(--pilot-blue-hover);
        }

        .btn-secondary {
          background: var(--pilot-blue-light);
          color: var(--pilot-blue);
        }
        .btn-secondary:hover:not(:disabled) {
          background: var(--pilot-blue-light);
          opacity: 0.8;
        }

        .btn-outline {
          background: white;
          color: var(--text-gray);
          border: 1px solid var(--border-subtle);
        }
        .btn-outline:hover:not(:disabled) {
          background: var(--bg-body);
          border-color: var(--text-gray);
        }

        .btn-danger {
          background: #fee2e2;
          color: #ef4444;
        }
        .btn-danger:hover:not(:disabled) {
          background: #fecaca;
        }

        /* Sizes */
        .btn-sm {
          padding: 4px 12px;
          font-size: 0.75rem;
        }
        .btn-md {
          padding: 8px 20px;
          font-size: 0.85rem;
        }
        .btn-lg {
          padding: 12px 24px;
          font-size: 1rem;
        }

        .pilot-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
};

export default PilotButton;
