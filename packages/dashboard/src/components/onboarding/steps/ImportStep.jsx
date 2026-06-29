import React, { useState } from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { apiRequest } from '../../../lib/api/client';
import { AnimatePresence } from 'framer-motion';

const ImportStep = ({ isWizard, onNext }) => {
    const onboarding = useOnboarding();
    const updateStep = isWizard ? null : onboarding.updateStep;

    const [url, setUrl] = useState("");
    const [socialUrl, setSocialUrl] = useState("");
    const [selectedPlatform, setSelectedPlatform] = useState("instagram");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState("");
    const [importType, setImportType] = useState('website'); // 'website' | 'social'

    const handleAnalyze = async (e, type = 'website', platform = null) => {
        if (e) e.preventDefault();
        const activeUrl = type === 'website' ? url : socialUrl;
        if (!activeUrl) return;
        
        setIsAnalyzing(true);
        setError("");

        try {
            const res = await apiRequest("/api/customer/brand/import", {
                method: "POST",
                body: JSON.stringify({ 
                    url: activeUrl,
                    platform: type === 'social' ? (platform || selectedPlatform) : null
                })
            });

            if (isWizard) {
                onNext(res);
            } else {
                updateStep(4, res);
            }
        } catch (err) {
            console.error("Analysis failed", err);
            setError("We couldn't connect to this source. You can still set up manually.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="onboarding-card">
            <div className="text-center mb-4">
                <div className="icon-circle bg-light-primary mx-auto mb-3" style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}>
                    <i className={importType === 'website' ? "fas fa-globe text-primary" : "fas fa-hashtag text-primary"}></i>
                </div>
                <h2 className="fw-bold">Initialize your brand</h2>
                <p className="text-muted small">Choose how we should analyze your current presence.</p>
            </div>

            <div className="d-flex gap-2 mb-4">
                <button 
                    className={`btn flex-grow-1 py-2 fw-bold small ${importType === 'website' ? 'btn-primary' : 'btn-light text-muted'}`}
                    onClick={() => setImportType('website')}
                >
                    <i className="fas fa-globe me-2"></i> Website
                </button>
                <button 
                    className={`btn flex-grow-1 py-2 fw-bold small ${importType === 'social' ? 'btn-primary' : 'btn-light text-muted'}`}
                    onClick={() => setImportType('social')}
                >
                    <i className="fas fa-share-alt me-2"></i> Social Media
                </button>
            </div>

            {importType === 'website' ? (
                <form onSubmit={handleAnalyze}>
                    <div className="mb-4">
                        <label className="form-label fw-600 small">WEBSITE URL</label>
                        <input 
                            type="url" 
                            className="form-control form-control-lg" 
                            placeholder="https://yourwebsite.com"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            required
                            disabled={isAnalyzing}
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="btn btn-pilot-ob w-100 py-3" 
                        disabled={isAnalyzing || !url}
                    >
                        {isAnalyzing ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span> Analyzing...</>
                        ) : (
                            <>Generate Strategy <i className="fas fa-magic ms-2"></i></>
                        )}
                    </button>
                </form>
            ) : (
                <form onSubmit={(e) => handleAnalyze(e, 'social', selectedPlatform)}>
                    <div className="mb-3">
                        <label className="form-label fw-600 small">SELECT PLATFORM</label>
                        <div className="d-flex gap-2 mb-3">
                            {['instagram', 'tiktok', 'linkedin', 'facebook'].map(plat => (
                                <button
                                    key={plat}
                                    type="button"
                                    className={`btn btn-sm flex-grow-1 py-2 fw-bold d-flex align-items-center justify-content-center gap-1 ${selectedPlatform === plat ? 'btn-dark text-white' : 'btn-light border text-muted'}`}
                                    onClick={() => setSelectedPlatform(plat)}
                                    disabled={isAnalyzing}
                                >
                                    <i className={`fab fa-${plat} ${plat}-color`}></i>
                                    <span className="text-capitalize d-none d-sm-inline">{plat}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="form-label fw-600 small">PROFILE URL</label>
                        <input 
                            type="url" 
                            className="form-control form-control-lg" 
                            placeholder={`https://${selectedPlatform}.com/yourprofile`}
                            value={socialUrl}
                            onChange={(e) => setSocialUrl(e.target.value)}
                            required
                            disabled={isAnalyzing}
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="btn btn-pilot-ob w-100 py-3" 
                        disabled={isAnalyzing || !socialUrl}
                    >
                        {isAnalyzing ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span> Analyzing...</>
                        ) : (
                            <>Generate Strategy <i className="fas fa-magic ms-2"></i></>
                        )}
                    </button>
                </form>
            )}

            <AnimatePresence>
                {error && (
                    <div className="alert alert-warning small py-2 mt-4 mb-0">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        {error}
                        <div className="mt-2">
                            <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => updateStep(4, {})}>
                                Continue Manually
                            </button>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            <div className="text-center mt-4 pt-2 border-top">
                <button className="btn btn-link text-muted btn-sm text-decoration-none" onClick={() => updateStep(2)}>
                    <i className="fas fa-arrow-left me-2"></i> Change Method
                </button>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .bg-light-primary { background: #eff6ff; }
                .icon-circle {
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .fw-600 { font-weight: 600; }
                .instagram-color { color: #E1306C; }
                .tiktok-color { color: #000000; }
                .linkedin-color { color: #0A66C2; }
                .facebook-color { color: #1877F2; }
            `}} />
        </div>
    );
};

export default ImportStep;
