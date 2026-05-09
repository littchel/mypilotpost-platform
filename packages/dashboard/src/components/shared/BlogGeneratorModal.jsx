import React, { useState } from 'react';

/**
 * myPilotPost Blog Assistant Modal
 * Implementation of the 7-step AI Article flow as per Phase 3.
 * Steps: Intention, Audience, Tone, Keyword, Structure, Review, Results
 */
const BlogGeneratorModal = ({ isOpen, onClose, onGenerate, onConfirm, isGenerating, activeBrand }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    intention: 'Thought Leadership',
    audience: 'Industry Professionals',
    tone: 'Professional & Authoritative',
    keyword: '',
    structure: 'Standard Blog Post',
    additionalContext: ''
  });
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const reset = () => {
    setStep(1);
    setFormData({
      intention: 'Thought Leadership',
      audience: 'Industry Professionals',
      tone: 'Professional & Authoritative',
      keyword: '',
      structure: 'Standard Blog Post',
      additionalContext: ''
    });
    setResult(null);
  };

  const handleGenerateClick = async () => {
    setStep(6); // Show progress/Reviewing state
    const data = await onGenerate(formData);
    if (data) {
      setResult(data);
      setStep(7); // Show result
    } else {
      setStep(5); // Fail back to review
    }
  };

  const steps = [
    { n: 1, label: 'Intention' },
    { n: 2, label: 'Audience' },
    { n: 3, label: 'Tone' },
    { n: 4, label: 'Keyword' },
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
                <i className="fas fa-file-alt text-primary"></i>
              </div>
              myPilotPost Blog Assistant
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
                <p className="text-muted small mb-4">What's the primary goal for this article?</p>
                <div className="row g-3">
                  {[
                    "Thought Leadership", "Product Education",
                    "SEO Traffic Generation", "Company News & Updates",
                    "Industry Analysis", "Client Success Stories",
                    "Event Highlights", "Technical Deep Dives"
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
                <h5 className="fw-bold mb-4">Target Audience</h5>
                <p className="text-muted small mb-4">Who are we talking to?</p>
                <div className="mb-4">
                  <textarea 
                    className="form-control border-light p-3 rounded-3"
                    rows="3"
                    placeholder="e.g. Senior leadership at aviation startups, fleet operations managers..."
                    value={formData.audience}
                    onChange={(e) => setFormData({...formData, audience: e.target.value})}
                  />
                </div>
                <div className="row g-2">
                  {['Industry Pros', 'Decision Makers', 'Technical Users', 'General Public'].map(a => (
                     <button key={a} className="btn btn-sm btn-light border-light-subtle me-2" onClick={() => setFormData({...formData, audience: a})}>{a}</button>
                  ))}
                </div>
                <div className="d-flex justify-content-between mt-5">
                  <button className="btn btn-light rounded-pill px-4" onClick={handleBack}><i className="fas fa-arrow-left me-2"></i> Previous</button>
                  <button className="btn-pilot px-5" onClick={handleNext} disabled={!formData.audience}>Next <i className="fas fa-arrow-right ms-2"></i></button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate__animated animate__fadeIn">
                <h5 className="fw-bold mb-4">Tone & Writing Style</h5>
                <p className="text-muted small mb-4">Select the voice of your brand.</p>
                <div className="row g-3 mb-4">
                  {['Professional & Authoritative', 'Friendly & Accessible', 'Bold & Visionary', 'Technical & Precise', 'Inspirational', 'Casual & Witty'].map(t => (
                    <div key={t} className="col-md-6">
                      <button 
                        className={`w-100 p-3 rounded-3 border text-start ${formData.tone === t ? 'border-primary bg-primary-light text-primary' : 'border-light bg-white text-muted'}`}
                        onClick={() => setFormData({...formData, tone: t})}
                      >
                        {t}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="d-flex justify-content-between mt-5">
                  <button className="btn btn-light rounded-pill px-4" onClick={handleBack}><i className="fas fa-arrow-left me-2"></i> Previous</button>
                  <button className="btn-pilot px-5" onClick={handleNext}>Next <i className="fas fa-arrow-right ms-2"></i></button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate__animated animate__fadeIn">
                <h5 className="fw-bold mb-4">Core Strategy</h5>
                <p className="text-muted small mb-3">Target Keyword</p>
                <input 
                  type="text" 
                  className="form-control border-light p-3 rounded-3 mb-4"
                  placeholder="e.g. Sustainable Aviation Fuel"
                  value={formData.keyword}
                  onChange={(e) => setKeyword({...formData, keyword: e.target.value})}
                />
                
                <p className="text-muted small mb-3">Article Structure</p>
                <select 
                  className="form-select border-light p-3 rounded-3"
                  value={formData.structure}
                  onChange={(e) => setFormData({...formData, structure: e.target.value})}
                >
                  <option value="Standard Blog Post">Standard Blog Post (Intro, Points, Conclusion)</option>
                  <option value="Deep Dive Analysis">Deep Dive Analysis (Explanatory & Data-heavy)</option>
                  <option value="Case Study">Case Study (Problem, Solution, Results)</option>
                  <option value="How-To Guide">How-To Guide (Step-by-step instructions)</option>
                  <option value="Listicle">Listicle (Top 5/10 list style)</option>
                </select>

                <div className="d-flex justify-content-between mt-5">
                  <button className="btn btn-light rounded-pill px-4" onClick={handleBack}><i className="fas fa-arrow-left me-2"></i> Previous</button>
                  <button className="btn-pilot px-5" onClick={handleNext} disabled={!formData.keyword}>Review Mission <i className="fas fa-eye ms-2"></i></button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="animate__animated animate__fadeIn">
                <h5 className="fw-bold mb-4">Review Article Mission</h5>
                <p className="text-muted small mb-4">Our AI will architect your content based on these parameters.</p>
                
                <div className="p-4 bg-light rounded-4 border border-light-subtle">
                   <div className="row g-4">
                      <div className="col-md-6 border-end">
                         <div className="small text-muted mb-1 uppercase tracking-wider">Intention</div>
                         <div className="fw-bold text-dark">{formData.intention}</div>
                      </div>
                      <div className="col-md-6">
                         <div className="small text-muted mb-1 uppercase tracking-wider">Target Keywords</div>
                         <div className="fw-bold text-primary">{formData.keyword}</div>
                      </div>
                      <div className="col-md-6 border-end border-top pt-3">
                         <div className="small text-muted mb-1 uppercase tracking-wider">Audience</div>
                         <div className="fw-bold text-dark">{formData.audience}</div>
                      </div>
                      <div className="col-md-6 border-top pt-3">
                         <div className="small text-muted mb-1 uppercase tracking-wider">Tone & Voice</div>
                         <div className="fw-bold text-dark">{formData.tone}</div>
                      </div>
                   </div>
                </div>

                <div className="d-flex justify-content-between mt-5">
                  <button className="btn btn-light rounded-pill px-4" onClick={handleBack}><i className="fas fa-arrow-left me-2"></i> Previous</button>
                  <button className="btn-pilot px-5" onClick={handleGenerateClick}>Generate Article <i className="fas fa-sparkles ms-2"></i></button>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="text-center py-5 animate__animated animate__fadeIn">
                <div className="mb-4">
                   <span className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}></span>
                </div>
                <h5 className="fw-bold">Architecting Content...</h5>
                <p className="text-muted">myPilotPost Assistant is cross-referencing industry context and SEO data.</p>
                <div className="progress mt-4 mx-auto" style={{ height: '8px', maxWidth: '300px' }}>
                  <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: '100%' }}></div>
                </div>
              </div>
            )}

            {step === 7 && result && (
              <div className="animate__animated animate__fadeIn">
                <h5 className="fw-bold mb-4 text-primary"><i className="fas fa-check-circle me-2"></i> Article Draft Ready</h5>
                <div className="card-workspace p-4 mb-4 border-primary border-opacity-25" style={{ maxHeight: '400px', overflowY: 'auto', backgroundColor: '#fcfdff' }}>
                  <h4 className="fw-bold mb-3">{result.title}</h4>
                  <div className="small text-muted mb-4 pb-3 border-bottom d-flex gap-3">
                    <span><i className="fas fa-history me-1"></i> Reading Time: {Math.ceil(result.body.length / 1000)} mins</span>
                    <span><i className="fas fa-chart-line me-1"></i> SEO Potential: High</span>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#334155' }}>
                    {result.body}
                  </div>
                </div>
                <div className="mt-5 d-flex justify-content-between">
                  <button className="btn btn-light rounded-pill px-4" onClick={() => setStep(4)}>Refine Settings</button>
                  <button className="btn-pilot px-5" onClick={() => { onConfirm(result); reset(); onClose(); }}>
                    Confirm & Populate Editor <i className="fas fa-file-export ms-2"></i>
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

export default BlogGeneratorModal;
