import React from "react";
import { useApi } from "../lib/api/hooks";
import { Trophy, Star, TrendingUp, Zap, Target, Award } from "lucide-react";

const Growth = ({ brandId, growth }) => {
  const { data: historyData } = useApi(brandId ? `/api/customer/growth/activity?brandId=${brandId}` : null, [brandId]);

  const profile = growth || { points: 0, level: 'Starter', streak_days: 0, progress_percentage: 0 };
  const history = historyData?.data || [];
  const _nextReward = growth?.next_reward || null;

  return (
    <div className="container-fluid py-4 animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-main mb-1">Loyalty & Growth</h2>
          <p className="text-muted small">Earn points by engaging with the platform and growing your brand.</p>
        </div>
        <div className="d-flex gap-2">
          <div className="bg-white px-3 py-2 rounded-pill shadow-sm border d-flex align-items-center gap-2">
            <Zap size={16} className="text-warning fill-warning" />
            <span className="fw-bold small text-main">{profile.streak_days} Day Streak</span>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Level & Points Card */}
        <div className="col-lg-12">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden position-relative" style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)' }}>
            <div className="card-body p-5 text-white position-relative" style={{ zIndex: 1 }}>
              <div className="row align-items-center">
                <div className="col-md-6">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="p-3 bg-white bg-opacity-20 rounded-4">
                      <Trophy size={40} />
                    </div>
                    <div>
                      <h4 className="fw-bold mb-0">{profile.level} Explorer</h4>
                      <div className="opacity-75 small">You're making great progress in your brand journey!</div>
                    </div>
                  </div>
                  <div className="mb-2 d-flex justify-content-between small fw-bold">
                    <span>Progress to Next Milestone</span>
                    <span>{profile.progress_percentage}%</span>
                  </div>
                  <div className="progress rounded-pill bg-white bg-opacity-20" style={{ height: '12px' }}>
                    <div 
                      className="progress-bar bg-white rounded-pill animate__animated animate__slideInLeft" 
                      role="progressbar" 
                      style={{ width: `${profile.progress_percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="col-md-6 text-md-end mt-4 mt-md-0">
                  <div className="display-4 fw-bold mb-0">{profile.points}</div>
                  <div className="opacity-75 uppercase extra-small tracking-wider fw-bold">Current Growth Points</div>
                </div>
              </div>
            </div>
            {/* Decorative background circles */}
            <div className="position-absolute top-0 end-0 p-5 opacity-10">
              <Star size={200} />
            </div>
          </div>
        </div>

        {/* Quest/Activity Cards */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 h-100">
            <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4 w-fit mb-3">
              <TrendingUp size={24} />
            </div>
            <h5 className="fw-bold mb-2">Social Consistency</h5>
            <p className="text-muted small mb-4">Post 3 times this week to earn a 500pt bonus and keep your streak alive.</p>
            <div className="mt-auto">
              <div className="d-flex justify-content-between small fw-bold mb-1">
                <span>Weekly Goal</span>
                <span>2/3</span>
              </div>
              <div className="progress rounded-pill" style={{ height: '6px' }}>
                <div className="progress-bar rounded-pill" style={{ width: '66%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 h-100">
            <div className="p-3 bg-success bg-opacity-10 text-success rounded-4 w-fit mb-3">
              <Target size={24} />
            </div>
            <h5 className="fw-bold mb-2">SEO Optimizer</h5>
            <p className="text-muted small mb-4">Resolve 5 high-priority SEO insights to boost your brand authority.</p>
            <div className="mt-auto">
              <div className="d-flex justify-content-between small fw-bold mb-1">
                <span>Progress</span>
                <span>3/5</span>
              </div>
              <div className="progress rounded-pill" style={{ height: '6px' }}>
                <div className="progress-bar bg-success rounded-pill" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 h-100">
            <div className="p-3 bg-warning bg-opacity-10 text-warning rounded-4 w-fit mb-3">
              <Award size={24} />
            </div>
            <h5 className="fw-bold mb-2">Brand Advocate</h5>
            <p className="text-muted small mb-4">Refer another brand and earn 2,500pts plus 20% off your next month.</p>
            <button className="btn btn-outline-warning w-100 rounded-pill fw-bold btn-sm mt-4">
              Get Invite Link
            </button>
          </div>
        </div>

        {/* Activity Log */}
        <div className="col-lg-12">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="p-4 border-bottom bg-white">
              <h5 className="fw-bold mb-0">Activity Log</h5>
            </div>
            <div className="list-group list-group-flush">
              {history.length === 0 ? (
                <div className="p-5 text-center text-muted small">No recent activity found.</div>
              ) : history.map(item => (
                <div key={item.id} className="list-group-item p-4 border-0 border-bottom">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex gap-3 align-items-center">
                      <div className="p-2 bg-light rounded-circle">
                        <Star size={16} className="text-primary" />
                      </div>
                      <div>
                        <div className="fw-bold text-main">{item.activity_type.replace(/_/g, ' ').toUpperCase()}</div>
                        <div className="extra-small text-muted">{new Date(item.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-success fw-bold">
                      +{item.points_earned} PTS
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Growth;
