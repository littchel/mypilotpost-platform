import React, { useState, useEffect } from "react";
import PlatformPreviewPanel from "../components/publishing/PlatformPreviewPanel";
import PostVerificationModal from "../components/publishing/PostVerificationModal";
import SocialAssistantModal from "../components/shared/SocialAssistantModal";
import { generateVisualIntelligence, fetchFreepikSuggestions } from "../lib/freepikSuggestionEngine";

/**
 * CreatePost — Publishing Workspace System
 * Modular, state-driven, reusable, extensible, platform-aware.
 */

export default function CreatePost({
  selectedCampaignId: propCampaignId,
}) {

  // ── Core Content State ──
  const [content, setContent] = useState("");
  const [media, setMedia] = useState({ image: null, video: null });
  const [selectedPlatforms, setSelectedPlatforms] = useState(["facebook"]);
  const [contentObjective, setContentObjective] = useState("engagement");
  
  // ── Workspace State ──
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  // ── Scheduling State ──
  const [scheduledTime, setScheduledTime] = useState("");
  const [timezone, _setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [selectedCampaignId, setLocalCampaignId] = useState(propCampaignId || "");

  // ── Freepik State ──
  const [freepikResults, setFreepikResults] = useState([]);
  const [freepikLoading, setFreepikLoading] = useState(false);
  const [strategicAdvice, setStrategicAdvice] = useState("");

  // ── Platform Overrides ──
  const [platformOverrides, setPlatformOverrides] = useState({});

  useEffect(() => {
    if (propCampaignId) setLocalCampaignId(propCampaignId);
  }, [propCampaignId]);

  const togglePlatform = (key) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter(p => p !== key);
      }
      return [...prev, key];
    });
  };

  const handlePublishClick = () => {
    // Trigger verification modal instead of publishing immediately
    setVerificationModalOpen(true);
  };

  const handleAssistantGenerate = async (generatedData) => {
    // Handle the complex generation (hook, body, cta, platform variants)
    if (generatedData.baseCaption) {
      setContent(generatedData.baseCaption);
    }
    if (generatedData.platformVariants) {
      setPlatformOverrides(generatedData.platformVariants);
    }
    if (generatedData.platforms && generatedData.platforms.length > 0) {
      setSelectedPlatforms(generatedData.platforms);
    }
    setAssistantOpen(false);

    // Trigger Freepik Suggestion Engine
    setFreepikLoading(true);
    const intel = generateVisualIntelligence({
      caption: generatedData.baseCaption,
      goal: contentObjective,
      tone: 'Professional', // derived or mocked
      platforms: generatedData.platforms,
      topic: '' 
    });
    setStrategicAdvice(intel.strategicAdvice);
    const results = await fetchFreepikSuggestions(intel);
    setFreepikResults(results);
    setFreepikLoading(false);
  };

  const PLATFORMS = [
    { key: 'facebook',  label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'x',        label: 'X (Twitter)' },
    { key: 'linkedin',  label: 'LinkedIn' },
    { key: 'tiktok',   label: 'TikTok' },
    { key: 'youtube',   label: 'YouTube Community' },
    { key: 'shorts',   label: 'YouTube Shorts' },
    { key: 'pinterest', label: 'Pinterest' }
  ];

  return (
    <div id="tab-create-post" className="h-100 d-flex flex-column">
      
      {/* ── TOP ACTION BAR ── */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-0 fw-bold">Publishing Command Center</h5>
          <span className="extra-small text-muted">Create, verify, and execute strategic content.</span>
        </div>
        <div className="d-flex gap-2">
          <button className="btn-pilot" onClick={() => setAssistantOpen(true)}>
            <i className="fas fa-robot me-1"></i> myPilotPost Assistant
          </button>
        </div>
      </div>

      <div className="row g-3 flex-fill">
        
        {/* ── LEFT PANEL: Strategic Creation System ── */}
        <div className="col-lg-6 d-flex flex-column">
          <div className="card-workspace flex-fill d-flex flex-column">
            
            {/* Objective & Campaign */}
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <label className="extra-small fw-bold text-muted text-uppercase mb-1">Content Objective</label>
                <select 
                  className="form-select form-select-sm border-subtle"
                  value={contentObjective}
                  onChange={(e) => setContentObjective(e.target.value)}
                >
                  <option value="awareness">Awareness & Reach</option>
                  <option value="engagement">Community Engagement</option>
                  <option value="authority">Authority & Trust</option>
                  <option value="leadgen">Lead Generation</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="extra-small fw-bold text-muted text-uppercase mb-1">Campaign Link</label>
                <select 
                  className="form-select form-select-sm border-subtle"
                  value={selectedCampaignId}
                  onChange={(e) => setLocalCampaignId(e.target.value)}
                >
                  <option value="">No Campaign</option>
                  <option value="camp1">Q3 Growth Push</option>
                </select>
              </div>
            </div>

            {/* Platform Selector */}
            <label className="extra-small fw-bold text-muted text-uppercase mb-1">Target Platforms</label>
            <div className="d-flex flex-wrap gap-1 mb-3">
              {PLATFORMS.map(p => (
                <button
                  key={p.key}
                  className={`btn btn-sm ${selectedPlatforms.includes(p.key) ? 'btn-dark' : 'btn-outline-secondary'}`}
                  style={{ fontSize: 11, borderRadius: 20 }}
                  onClick={() => togglePlatform(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Main Editor */}
            <label className="extra-small fw-bold text-muted text-uppercase mb-1">Content</label>
            <textarea
              className="form-control border-subtle bg-light p-2 res-none small flex-fill mb-2"
              placeholder="Write your post content, or use myPilotPost Assistant to generate a strategic draft..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ minHeight: '150px' }}
            />

            {/* Platform Override Editor (Simple Tabs for selected platforms) */}
            {selectedPlatforms.length > 1 && (
              <div className="platform-overrides mb-3">
                <label className="extra-small fw-bold text-muted text-uppercase mb-1">Platform Customizations</label>
                <div className="d-flex gap-1 overflow-auto pb-1">
                  {selectedPlatforms.map(p => (
                    <button key={p} className="btn btn-sm btn-light border-subtle extra-small" onClick={() => {
                      const custom = prompt(`Override caption for ${p}:`, platformOverrides[p] || content);
                      if (custom !== null) {
                        setPlatformOverrides(prev => ({...prev, [p]: custom}));
                      }
                    }}>
                      {PLATFORMS.find(x => x.key === p)?.label} {platformOverrides[p] ? '✓' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Freepik Visual Suggestions Placeholder */}
            <div className="freepik-suggestions bg-white border-subtle rounded p-2 mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="extra-small fw-bold text-muted text-uppercase mb-0">Suggested Creative Assets</label>
                <span className="extra-small fw-bold text-primary"><i className="fas fa-magic"></i> AI Sourced</span>
              </div>
              
              {strategicAdvice && (
                <div className="alert alert-primary py-1 px-2 mb-2 extra-small border-0 bg-primary bg-opacity-10 d-flex gap-2 align-items-center">
                  <i className="fas fa-lightbulb text-primary"></i>
                  <span>{strategicAdvice}</span>
                </div>
              )}

              <div className="d-flex gap-2 overflow-auto py-1" style={{ scrollbarWidth: 'none' }}>
                {freepikLoading ? (
                  <div className="text-muted extra-small text-center w-100 py-3">
                    <div className="spinner-border spinner-border-sm text-primary mb-1"></div>
                    <div>Analyzing context & sourcing visuals...</div>
                  </div>
                ) : freepikResults.length > 0 ? (
                  freepikResults.map(res => (
                    <div key={res.id} className="position-relative" style={{ minWidth: 100, maxWidth: 100, borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => setMedia({ image: res.url, video: null })}>
                      <img src={res.thumbnail} style={{ width: '100%', height: 75, objectFit: 'cover' }} />
                      <div className="position-absolute bottom-0 w-100 p-1" style={{ background: 'rgba(0,0,0,0.6)' }}>
                        <div className="extra-small text-white text-truncate" style={{ fontSize: 9 }}>{res.styleTag}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted extra-small text-center w-100 py-3">
                    Generate content to see AI visual suggestions...
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── CENTER PANEL: Live Platform Rendering Engine ── */}
        <div className="col-lg-6 d-flex flex-column">
          <PlatformPreviewPanel 
            platforms={selectedPlatforms}
            content={content}
            overrides={platformOverrides}
            media={media}
          />
        </div>

      </div>

      {/* ── BOTTOM SCHEDULING CONTROLS ── */}
      <div className="card-workspace mt-3 d-flex justify-content-between align-items-center p-3">
        <div className="d-flex align-items-center gap-3">
          <div>
            <label className="extra-small fw-bold text-muted text-uppercase mb-0">Timezone</label>
            <div className="small fw-bold">{timezone}</div>
          </div>
          <div>
            <label className="extra-small fw-bold text-muted text-uppercase mb-0">Schedule Date</label>
            <input 
              type="datetime-local" 
              className="form-control form-control-sm border-subtle" 
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
            />
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn-grey">Save Draft</button>
          <button className="btn-pilot" onClick={handlePublishClick}>
            <i className="fas fa-check-circle me-1"></i> Verify & Publish
          </button>
        </div>
      </div>

      {/* Modals */}
      {assistantOpen && (
        <SocialAssistantModal 
          isOpen={assistantOpen} 
          onClose={() => setAssistantOpen(false)} 
          onComplete={handleAssistantGenerate} 
        />
      )}
      
      {verificationModalOpen && (
        <PostVerificationModal 
          isOpen={verificationModalOpen} 
          onClose={() => setVerificationModalOpen(false)}
          data={{
            platforms: selectedPlatforms,
            content,
            overrides: platformOverrides,
            media,
            scheduledTime,
            timezone,
            campaignId: selectedCampaignId
          }}
        />
      )}
    </div>
  );
}
