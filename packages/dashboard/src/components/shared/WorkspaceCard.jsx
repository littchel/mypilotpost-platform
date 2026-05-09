import React from "react";

const WorkspaceCard = ({ title, children, footer, className = "" }) => {
  return (
    <>
      <div className={`workspace-card ${className}`}>
        {title && (
          <div className="card-header">
            <h3 className="card-title">{title}</h3>
          </div>
        )}
        <div className="card-content">
          {children}
        </div>
        {footer && (
          <div className="card-footer">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        .workspace-card {
          background: white;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          box-shadow: var(--card-shadow);
          overflow: hidden;
        }

        .card-header {
          padding: 1rem;
          border-bottom: 1px solid var(--border-subtle);
        }

        .card-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-dark);
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .card-content {
          padding: 1rem;
          flex: 1;
        }

        .card-footer {
          padding: 0.75rem 1rem;
          background: var(--surface-secondary);
          border-top: 1px solid var(--border-subtle);
        }
      `}</style>
    </>
  );
};

export default WorkspaceCard;
