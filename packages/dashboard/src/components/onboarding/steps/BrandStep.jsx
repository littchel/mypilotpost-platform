import React, { useState } from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useBrand } from '../../../contexts/BrandContext';
import IndustryAutoSuggest from '../../shared/IndustryAutoSuggest';

const BrandStep = ({ isReview = false }) => {
  const { data, nextStep } = useOnboarding();
  const { createBrand, brands } = useBrand();
  
  const [formData, setFormData] = useState({
    name: data.name || data.brandName || "",
    description: data.description || "",
    industry: data.industry || "",
    logo: data.logo || "",
    tone: data.tone || "professional",
    country: data.country || "ZW",
    language: data.language || "en",
    keywords: data.keywords || []
  });

  const audit = data.audit;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      // Skip create if brand already exists — avoids token refresh race condition
      if (brands && brands.length > 0) {
        await nextStep({ ...formData, brandName: formData.name, brandId: brands[0].id });
        return;
      }

      const res = await createBrand(formData);
      if (res.success) {
        // nextStep() advances by 1 from current step — correct for both smart (4→5) and manual (3→4)
        await nextStep({ ...formData, brandName: formData.name, brandId: res.brand_id });
      } else {
        setError(res.error || "Failed to create brand. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-card">
      <h2 className="fw-bold mb-2">Review your Brand Details</h2>
      <p className="text-muted small mb-4">
        Ensure your brand structure is accurate before we initialize your digital footprint.
      </p>

      {/* 📊 AGENCY-GRADE AUDIT SNAPSHOT */}
      {audit && isReview && (
        <div className="audit-snapshot-container mb-4">
          <div className="audit-header d-flex justify-content-between align-items-center mb-3">
             <div className="d-flex align-items-center gap-2">
                <i className="fas fa-shield-alt text-primary"></i>
                <span className="fw-800 small tracking-tighter uppercase">Agency Strategy Audit</span>
             </div>
             <div className="audit-score-pill">
                SCORE: {audit.score}/100
             </div>
          </div>
          
          <div className="audit-body p-3 bg-white border rounded-4 shadow-sm mb-3">
             <h6 className="fw-bold x-small text-muted text-uppercase mb-2">Key Issues Identified</h6>
             <ul className="list-unstyled mb-3">
                {audit.snapshot.keyIssues.map((issue, i) => (
                  <li key={i} className="d-flex gap-2 x-small mb-2 align-items-start">
                     <i className="fas fa-exclamation-circle text-warning mt-1"></i>
                     <span>{issue}</span>
                  </li>
                ))}
             </ul>

             <h6 className="fw-bold x-small text-muted text-uppercase mb-2">Primary Opportunities</h6>
             <div className="d-grid gap-2">
                {audit.snapshot.opportunities.map((opp, i) => (
                  <div key={i} className="opportunity-mini-card p-2 rounded-3 border bg-light d-flex justify-content-between align-items-center">
                     <div>
                        <div className="fw-bold x-small">{opp.label}</div>
                        <div className="text-muted xx-small">{opp.desc}</div>
                     </div>
                     <div className="text-success fw-bold x-small">{opp.impact}</div>
                  </div>
                ))}
             </div>
          </div>

          <div className="locked-strategy-banner p-3 rounded-4 border-2 border-dashed d-flex flex-column align-items-center text-center">
             <i className="fas fa-lock text-muted mb-2"></i>
             <div className="fw-bold small mb-1">Full Strategy Report Locked</div>
             <p className="xx-small text-muted mb-2">Market positioning, competitor benchmarks, and revenue projections will be available on your dashboard.</p>
             <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 xx-small py-1" disabled>
                Unlock on Dashboard
             </button>
          </div>
        </div>
      )}

      {formData.logo && (
        <div className="text-center mb-4">
          <div className="logo-preview-container mx-auto">
            <img src={formData.logo} alt="Brand Logo" className="logo-preview" />
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label small fw-bold text-uppercase">Brand Name</label>
          <input 
            type="text" 
            name="name"
            className="form-control border-2" 
            placeholder="e.g. Acme Aviation"
            value={formData.name}
            onChange={handleChange}
            disabled={loading}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label small fw-bold text-uppercase">{isReview ? "Detected Industry" : "Industry"}</label>
          <IndustryAutoSuggest
            className="form-control border-2"
            value={formData.industry}
            onChange={val => setFormData(prev => ({ ...prev, industry: val }))}
            disabled={loading}
            required={true}
          />
        </div>

        <div className="mb-4">
          <label className="form-label small fw-bold text-uppercase">Description</label>
          <textarea 
            name="description"
            className="form-control border-2" 
            rows="2"
            placeholder="What does your brand do?"
            value={formData.description}
            onChange={handleChange}
            disabled={loading}
          />
        </div>

        {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

        <button 
          type="submit" 
          className="btn btn-pilot-ob w-100 d-flex align-items-center justify-content-center gap-2"
          disabled={loading || !formData.name.trim()}
        >
          {loading ? (
            <span className="spinner-border spinner-border-sm" role="status"></span>
          ) : (
            <>Continue <i className="fas fa-arrow-right"></i></>
          )}
        </button>
      </form>

      <style dangerouslySetInnerHTML={{ __html: `
        .audit-snapshot-container {
            background: #f1f5f9;
            padding: 16px;
            border-radius: 20px;
        }
        .audit-score-pill {
            background: #0f172a;
            color: white;
            font-size: 10px;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 20px;
        }
        .x-small { font-size: 0.75rem; }
        .xx-small { font-size: 0.65rem; }
        .fw-800 { font-weight: 800; }
        .tracking-tighter { letter-spacing: -0.02em; }
        .logo-preview-container {
            width: 60px;
            height: 60px;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .logo-preview {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
      `}} />
    </div>
  );
};

export default BrandStep;
