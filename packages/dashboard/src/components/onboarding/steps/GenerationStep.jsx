import React, { useState } from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { apiRequest } from '../../../lib/api/client';

const GenerationStep = () => {
  const { data, updateStep } = useOnboarding();
  const [prompt, setPrompt] = useState(`Write a social media post about our new ${data.industry || 'brand'} launch focusing on ${data.goals?.[0] || 'market growth'}.`);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError("");
    try {
      const res = await apiRequest("/api/customer/ai/generate/social", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          brand_id: data.brandId,
          platforms: data.platforms
        })
      });
      if (res.content_id) {
        setGeneratedResult(res);
      } else {
        setError("Failed to generate content. Please try again.");
      }
    } catch {
      setError("AI Generation failed. Network error.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (generatedResult) {
    return (
      <div className="onboarding-card">
        <h2 className="fw-bold mb-2">Your first post is ready!</h2>
        <p className="text-muted mb-4 small">Review and refine your AI-generated content.</p>
        
        <div className="preview-area p-3 border rounded-3 bg-light mb-4 shadow-sm" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <div className="fw-bold mb-2 small text-uppercase text-primary">Caption</div>
          <div className="white-space-pre-wrap small">{generatedResult.baseCaption}</div>
          <hr />
          <div className="small text-muted">Variants for: {data.platforms.join(', ')}</div>
        </div>

        <div className="alert alert-success small mb-4 py-2">
          <i className="fas fa-magic me-2"></i> This post has been saved to your drafts.
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-grey w-50" onClick={() => setGeneratedResult(null)}>Regenerate</button>
          <button className="btn btn-pilot-ob w-50" onClick={() => updateStep(7, { generatedContent: generatedResult })}>
            Next: Schedule →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-card">
      <h2 className="fw-bold mb-2">Generate your first post</h2>
      <p className="text-muted mb-4 small">Tell the AI what you want to talk about today.</p>

      <div className="mb-4">
        <label className="form-label small fw-bold">Instruction</label>
        <textarea 
          className="form-control border-2" 
          rows="4"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
        />
      </div>

      {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

      <button 
        className="btn btn-pilot-ob w-100 d-flex align-items-center justify-content-center gap-2"
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
      >
        {isGenerating ? (
          <><span className="spinner-border spinner-border-sm"></span> Simulating AI Magic...</>
        ) : (
          <><i className="fas fa-magic"></i> Generate Content →</>
        )}
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .white-space-pre-wrap { white-space: pre-wrap; }
        .btn-grey { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; font-weight: 600; padding: 0.8rem; border-radius: 10px; }
        .btn-grey:hover { background: #e2e8f0; }
      `}} />
    </div>
  );
};

export default GenerationStep;
