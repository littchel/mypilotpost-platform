import React, { useState } from "react";
import { useApi } from "../lib/api/hooks";
import { apiRequest } from "../lib/api/client";
import { UserPlus, Shield, User, Trash2, Mail } from "lucide-react";

const Teams = ({ brandId }) => {
  const [listVersion, setListVersion] = useState(0);
  const { data: teamData, loading: teamLoading } = useApi(brandId ? "/api/customer/teams/members" : null, [brandId, listVersion]);
  const { data: inviteData, loading: inviteLoading } = useApi(brandId ? "/api/customer/teams/invites" : null, [brandId, listVersion]);
  
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("team");
  const [isInviting, setIsInviting] = useState(false);

  const members = teamData?.data || [];
  const invites = inviteData?.data || [];

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setIsInviting(true);
    try {
      await apiRequest("/api/customer/teams/invites", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });
      setInviteEmail("");
      setListVersion(v => v + 1);
      alert("Invite sent successfully!");
    } catch (err) {
      alert("Failed to send invite: " + err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    try {
      await apiRequest(`/api/customer/teams/members/${userId}`, { method: "DELETE" });
      setListVersion(v => v + 1);
    } catch (err) {
      alert("Failed to remove member: " + err.message);
    }
  };

  return (
    <div className="container-fluid py-4 animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-main mb-1">Team & Clients</h2>
          <p className="text-muted small">Manage who has access to this brand's workspace.</p>
        </div>
      </div>

      <div className="row g-4">
        {/* Invite Form */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-4">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <UserPlus size={20} className="text-pilot" />
              Invite Member
            </h5>
            <form onSubmit={handleInvite}>
              <div className="mb-3">
                <label className="form-label extra-small fw-bold text-muted uppercase">Email Address</label>
                <input 
                  type="email" 
                  className="form-control input-pill" 
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="form-label extra-small fw-bold text-muted uppercase">Workspace Role</label>
                <select 
                  className="form-select input-pill"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="team">Team Member (Full Edit)</option>
                  <option value="client">Client (Read & Approve)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
                <div className="extra-small text-muted mt-2 ps-2">
                  {inviteRole === 'client' ? 'Clients can only view and approve content.' : 
                   inviteRole === 'team' ? 'Team members can create and schedule content.' : 
                   'Admins can manage members and billing.'}
                </div>
              </div>
              <button 
                type="submit" 
                className="btn btn-pilot w-100 rounded-pill fw-bold py-2 shadow-sm"
                disabled={isInviting}
              >
                {isInviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </form>
          </div>
        </div>

        {/* Member List */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="p-4 border-bottom bg-white">
              <h5 className="fw-bold mb-0">Active Members</h5>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="extra-small fw-bold text-muted uppercase ps-4 py-3">Member</th>
                    <th className="extra-small fw-bold text-muted uppercase py-3">Role</th>
                    <th className="extra-small fw-bold text-muted uppercase py-3">Joined</th>
                    <th className="extra-small fw-bold text-muted uppercase py-3 pe-4 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamLoading ? (
                    <tr><td colSpan="4" className="text-center py-5 text-muted">Loading team...</td></tr>
                  ) : members.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-5 text-muted">No members yet</td></tr>
                  ) : members.map(m => (
                    <tr key={m.id} className="align-middle">
                      <td className="ps-4 py-3">
                        <div className="d-flex align-items-center gap-3">
                          <div className="p-2 bg-pilot-light text-pilot rounded-circle">
                            <User size={16} />
                          </div>
                          <div>
                            <div className="fw-bold small text-main">{m.email}</div>
                            <div className="extra-small text-muted">{m.user_id === brandId ? 'Brand Owner' : 'Member'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge rounded-pill extra-small ${
                          m.role === 'admin' ? 'bg-danger bg-opacity-10 text-danger' : 
                          m.role === 'client' ? 'bg-info bg-opacity-10 text-info' : 
                          'bg-primary bg-opacity-10 text-primary'
                        }`}>
                          {m.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="small text-muted">
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                      <td className="pe-4 text-end">
                        <button 
                          className="btn btn-link text-danger p-0 border-0" 
                          onClick={() => handleRemoveMember(m.user_id)}
                          title="Remove Member"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Invites */}
          {invites.length > 0 && (
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mt-4 animate__animated animate__fadeInUp">
              <div className="p-4 border-bottom bg-white d-flex justify-content-between align-items-center">
                <h5 className="fw-bold mb-0">Pending Invitations</h5>
                <span className="badge bg-warning bg-opacity-10 text-warning rounded-pill extra-small fw-bold">
                  {invites.length} PENDING
                </span>
              </div>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <tbody>
                    {invites.map(inv => (
                      <tr key={inv.id} className="align-middle border-bottom">
                        <td className="ps-4 py-3">
                          <div className="d-flex align-items-center gap-3">
                            <div className="p-2 bg-light text-muted rounded-circle">
                              <Mail size={16} />
                            </div>
                            <div>
                              <div className="fw-bold small text-main">{inv.email}</div>
                              <div className="extra-small text-muted">Expires in 7 days</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge border text-muted rounded-pill extra-small">
                            {inv.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="pe-4 text-end">
                          <button className="btn btn-outline-secondary btn-sm rounded-pill extra-small fw-bold px-3">
                            Resend
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Teams;
