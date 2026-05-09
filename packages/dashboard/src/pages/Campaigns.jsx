import React, { useState, useEffect } from "react";
import { apiRequest } from "../lib/api/client";
import { useAuth } from "../contexts/AuthContext";

/**
 * Campaigns - FINAL LOCK REBUILD
 * 1:1 Parity with index.html. Campaign flow integration.
 */
export default function Campaigns({ onCreateCampaign, onCreateContent }) {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchCampaigns();
    }
  }, [token]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const resp = await apiRequest("/api/customer/campaigns");
      setCampaigns(resp.data || []);
    } catch (e) {
      console.error("Failed to fetch campaigns", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="tab-campaign">
      <div className="d-flex justify-content-between mb-3 align-items-center">
        <h5 className="fw-bold mb-0">Campaign Command Center</h5>
        <button className="btn-pilot btn-sm" onClick={onCreateCampaign}>
          <i className="fas fa-plus me-1"></i> Create Campaign
        </button>
      </div>

      <div className="card-workspace p-0 overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="bg-light">
              <tr>
                <th className="px-3">Campaign Name</th>
                <th>Objective</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>Performance</th>
                <th className="text-end px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                    Loading campaigns...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    No active campaigns found. Create your first campaign to get started.
                  </td>
                </tr>
              ) : (
                campaigns.map(c => (
                  <tr key={c.id}>
                    <td className="px-3 fw-bold text-main">{c.name}</td>
                    <td>{c.objective}</td>
                    <td>
                      <span className={`badge ${c.status === 'Active' ? 'badge-success' : 'badge-secondary'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="text-muted small">{c.startDate || 'N/A'}</td>
                    <td><span className={(c.performance && c.performance.includes('+')) ? 'temp-success' : ''}>{c.performance || '--'}</span></td>
                    <td className="text-end px-3">
                      <button 
                        className="btn-pilot btn-sm me-1 extra-small" 
                        onClick={() => onCreateContent(c.id)}
                      >
                        Create Content
                      </button>
                      <button className="btn-grey btn-sm extra-small">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
