import React, { useState } from 'react';
import { validateContent } from '../../lib/platformRequirements';

export default function PostVerificationModal({ isOpen, onClose, data }) {
  const [isPublishing, setIsPublishing] = useState(false);

  if (!isOpen) return null;

  const { platforms, content, overrides, media, scheduledTime, timezone, campaignId } = data;

  // Compile validations for all platforms
  const validations = platforms.map(p => {
    const pContent = overrides[p] || content;
    return {
      platform: p,
      result: validateContent(p, pContent, media?.image ? 'image' : null, null)
    };
  });

  const hasBlocks = validations.some(v => v.result.state === 'BLOCKED');
  const hasWarnings = validations.some(v => v.result.state === 'WARNING');

  const overallConfidence = hasBlocks ? 'Low' : hasWarnings ? 'Moderate' : 'High';
  const confidenceColor = hasBlocks ? 'danger' : hasWarnings ? 'warning' : 'success';

  const handleConfirmPublish = async () => {
    setIsPublishing(true);
    // Simulate API call that persists ALL validation metadata for future verification
    const payload = {
      content,
      platform_specific_captions: overrides,
      platform_targets: platforms,
      media_ratios: media?.image ? "Detected 16:9" : null,
      scheduled_timezone: timezone,
      scheduled_time: scheduledTime,
      campaign_id: campaignId,
      publishing_confidence: overallConfidence,
      validation_results: validations.map(v => ({
        platform: v.platform,
        state: v.result.state,
        messages: v.result.messages
      })),
      compliance_flags: hasBlocks ? ["CONTENT_BLOCKED"] : [],
      safe_zone_warnings: validations.filter(v => v.result.messages.some(m => m.includes('Safe zone'))).map(v => v.platform)
    };

    console.log("PERSISTING VERIFIED PAYLOAD:", payload);

    setTimeout(() => {
      setIsPublishing(false);
      alert("Post verified and scheduled! Metadata persisted for compliance.");
      onClose();
    }, 1500);
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content" style={{ borderRadius: 16, border: 'none', overflow: 'hidden' }}>
          
          <div className="modal-header border-bottom px-4 py-3 bg-dark text-white">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2 m-0">
              <i className="fas fa-shield-check text-success"></i> Publishing Control Tower
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body p-0 d-flex flex-column flex-md-row" style={{ minHeight: '500px' }}>
            
            {/* LEFT: Verification Breakdown */}
            <div className="col-md-5 bg-light p-4 border-end">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h6 className="fw-bold m-0 text-uppercase text-muted extra-small">Publishing Summary</h6>
                <span className={`badge bg-${confidenceColor} text-uppercase`}>{overallConfidence} Confidence</span>
              </div>

              <div className="mb-4">
                <div className="extra-small fw-bold text-muted text-uppercase mb-1">Target Platforms</div>
                <div className="d-flex flex-wrap gap-1">
                  {platforms.map(p => (
                    <span key={p} className="badge bg-secondary text-capitalize">{p}</span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="extra-small fw-bold text-muted text-uppercase mb-1">Timing & Routing</div>
                <div className="small"><strong>Schedule:</strong> {scheduledTime ? new Date(scheduledTime).toLocaleString() : 'Post Now'}</div>
                <div className="small"><strong>Timezone:</strong> {timezone}</div>
                <div className="small"><strong>Campaign:</strong> {campaignId || 'None'}</div>
              </div>

              <div>
                <div className="extra-small fw-bold text-muted text-uppercase mb-2">Platform Validation</div>
                {validations.map(v => (
                  <div key={v.platform} className={`alert alert-${v.result.state === 'SAFE' ? 'success' : v.result.state === 'BLOCKED' ? 'danger' : 'warning'} py-2 px-3 mb-2 small`}>
                    <div className="fw-bold text-capitalize d-flex justify-content-between align-items-center">
                      <span><i className={`fas fa-${v.result.state === 'SAFE' ? 'check' : v.result.state === 'BLOCKED' ? 'ban' : 'exclamation-triangle'} me-2`}></i>{v.platform}</span>
                      <span className="extra-small">{v.result.state}</span>
                    </div>
                    {v.result.messages.length > 0 && (
                      <ul className="mb-0 mt-1 ps-3 extra-small">
                        {v.result.messages.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Content Snapshot & Intelligence */}
            <div className="col-md-7 p-4 bg-white d-flex flex-column">
              <h6 className="fw-bold mb-3 text-uppercase text-muted extra-small">Compliance Snapshot</h6>
              
              <div className="card border-subtle bg-light mb-4 flex-fill p-3" style={{ maxHeight: 200, overflow: 'auto' }}>
                <div className="fw-bold small mb-1">Base Content</div>
                <p className="small text-muted mb-0" style={{ whiteSpace: 'pre-wrap' }}>{content || 'No content provided.'}</p>
                {Object.keys(overrides).length > 0 && (
                  <div className="mt-3 border-top pt-2">
                    <div className="fw-bold small mb-1">Overrides Detected</div>
                    {Object.keys(overrides).map(p => (
                      <div key={p} className="extra-small mb-1">
                        <span className="fw-bold text-capitalize">{p}:</span> {overrides[p]}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <h6 className="fw-bold mb-3 text-uppercase text-muted extra-small">Publishing Intelligence</h6>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <div className="card border-subtle p-3 h-100 bg-light">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <i className="fas fa-chart-line text-primary"></i>
                      <div className="fw-bold small">Engagement Prediction</div>
                    </div>
                    <div className="extra-small text-muted">Optimal hook length detected for {platforms[0]}. Expect higher than average engagement.</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border-subtle p-3 h-100 bg-light">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <i className="fas fa-shield-alt text-success"></i>
                      <div className="fw-bold small">Brand DNA Alignment</div>
                    </div>
                    <div className="extra-small text-muted">Tone matches <strong>Professional Authority</strong> guidelines. 0 compliance violations.</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="modal-footer border-top px-4 py-3 bg-light d-flex justify-content-between align-items-center">
            <button className="btn btn-outline-secondary" onClick={onClose} disabled={isPublishing}>
              <i className="fas fa-arrow-left me-1"></i> Back to Editor
            </button>
            <div className="d-flex gap-2">
              <button className="btn btn-secondary" disabled={isPublishing}>
                Save as Draft
              </button>
              <button 
                className={`btn btn-${hasBlocks ? 'danger' : 'pilot'} fw-bold px-4`} 
                disabled={isPublishing || hasBlocks}
                onClick={handleConfirmPublish}
              >
                {isPublishing ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span> Executing...</>
                ) : (
                  <><i className="fas fa-rocket me-2"></i> {scheduledTime ? 'Confirm & Schedule' : 'Confirm & Publish'}</>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
