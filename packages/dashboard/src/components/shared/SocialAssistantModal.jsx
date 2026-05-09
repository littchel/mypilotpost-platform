import React, { useState, useEffect } from 'react';

const INTENTIONS = ['Awareness', 'Engagement', 'Authority', 'Lead Generation'];
const PLATFORMS = ['facebook', 'instagram', 'linkedin', 'tiktok', 'x', 'pinterest', 'youtube', 'shorts'];

export default function SocialAssistantModal({ isOpen, onClose, onComplete }) {
  const [step, setStep] = useState(1); // 1: Setup, 2: Orchestration, 3: Review
  const [data, setData] = useState({
    topic: '',
    intention: 'Engagement',
    platforms: ['linkedin', 'instagram'],
    tone: 'Professional'
  });

  const [orchestrationStep, setOrchestrationStep] = useState(0);
  const [generatedResult, setGeneratedResult] = useState(null);

  if (!isOpen) return null;

  const handleStartOrchestration = () => {
    setStep(2);
    setOrchestrationStep(1); // 1: Read

    setTimeout(() => setOrchestrationStep(2), 1000); // 2: Generate
    setTimeout(() => setOrchestrationStep(3), 2500); // 3: Optimize
    setTimeout(() => {
      setOrchestrationStep(4); // 4: Recommend
      // Mock generated data
      setGeneratedResult({
        baseCaption: `🚀 Unlocking growth with ${data.topic || 'new strategies'}! We've seen incredible results by focusing on ${data.intention.toLowerCase()}. What's your biggest challenge right now? Let's discuss below! 👇 #growth #strategy`,
        platformVariants: {
          linkedin: `Professional growth relies on strategic execution. Here is how we approach ${data.topic || 'the industry'}. Let's connect and share insights.`,
          instagram: `Ready to level up? 🚀 Our focus on ${data.intention.toLowerCase()} is changing the game! Link in bio to learn more. 🔥✨`,
          x: `Growth isn't an accident. We're doubling down on ${data.intention.toLowerCase()} to drive results. #growth`
        },
        platforms: data.platforms,
        recommendations: {
          visual: "High-contrast infographics or executive photography.",
          format: "Carousel on LinkedIn, Vertical Video on Instagram.",
          timing: "Post during morning commute hours (8am - 9am)."
        }
      });
      setTimeout(() => setStep(3), 1500);
    }, 4000);
  };

  const handleConfirm = () => {
    onComplete(generatedResult);
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content" style={{ borderRadius: 16, border: 'none', overflow: 'hidden' }}>
          
          <div className="modal-header border-bottom px-4 py-3 bg-light">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
              <i className="fas fa-robot text-primary"></i> myPilotPost Assistant
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body px-4 py-4" style={{ minHeight: '350px' }}>
            
            {/* STEP 1: SETUP */}
            {step === 1 && (
              <div>
                <h5 className="fw-bold mb-3">Strategic Setup</h5>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Content Topic / Goal</label>
                  <input type="text" className="form-control" placeholder="e.g., AI automation for agencies" value={data.topic} onChange={e => setData({...data, topic: e.target.value})} />
                </div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Primary Intention</label>
                    <select className="form-select" value={data.intention} onChange={e => setData({...data, intention: e.target.value})}>
                      {INTENTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Tone</label>
                    <select className="form-select" value={data.tone} onChange={e => setData({...data, tone: e.target.value})}>
                      <option>Professional</option>
                      <option>Casual</option>
                      <option>Authoritative</option>
                      <option>Empathetic</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="form-label small fw-bold">Target Platforms</label>
                  <div className="d-flex flex-wrap gap-2">
                    {PLATFORMS.map(p => (
                      <button 
                        key={p} 
                        className={`btn btn-sm ${data.platforms.includes(p) ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => {
                          setData(prev => ({
                            ...prev, 
                            platforms: prev.platforms.includes(p) ? prev.platforms.filter(x => x !== p) : [...prev.platforms, p]
                          }))
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: ORCHESTRATION */}
            {step === 2 && (
              <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5">
                <div className="spinner-border text-primary mb-4" style={{ width: '3rem', height: '3rem' }}></div>
                <h5 className="fw-bold mb-4">Orchestrating Strategy...</h5>
                
                <div className="w-75">
                  <div className={`d-flex align-items-center gap-3 mb-3 ${orchestrationStep >= 1 ? 'text-dark' : 'text-muted opacity-50'}`}>
                    <i className={`fas fa-${orchestrationStep > 1 ? 'check text-success' : 'search'} fs-5`}></i>
                    <span className="fw-medium">1. Reading Brand DNA & Audience Intel...</span>
                  </div>
                  <div className={`d-flex align-items-center gap-3 mb-3 ${orchestrationStep >= 2 ? 'text-dark' : 'text-muted opacity-50'}`}>
                    <i className={`fas fa-${orchestrationStep > 2 ? 'check text-success' : 'pen-nib'} fs-5`}></i>
                    <span className="fw-medium">2. Generating Hooks & Copy Variations...</span>
                  </div>
                  <div className={`d-flex align-items-center gap-3 mb-3 ${orchestrationStep >= 3 ? 'text-dark' : 'text-muted opacity-50'}`}>
                    <i className={`fas fa-${orchestrationStep > 3 ? 'check text-success' : 'sliders-h'} fs-5`}></i>
                    <span className="fw-medium">3. Optimizing for {data.platforms.join(', ')}...</span>
                  </div>
                  <div className={`d-flex align-items-center gap-3 ${orchestrationStep >= 4 ? 'text-dark' : 'text-muted opacity-50'}`}>
                    <i className={`fas fa-${orchestrationStep >= 4 ? 'check text-success' : 'lightbulb'} fs-5`}></i>
                    <span className="fw-medium">4. Extracting Visual Recommendations...</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW */}
            {step === 3 && generatedResult && (
              <div>
                <h5 className="fw-bold mb-3"><i className="fas fa-check-circle text-success me-2"></i>Generation Complete</h5>
                
                <div className="card bg-light border-0 mb-3">
                  <div className="card-body">
                    <h6 className="fw-bold small text-muted text-uppercase mb-2">Base Caption</h6>
                    <p className="small mb-0">{generatedResult.baseCaption}</p>
                  </div>
                </div>

                <div className="card border-primary border-opacity-25 bg-primary bg-opacity-10 mb-3">
                  <div className="card-body">
                    <h6 className="fw-bold small text-primary text-uppercase mb-2"><i className="fas fa-lightbulb me-1"></i> Strategic Recommendations</h6>
                    <ul className="small mb-0 ps-3">
                      <li><strong>Visual:</strong> {generatedResult.recommendations.visual}</li>
                      <li><strong>Format:</strong> {generatedResult.recommendations.format}</li>
                      <li><strong>Timing:</strong> {generatedResult.recommendations.timing}</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="modal-footer border-top px-4 py-3 d-flex justify-content-between bg-light">
            {step === 1 && (
              <>
                <button className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary px-4 fw-bold" onClick={handleStartOrchestration}>
                  <i className="fas fa-magic me-2"></i> Orchestrate Post
                </button>
              </>
            )}
            {step === 3 && (
              <>
                <button className="btn btn-outline-secondary" onClick={() => setStep(1)}>Start Over</button>
                <button className="btn btn-primary px-4 fw-bold" onClick={handleConfirm}>
                  Load into Composer <i className="fas fa-arrow-right ms-2"></i>
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

