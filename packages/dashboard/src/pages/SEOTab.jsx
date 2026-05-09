import React from "react";

/**
 * SEOTab - FINAL LOCK REBUILD
 * 1:1 Parity with index.html. UI ONLY.
 */
export default function SEOTab() {
  return (
    <div id="tab-seo">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">SEO Intelligence Center</h5>
      </div>

      <div className="grid-2x2">
        <div className="card-workspace text-center">
          <div className="h2 fw-bold mb-1 text-success">92</div>
          <div className="fw-bold mb-1 small">Audit Score</div>
          <div className="extra-small text-muted">Performance Overview</div>
        </div>
        <div className="card-workspace text-center">
          <div className="h2 fw-bold mb-1">4.2K</div>
          <div className="fw-bold mb-1 small">Organic Traffic</div>
          <div className="extra-small text-muted">Last 30 Days</div>
        </div>
        <div className="card-workspace text-center">
          <div className="h2 fw-bold mb-1">127</div>
          <div className="fw-bold mb-1 small">Backlinks</div>
          <div className="extra-small text-muted">Total</div>
        </div>
        <div className="card-workspace text-center">
          <div className="h2 fw-bold mb-1">85%</div>
          <div className="fw-bold mb-1 small">Core Web Vitals</div>
          <div className="extra-small text-muted">Performance</div>
        </div>
      </div>

      <div className="card-workspace">
        <h6 className="fw-bold mb-2">Top Keyword Opportunities</h6>
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th className="px-3">Keyword</th>
                <th>Position</th>
                <th>Volume</th>
                <th>Difficulty</th>
                <th className="text-end px-3">Opportunity</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 fw-bold text-main">SaaS Automation</td>
                <td>4</td>
                <td>2,400</td>
                <td><span className="badge badge-secondary">Medium</span></td>
                <td className="text-end px-3"><span className="temp-success">High</span></td>
              </tr>
              <tr>
                <td className="px-3 fw-bold text-main">Social Scheduler</td>
                <td>12</td>
                <td>5,800</td>
                <td><span className="badge badge-secondary">Hard</span></td>
                <td className="text-end px-3"><span className="text-warning">Medium</span></td>
              </tr>
              <tr>
                <td className="px-3 fw-bold text-main">Content AI</td>
                <td>8</td>
                <td>12,000</td>
                <td><span className="badge badge-secondary">Hard</span></td>
                <td className="text-end px-3"><span className="temp-success">High</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
