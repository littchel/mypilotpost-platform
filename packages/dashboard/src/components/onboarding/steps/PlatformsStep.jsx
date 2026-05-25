import React, { useState } from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';

const PlatformSVG = ({ id, size = 20, color }) => {
  const icons = {
    linkedin: (c = "#0A66C2") => <svg width={size} height={size} viewBox="0 0 24 24" fill={c}><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>,
    facebook: (c = "#1877F2") => <svg width={size} height={size} viewBox="0 0 24 24" fill={c}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    instagram: (c = "#E4405F") => <svg width={size} height={size} viewBox="0 0 24 24" fill={c}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4.162 4.162 0 110-8.324 4.162 4.162 0 010 8.324zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
    x: (c = "#000000") => <svg width={size} height={size} viewBox="0 0 24 24" fill={c}><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.294 19.497h2.039L6.486 3.24H4.298l13.309 17.41z"/></svg>,
    tiktok: (c = "#000000") => <svg width={size} height={size} viewBox="0 0 24 24" fill={c}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.58-1.01V12a8.66 8.66 0 0 1-8.66 8.66A8.66 8.66 0 0 1 1 12a8.66 8.66 0 0 1 8.66-8.66c.55 0 1.09.05 1.62.14V7.52a4.67 4.67 0 0 0-1.62-.28A4.66 4.66 0 0 0 5 12a4.66 4.66 0 0 0 4.66 4.66 4.66 4.66 0 0 0 4.66-4.66V0s-1.8.02-1.8.02z"/></svg>
  };
  const fn = icons[id];
  return fn ? fn(color) : null;
};

const PlatformsStep = () => {
  const { data, nextStep, signupSource } = useOnboarding();
  const isAuditPath = signupSource === 'brand_audit';

  const [selected, setSelected] = useState(data?.platforms || []);
  const [socialLinks, setSocialLinks] = useState({
    instagram: data?.socialLinks?.instagram || "",
    facebook: data?.socialLinks?.facebook || "",
    linkedin: data?.socialLinks?.linkedin || "",
    tiktok: data?.socialLinks?.tiktok || "",
    x: data?.socialLinks?.x || ""
  });
  const [error, setError] = useState("");

  // Platforms detected from audit intake form
  const auditDetectedPlatforms = isAuditPath && data?.platforms?.length > 0 ? data.platforms : [];

  const platforms = [
    { id: 'linkedin', name: 'LinkedIn' },
    { id: 'facebook', name: 'Facebook' },
    { id: 'instagram', name: 'Instagram' },
    { id: 'x', name: 'X / Twitter' },
    { id: 'tiktok', name: 'TikTok' }
  ];

  const togglePlatform = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    const hasSocial = Object.values(socialLinks).some(link => link && link.trim());
    const hasWebsite = data.websiteURL && data.websiteURL.trim();

    if (!hasWebsite && !hasSocial && !isAuditPath) {
      setError("Please provide either a website URL or at least one social media link to continue.");
      return;
    }

    nextStep({ platforms: selected, socialLinks });
  };

  return (
    <div className="onboarding-platforms">
      <h2 className="fw-bold mb-2 mt-4">
        {isAuditPath ? 'Confirm your platforms' : 'Social Presence'}
      </h2>
      <p className="text-muted mb-3">
        {isAuditPath
          ? 'We detected these from your audit. Add or remove any.'
          : 'Tell us where your brand lives.'}
      </p>

      {isAuditPath && auditDetectedPlatforms.length > 0 && (
        <div className="d-flex align-items-center gap-2 mb-3 px-3 py-2 rounded-3"
          style={{ background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '0.78rem' }}>
          <i className="fas fa-check-circle text-primary"></i>
          <span className="fw-bold text-primary">Detected from your audit — edit as needed</span>
        </div>
      )}

      <div className="row g-3 mb-4">
        {platforms.map(platform => {
          const isSelected = selected.includes(platform.id);
          const isDetected = auditDetectedPlatforms.includes(platform.id);
          return (
            <div key={platform.id} className="col-12 col-md-4">
              <div
                onClick={() => togglePlatform(platform.id)}
                className={`platform-card p-3 rounded-4 d-flex align-items-center gap-3 cursor-pointer border ${isSelected ? 'border-primary bg-light' : 'border-light'}`}
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                <PlatformSVG id={platform.id} size={22} color={isSelected ? '#2563eb' : '#94a3b8'} />
                <span className={`fw-bold small ${isSelected ? 'text-primary' : 'text-dark'}`}>
                  {platform.name}
                </span>
                {isAuditPath && isDetected && !isSelected && (
                  <span className="badge rounded-pill position-absolute"
                    style={{ top: -8, right: 8, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '0.6rem', fontWeight: 700 }}>
                    Detected
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="social-links-section mb-4">
        <h6 className="fw-bold mb-3">Profile URLs <span className="text-muted fw-normal small">(Recommended)</span></h6>
        <div className="row g-2">
          {Object.keys(socialLinks).map(plat => (
            <div key={plat} className="col-12 mb-2">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <PlatformSVG id={plat} size={16} color="#94a3b8" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder={`${plat.charAt(0).toUpperCase() + plat.slice(1)} Profile URL`}
                  value={socialLinks[plat]}
                  onChange={(e) => setSocialLinks(prev => ({ ...prev, [plat]: e.target.value }))}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

      <button
        className="btn btn-primary w-100 py-3 fw-bold rounded-pill shadow-sm mt-2"
        onClick={handleContinue}
      >
        Confirm & Continue
      </button>
    </div>
  );
};

export default PlatformsStep;
