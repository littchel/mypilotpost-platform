import React, { useState } from "react";
import { X, Building2, Globe, Target, Smile } from "lucide-react";
import PilotButton from "../shared/PilotButton";
import { useBrand } from "../../contexts/BrandContext";

const BrandOnboardingModal = ({ isOpen, onClose }) => {
  const { createBrand, switchBrand } = useBrand();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    tone: "",
    goals: "",
    region: "Global",
    business_type: "Agency"
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await createBrand(formData);
    if (result.success) {
      await switchBrand(result.brand_id);
      onClose();
    } else {
      alert("Failed to create brand: " + result.error);
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Onboard New Brand</h2>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label><Building2 size={16} /> Brand Name</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. Acme Marketing"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label><Target size={16} /> Industry</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Technology"
                value={formData.industry}
                onChange={(e) => setFormData({...formData, industry: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label><Smile size={16} /> Brand Tone</label>
              <select 
                value={formData.tone}
                onChange={(e) => setFormData({...formData, tone: e.target.value})}
              >
                <option value="">Select Tone</option>
                <option value="Professional">Professional</option>
                <option value="Friendly">Friendly</option>
                <option value="Witty">Witty</option>
                <option value="Authoritative">Authoritative</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label><Globe size={16} /> Website URL (Optional)</label>
            <input 
              type="url" 
              placeholder="https://example.com"
              value={formData.website_url}
              onChange={(e) => setFormData({...formData, website_url: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Primary Goals</label>
            <textarea 
              placeholder="What do you want to achieve?"
              value={formData.goals}
              onChange={(e) => setFormData({...formData, goals: e.target.value})}
            />
          </div>

          <div className="modal-footer">
            <PilotButton type="outline" onClick={onClose}>Cancel</PilotButton>
            <PilotButton type="primary" disabled={loading}>
              {loading ? "Creating..." : "Launch Brand"}
            </PilotButton>
          </div>
        </form>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .modal-container {
          background: white;
          width: 500px;
          border-radius: var(--radius-lg);
          box-shadow: 0 20px 50px rgba(0,0,0,0.15);
          overflow: hidden;
        }

        .modal-header {
          padding: 24px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h2 {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-dark);
        }

        .close-btn {
          color: var(--text-gray);
          padding: 4px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .close-btn:hover {
          background: var(--bg-body);
        }

        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-dark);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-group input, 
        .form-group select, 
        .form-group textarea {
          padding: 10px 14px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          background: var(--bg-body);
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .form-group input:focus, 
        .form-group select:focus, 
        .form-group textarea:focus {
          border-color: var(--primary-blue);
        }

        .form-group textarea {
          min-height: 100px;
          resize: vertical;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 12px;
        }
      `}</style>
    </div>
  );
};

export default BrandOnboardingModal;
