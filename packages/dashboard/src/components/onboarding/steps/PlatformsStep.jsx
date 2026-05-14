import React, { useState } from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';

const PlatformsStep = () => {
    const { data, nextStep } = useOnboarding();
    
    // Task 4: Safe checks
    const [selected, setSelected] = useState(data?.platforms || []);
    const [socialLinks, setSocialLinks] = useState({
        instagram: data?.socialLinks?.instagram || "",
        facebook: data?.socialLinks?.facebook || "",
        linkedin: data?.socialLinks?.linkedin || "",
        tiktok: data?.socialLinks?.tiktok || "",
        x: data?.socialLinks?.x || ""
    });
    const [error, setError] = useState("");

    const platforms = [
        { id: 'linkedin', name: 'LinkedIn', icon: 'fab fa-linkedin' },
        { id: 'facebook', name: 'Facebook', icon: 'fab fa-facebook' },
        { id: 'instagram', name: 'Instagram', icon: 'fab fa-instagram' },
        { id: 'x', name: 'X / Twitter', icon: 'fab fa-x-twitter' },
        { id: 'tiktok', name: 'TikTok', icon: 'fab fa-tiktok' }
    ];

    const togglePlatform = (id) => {
        setSelected(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleContinue = () => {
        // Validation (Task 4)
        const hasSocial = Object.values(socialLinks).some(link => link && link.trim());
        const hasWebsite = data.websiteURL && data.websiteURL.trim();

        if (!hasWebsite && !hasSocial) {
            setError("Please provide either a website URL or at least one social media link to continue.");
            return;
        }

        nextStep({ 
            platforms: selected,
            socialLinks
        });
    };

    return (
        <div className="onboarding-platforms">
            <h2 className="fw-bold mb-3 mt-4">Social Presence</h2>
            <p className="text-muted mb-4">Tell us where your brand lives. Website is now optional if social links are provided.</p>

            <div className="row g-3 mb-4">
                {platforms.map(platform => {
                    const isSelected = selected.includes(platform.id);
                    return (
                        <div key={platform.id} className="col-12 col-md-4">
                            <div
                                onClick={() => togglePlatform(platform.id)}
                                className={`platform-card p-3 rounded-4 d-flex align-items-center gap-3 cursor-pointer border ${isSelected ? 'border-primary bg-light' : 'border-light'}`}
                                style={{ cursor: 'pointer' }}
                            >
                                <i className={`${platform.icon} fa-lg ${isSelected ? 'text-primary' : 'text-muted'}`}></i>
                                <span className={`fw-bold small ${isSelected ? 'text-primary' : 'text-dark'}`}>
                                    {platform.name}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="social-links-section mb-4">
                <h6 className="fw-bold mb-3">Profile URLs (Recommended)</h6>
                <div className="row g-2">
                    {Object.keys(socialLinks).map(plat => (
                        <div key={plat} className="col-12 mb-2">
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0">
                                    <i className={`${platforms.find(p => p.id === plat)?.icon} text-muted`}></i>
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
