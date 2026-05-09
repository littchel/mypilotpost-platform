import React, { useState, useEffect } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from "recharts";
import WorkspaceCard from "../components/shared/WorkspaceCard";
import PilotButton from "../components/shared/PilotButton";
import { 
  Download, 
  TrendingUp, 
  BarChart3, 
  PieChart as PieIcon,
  Activity
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest } from "../lib/api/client";

const AnalyticsDashboard = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    trends: [],
    platforms: [],
    topContent: []
  });

  useEffect(() => {
    if (token) fetchAnalytics();
  }, [token]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetching multiple analytics views
      const [trendsResp, platformsResp, contentResp] = await Promise.all([
        apiRequest("/api/customer/analytics/trends"),
        apiRequest("/api/customer/analytics/platforms"),
        apiRequest("/api/customer/analytics/top-content")
      ]);

      setData({
        trends: trendsResp.trends || [],
        platforms: platformsResp.platforms || [],
        topContent: contentResp.top_content || []
      });
    } catch (e) {
      console.error("Failed to fetch analytics", e);
    }
    setLoading(false);
  };

  const COLORS = ['#2563eb', '#35C961', '#f59e0b', '#8b5cf6', '#ef4444'];

  return (
    <>
      <div className="analytics-dashboard">
        <header className="analytics-header">
          <div className="header-left">
            <h2>Brand Intelligence</h2>
            <p>Performance insights derived from your content and audience interactions.</p>
          </div>
          <div className="header-actions">
            <PilotButton type="outline" icon={Download}>Export Report</PilotButton>
          </div>
        </header>

        <div className="analytics-grid">
          <div className="grid-full">
            <WorkspaceCard title="Growth Trends (Reach & Engagement)">
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={data.trends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="reach" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="engagement" stroke="#35C961" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </WorkspaceCard>
          </div>

          <div className="grid-half">
            <WorkspaceCard title="Platform Distribution">
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={data.platforms}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.platforms.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </WorkspaceCard>
          </div>

          <div className="grid-half">
            <WorkspaceCard title="Top Performing Content">
              <div className="top-content-list">
                {data.topContent.map((item, i) => (
                  <div key={i} className="content-item">
                    <div className="content-rank">{i + 1}</div>
                    <div className="content-info">
                      <strong>{item.title || "Social Post"}</strong>
                      <span>{item.platform} • {item.reach} reach</span>
                    </div>
                    <div className="content-metric">
                      <TrendingUp size={14} />
                      <span>{item.engagement_rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </WorkspaceCard>
          </div>
        </div>
      </div>

      <style>{`
        .analytics-dashboard {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .analytics-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .analytics-header h2 {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-dark);
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .grid-full {
          grid-column: 1 / -1;
        }

        .top-content-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .content-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          background: var(--bg-body);
          border-radius: var(--radius-md);
        }

        .content-rank {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--border-subtle);
          width: 24px;
        }

        .content-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .content-info strong {
          font-size: 0.9rem;
          color: var(--text-dark);
        }

        .content-info span {
          font-size: 0.75rem;
          color: var(--text-gray);
        }

        .content-metric {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #35C961;
          font-weight: 700;
          font-size: 0.85rem;
        }
      `}</style>
    </>
  );
};

export default AnalyticsDashboard;
