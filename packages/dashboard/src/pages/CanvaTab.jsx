import React from "react";

/**
 * CanvaTab - FINAL LOCK REBUILD
 * 1:1 Parity with index.html.
 */
export default function CanvaTab() {
  const connectCanva = () => {
    alert("Canva connection initiated.");
  };

  return (
    <div id="tab-canva">
      <div className="card-workspace text-center min-h-400">
        <div className="d-flex flex-column align-items-center justify-content-center py-5">
          <i className="fas fa-paint-brush text-muted mb-3 fa-3x"></i>
          <h4 className="fw-bold mb-2">Canva Design Studio</h4>
          <p className="text-muted mb-4 max-w-400 mx-auto">
            Connect your Canva account to create stunning visuals directly within myPilotPost.
          </p>
          <button className="btn-pilot mb-4" onClick={connectCanva}>
            <i className="fas fa-plug me-2"></i> Connect Canva
          </button>
          
          <div className="grid-2x2 w-100 mt-4">
            <div className="card-workspace text-center mb-0">
              <i className="fas fa-history text-primary mb-2"></i>
              <h6 className="fw-bold extra-small">Recent Designs</h6>
              <p className="extra-small text-muted mb-0">Access recent creations</p>
            </div>
            <div className="card-workspace text-center mb-0">
              <i className="fas fa-th-large text-primary mb-2"></i>
              <h6 className="fw-bold extra-small">Templates</h6>
              <p className="extra-small text-muted mb-0">Browse brand templates</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
