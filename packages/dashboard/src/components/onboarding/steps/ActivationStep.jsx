import React, { useState } from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useBrand } from '../../../contexts/BrandContext';
import { AnimatePresence, motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { apiRequest } from '../../../lib/api/client';

const ActivationStep = ({ isWizard, onFinish }) => {
    const onboarding = useOnboarding();
    const completeOnboarding = isWizard ? null : onboarding.completeOnboarding;
    const data = isWizard ? {} : onboarding.data;
    const { createBrand, brands } = useBrand();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [mockPost, setMockPost] = useState(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const brandId = data.brandId || brands?.[0]?.id;
            const res = await apiRequest("/api/customer/ai/generate/social", {
                method: "POST",
                body: JSON.stringify({
                    prompt: `Write an engaging social media post announcing that ${data.brandName || 'our brand'} is now live in the ${data.industry || 'industry'} space. Keep it exciting and professional.`,
                    brand_id: brandId,
                    platforms: data.platforms?.length ? data.platforms : ['linkedin']
                })
            });
            setMockPost({
                content: res.baseCaption || `🚀 Exciting news from ${data.brandName || 'our brand'}! We are now operational in the ${data.industry || 'industry'} space.`,
                platform: data.platforms?.[0] || 'LinkedIn',
                hashtags: res.hashtags || '#launch #brand #growth'
            });
        } catch {
            // Graceful fallback — show a template so user still experiences the AHA moment
            setMockPost({
                content: `🚀 Exciting news from ${data.brandName || 'our brand'}! We are now operational in the ${data.industry || 'industry'} space. Stay tuned for updates!`,
                platform: data.platforms?.[0] || 'LinkedIn',
                hashtags: '#launch #brand #growth'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFinish = async () => {
        // Ensure brand is created if it doesn't exist (Manual Flow)
        if (brands.length === 0 || isWizard) {
            const brandName = data.brandName || data.name || '';
            if (brandName) {
                await createBrand({
                    name: brandName,
                    description: data.description || '',
                    industry: data.industry || '',
                    website: data.website || ''
                });
            }
        }
        
        setIsSaved(true);
        
        // Mark onboarding complete then redirect to SPA root (App.jsx handles dashboard render)
        setTimeout(async () => {
            if (isWizard) {
                onFinish();
            } else {
                await completeOnboarding();
                // isComplete now true in context — App.jsx gate opens without reload
            }
        }, 2500);
    };

    return (
        <div className="onboarding-activation-centered d-flex flex-column align-items-center justify-content-center text-center py-4">
            <AnimatePresence mode="wait">
                {!isSaved ? (
                    <motion.div 
                        key="activation-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-100"
                    >
                        {!mockPost ? (
                            <>
                                <div className="mb-4">
                                    <div className="success-pulse mb-4 mx-auto d-flex align-items-center justify-content-center rounded-circle bg-success bg-opacity-10" style={{ width: '80px', height: '80px' }}>
                                        <i className="fas fa-check text-success fs-2"></i>
                                    </div>
                                    <h2 className="fw-bold mb-3">Create your first post</h2>
                                    <p className="text-muted mb-5">
                                        Your brand system is initialized. Generate your first piece of content to complete your setup.
                                    </p>
                                </div>

                                <div className="activation-actions d-grid gap-3 w-100" style={{ maxWidth: '400px', margin: '0 auto' }}>
                                    <button 
                                        className="btn btn-primary py-3 fw-bold rounded-pill shadow-sm d-flex align-items-center justify-content-center gap-2"
                                        onClick={handleGenerate}
                                        disabled={isGenerating}
                                    >
                                        {isGenerating ? (
                                            <><span className="spinner-border spinner-border-sm"></span> Analyzing & Generating...</>
                                        ) : (
                                            <><i className="fas fa-wand-magic-sparkles"></i> Generate with AI</>
                                        )}
                                    </button>
                                    <button 
                                        className="btn btn-outline-secondary py-3 rounded-pill fw-bold"
                                        onClick={handleFinish}
                                        disabled={isGenerating}
                                    >
                                        Skip & Go to Dashboard
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="preview-container text-start w-100" style={{ maxWidth: '500px', margin: '0 auto' }}>
                                <div className="card shadow-sm border-0 rounded-4 mb-4">
                                    <div className="card-body p-4">
                                        <div className="d-flex align-items-center gap-2 mb-3">
                                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                                                {data.brandName?.[0] || 'B'}
                                            </div>
                                            <div className="fw-bold small">{data.brandName || 'My Brand'}</div>
                                            <span className="badge bg-light text-muted ms-auto x-small fw-normal">Draft</span>
                                        </div>
                                        <p className="small mb-3">{mockPost.content}</p>
                                        <p className="text-primary small mb-0">{mockPost.hashtags}</p>
                                    </div>
                                </div>
                                <button className="btn btn-success w-100 py-3 fw-bold rounded-pill shadow" onClick={handleFinish}>
                                    Save Draft & Finish Setup
                                </button>
                                <button className="btn btn-link w-100 mt-2 text-muted x-small text-decoration-none" onClick={() => setMockPost(null)}>
                                    Try Another
                                </button>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div 
                        key="success-milestone"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="success-milestone text-center d-flex flex-column align-items-center"
                    >
                        <img 
                            src="/onboarding_success_illustration.png" 
                            alt="Mission Successful" 
                            className="img-fluid mb-5 rounded-4 shadow-lg"
                            style={{ maxWidth: '450px', filter: 'brightness(0.85)' }}
                        />
                        <div className="success-pulse mb-4 d-flex align-items-center justify-content-center rounded-circle bg-success shadow-success" style={{ width: '64px', height: '64px', boxShadow: '0 0 20px rgba(53, 201, 97, 0.4)' }}>
                            <i className="fas fa-check text-white fs-3"></i>
                        </div>
                        <h2 className="fw-bold mb-2">Systems Ready</h2>
                        <h4 className="text-success fw-bold mb-4">You’re now ready to operate your brand</h4>
                        <p className="text-muted px-4 small mb-0">Redirecting you to Mission Control...</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{ __html: `
                .onboarding-activation-centered {
                    min-height: 400px;
                }
                .success-pulse {
                    animation: pulseSuccess 2s infinite;
                }
                @keyframes pulseSuccess {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(53, 201, 97, 0.4); }
                    70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(53, 201, 97, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(53, 201, 97, 0); }
                }
                .shadow-success {
                    filter: drop-shadow(0 0 10px rgba(53, 201, 97, 0.3));
                }
            `}} />
        </div>
    );
};

export default ActivationStep;
