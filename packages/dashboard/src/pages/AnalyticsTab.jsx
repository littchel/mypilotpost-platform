import React from "react";

/**
 * AnalyticsTab - FINAL LOCK REBUILD
 * 1:1 Parity with index.html. UI ONLY.
 */
export default function AnalyticsTab() {
  return (
    <div id="tab-analytics">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">Performance Analytics</h5>
        <div className="d-flex gap-1">
          <button className="btn-grey btn-sm active">7d</button>
          <button className="btn-grey btn-sm">30d</button>
          <button className="btn-grey btn-sm">Custom</button>
        </div>
      </div>

      <div className="grid-2x2">
        <div className="card-workspace">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div className="extra-small text-muted mb-1">Total Impressions</div>
              <div className="h4 fw-bold mb-0">1,248</div>
              <div className="extra-small temp-success">+12.4%</div>
            </div>
            <i className="fas fa-eye fa-2x text-primary opacity-50"></i>
          </div>
        </div>
        <div className="card-workspace">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div className="extra-small text-muted mb-1">Total Engagements</div>
              <div className="h4 fw-bold mb-0">342</div>
              <div className="extra-small temp-success">+8.2%</div>
            </div>
            <i className="fas fa-heart fa-2x text-primary opacity-50"></i>
          </div>
        </div>
        <div className="card-workspace">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div className="extra-small text-muted mb-1">Engagement Rate</div>
              <div className="h4 fw-bold mb-0">4.2%</div>
              <div className="extra-small temp-success">+0.8%</div>
            </div>
            <i className="fas fa-chart-line fa-2x text-primary opacity-50"></i>
          </div>
        </div>
        <div className="card-workspace">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div className="extra-small text-muted mb-1">Link Clicks</div>
              <div className="h4 fw-bold mb-0">89</div>
              <div className="extra-small text-muted">No change</div>
            </div>
            <i className="fas fa-mouse-pointer fa-2x text-primary opacity-50"></i>
          </div>
        </div>
      </div>

      <div className="card-workspace">
        <h6 className="fw-bold mb-2">Engagement Over Time</h6>
        <div className="d-flex align-items-center justify-content-center bg-light rounded min-h-200 text-muted">
          <div className="text-center">
            <i className="fas fa-chart-line fa-2x mb-1"></i>
            <p className="mb-0">Engagement Chart</p>
            <p className="extra-small">Data visualization</p>
          </div>
        </div>
      </div>
    </div>
  );
}
