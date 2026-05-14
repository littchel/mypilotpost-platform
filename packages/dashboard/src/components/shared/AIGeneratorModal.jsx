import React, { useState } from 'react';

const AIGeneratorModal = ({ isOpen, onClose, onGenerate, onConfirm, initialContext }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    intention: initialContext?.title || 'Brand Awareness & Recognition',
    issue_context: initialContext?.issue || '',
    tone: 'Professional',
    platforms: ['Linkedin'],
    cta: 'Learn More',
    includeEmojis: false
  });

  // Re-sync if initialContext changes
  React.useEffect(() => {
    if (initialContext) {
      setFormData(prev => ({
        ...prev,
        intention: initialContext.title,
        issue_context: initialContext.issue
      }));
    }
  }, [initialContext]);
  const [result, setResult] = useState(null);
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [editedVariants, setEditedVariants] = useState({});

  if (!isOpen) return null;

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const reset = () => {
    setStep(1);
    setFormData({
      intention: initialContext?.title || 'Brand Awareness & Recognition',
      issue_context: initialContext?.issue || '',
      tone: 'Professional',
      platforms: ['Linkedin'],
      cta: 'Learn More',
      includeEmojis: false
    });
    setResult(null);
    setEditingPlatform(null);
    setEditedVariants({});
  };

  const handleGenerateClick = async () => {
    setStep(6); // Show progress
    const data = await onGenerate(formData);
    if (data) {
      setResult(data);
      setEditedVariants(data.platformVariants || {});
      setStep(7); // Show result
    } else {
      setStep(5); // Fail back to review
    }
  };

  const togglePlatform = (p) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p) 
        ? prev.platforms.filter(x => x !== p) 
        : [...prev.platforms, p]
    }));
  };

  const handleVariantEdit = (platform, text) => {
    setEditedVariants(prev => ({ ...prev, [platform]: text }));
  };

  const steps = [
    { n: 1, label: 'Intention' },
    { n: 2, label: 'Platforms' },
    { n: 3, label: 'Tone' },
    { n: 4, label: 'CTA' },
    { n: 5, label: 'Review' },
    { n: 6, label: 'Generating' },
    { n: 7, label: 'Results' }
  ];

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
          <div className="modal-header border-0 pb-0 pe-4 pt-4">
            <h5 className="modal-title fw-bold d-flex align-items-center">
              <div className="bg-primary-light p-2 rounded-3 me-3">
                <i className="fas fa-robot text-primary"></i>
              </div>
              myPilotPost Assistant - Social
            </h5>
            <button type="button" className="btn-close" onClick={() => { reset(); onClose(); }}></button>
          </div>
          
          <div className="modal-body p-4 pt-2">
            {/* Progress Stepper */}
            <div className="d-flex justify-content-between mb-5 mt-4 px-4 position-relative">
               <div className="position-absolute top-50 start-0 end-0 translate-middle-y bg-light" style={{ height: '2px', zIndex: 0, margin: '0 40px' }}></div>
               {steps.map(s => (
                <div key={s.n} className="text-center" style={{ width: '60px', zIndex: 1 }}>
                  <div className={`rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center ${step >= s.n ? 'bg-primary text-white' : 'bg-white text-muted border border-light'}`} 
                       style={{ width: '32px', height: '32px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                    {s.n}
                  </div>
                  <div className={`small fw-bold ${step === s.n ? 'text-primary' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {step === 1 && (
              <div className="animate__animated animate__fadeIn">
                <h5 className="fw-bold mb-4">Primary Intention</h5>
                <p className="text-muted small mb-4">What's the primary goal for this post?</p>
                <div className="row g-3">
                  {[
                    "Brand Awareness & Recognition", "Engagement & Community Building",
                    "Website Traffic & Conversions", "Lead Generation",
                    "Sales & Revenue", "Customer Loyalty & Retention",
                    "Event Promotion", "Thought Leadership & Authority",
                    "Customer Service & Support", "Recruitment & Talent Attraction"
                  ].map(goal => (
                    <div key={goal} className="col-md-6">
                      <button 
                        className={`w-100 text-start p-3 rounded-3 border ${formData.intention === goal ? 'border-primary bg-primary-light text-primary' : 'border-light bg-white text-muted'}`}
                        onClick={() => { setFormData({...formData, intention: goal}); handleNext(); }}
                      >
                        {goal}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate__animated animate__fadeIn">
                <h5 className="fw-bold mb-4">Platform Selection</h5>
                <p className="text-muted small mb-4">Select target platforms</p>
                <div className="row g-3 mb-4">
                  {['Facebook', 'Instagram', 'Twitter', 'Linkedin', 'Youtube', 'Tiktok', 'Pinterest', 'Threads'].map(p => (
                    <div key={p} className="col-md-3">
                      <button 
                        className={`w-100 p-3 rounded-3 border text-center ${formData.platforms.includes(p) ? 'border-primary bg-primary-light text-primary' : 'border-light bg-white text-muted opacity-50'}`}
                        onClick={() => togglePlatform(p)}
                      >
                        {p}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="small text-muted mb-4">Selected: <span className="text-primary fw-bold">{formData.platforms.join(', ') || 'None'}</span></div>
                <div className="d-flex justify-content-between mt-5">
                  <button className="btn btn-light rounded-pill px-4" onClick={handleBack}><i className="fas fa-arrow-left me-2"></i> Previous</button>
                  <button className="btn-pilot px-5" onClick={handleNext} disabled={formData.platforms.length === 0}>Next <i className="fas fa-arrow-right ms-2"></i></button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate__animated animate__fadeIn">
                <h5 className="fw-bold mb-4">Tone & Style</h5>
                <p className="text-muted small mb-4">Select tone and style</p>
                <div className="row g-3 mb-4">
                  {['Professional', 'Casual', 'Friendly', 'Authoritative', 'Inspirational', 'Humorous'].map(t => (
                    <div key={t} className="col-md-4">
                      <button 
                        className={`w-100 p-3 rounded-3 border text-center ${formData.tone === t ? 'border-primary bg-primary-light text-primary' : 'border-light bg-white text-muted'}`}
                        onClick={() => setFormData({...formData, tone: t})}
                      >
                        {t}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="form-check mt-4">
                  <input className="form-check-input" type="checkbox" id="emojiCheck" checked={formData.includeEmojis} onChange={(e) => setFormData({...formData, includeEmojis: e.target.checked})} />
                  <label className="form-check-label small text-muted" htmlFor="emojiCheck">Include relevant emojis</label>
                </div>
                <div className="d-flex justify-content-between mt-5">
                  <button className="btn btn-light rounded-pill px-4" onClick={handleBack}><i className="fas fa-arrow-left me-2"></i> Previous</button>
                  <button className="btn-pilot px-5" onClick={handleNext}>Next <i className="fas fa-arrow-right ms-2"></i></button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate__animated animate__fadeIn">
                <h5 className="fw-bold mb-4">Call to Action</h5>
                <p className="text-muted small mb-4">Select a call to action</p>
                <select 
                  className="form-select border-light p-3 rounded-3 mb-5"
                  value={formData.cta}
                  onChange={(e) => setFormData({...formData, cta: e.target.value})}
                >
                  {['Learn More', 'Shop Now', 'Sign Up', 'Download', 'Contact Us', 'Book Now'].map(cta => (
                    <option key={cta} value={cta}>{cta}</option>
                  ))}
                </select>
                <div className="d-flex justify-content-between mt-5">
                  <button className="btn btn-light rounded-pill px-4" onClick={handleBack}><i className="fas fa-arrow-left me-2"></i> Previous</button>
                  <button className="btn-pilot px-5" onClick={handleNext}>Review <i className="fas fa-eye ms-2"></i></button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="animate__animated animate__fadeIn">
                <h5 className="fw-bold mb-4">Review Your Settings</h5>
                <p className="text-muted small mb-4">Almost there! Review your mission parameters.</p>
                
                <div className="p-4 bg-light rounded-4 border border-light-subtle">
                   <div className="row g-4">
                      <div className="col-md-6 border-end">
                         <div className="small text-muted mb-1 uppercase tracking-wider">Intention</div>
                         <div className="fw-bold text-dark">{formData.intention}</div>
                      </div>
                      <div className="col-md-6">
                         <div className="small text-muted mb-1 uppercase tracking-wider">Tone</div>
                         <div className="fw-bold text-dark">{formData.tone}</div>
                      </div>
                      <div className="col-md-6 border-end border-top pt-3">
                         <div className="small text-muted mb-1 uppercase tracking-wider">Platforms</div>
                         <div className="fw-bold text-primary">{formData.platforms.join(', ')}</div>
                      </div>
                      <div className="col-md-6 border-top pt-3">
                         <div className="small text-muted mb-1 uppercase tracking-wider">Call to Action</div>
                         <div className="fw-bold text-dark">{formData.cta}</div>
                      </div>
                   </div>
                </div>

                <div className="d-flex justify-content-between mt-5">
                  <button className="btn btn-light rounded-pill px-4" onClick={handleBack}><i className="fas fa-arrow-left me-2"></i> Previous</button>
                  <button className="btn-pilot px-5" onClick={handleGenerateClick}>Generate Mission <i className="fas fa-sparkles ms-2"></i></button>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="text-center py-5 animate__animated animate__fadeIn">
                <div className="mb-4">
                   <span className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}></span>
                </div>
                <h5 className="fw-bold">Generating Content...</h5>
                <p className="text-muted">myPilotPost Assistant is crafting your mission content.</p>
                <div className="progress mt-4 mx-auto" style={{ height: '8px', maxWidth: '300px' }}>
                  <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: '100%' }}></div>
                </div>
              </div>
            )}

            {step === 7 && result && (
              <div className="animate__animated animate__fadeIn">
                <h5 className="fw-bold mb-4">Campaign Ready</h5>
                <div className="row g-3">
                  {Object.entries(editedVariants).map(([platform, text]) => (
                    <div key={platform} className="col-md-6">
                      <div 
                        className={`p-3 border rounded-4 h-100 ${editingPlatform === platform ? 'border-primary ring-1' : 'border-light bg-light-soft'}`}
                        onClick={() => setEditingPlatform(platform)}
                        style={{ cursor: 'pointer', transition: 'all 0.2s', backgroundColor: '#f9f9fb' }}
                      >
                        <div className="d-flex align-items-center mb-2">
                          <i className={`fab fa-${platform === 'Twitter' || platform === 'x' ? 'twitter' : platform.toLowerCase()} me-2`}></i>
                          <span className="small fw-bold text-uppercase">{platform}</span>
                        </div>
                        {editingPlatform === platform ? (
                          <textarea 
                            className="form-control border-0 p-0 small bg-transparent"
                            rows="4"
                            autoFocus
                            value={text}
                            onChange={(e) => handleVariantEdit(platform, e.target.value)}
                            onBlur={() => setEditingPlatform(null)}
                            style={{ fontSize: '0.85rem', resize: 'none' }}
                          ></textarea>
                        ) : (
                          <p className="mb-0 small text-muted" style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{text}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 d-flex justify-content-between">
                  <button className="btn btn-light rounded-pill px-4" onClick={() => setStep(4)}>Refine Settings</button>
                  <button className="btn-pilot px-5" onClick={() => { onConfirm(result, editedVariants); reset(); onClose(); }}>
                    Confirm & Populate Editor <i className="fas fa-check-circle ms-2"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIGeneratorModal;
