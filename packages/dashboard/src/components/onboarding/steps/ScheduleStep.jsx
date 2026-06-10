import React, { useState } from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { apiRequest } from '../../../lib/api/client';

const ScheduleStep = () => {
  const { data, step, updateStep, trackOnboardingEvent } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSchedule = async (type) => {
    setLoading(true);
    setError("");
    try {
      // Scheduled time: now+1min for "post now", tomorrow for "later"
      const date = new Date();
      if (type === 'later') {
        date.setDate(date.getDate() + 1);
      } else {
        date.setMinutes(date.getMinutes() + 1);
      }

      // generatedContent is stored in-memory by GenerationStep.
      // Social generation has no content_id, so save a draft first to get one.
      const generated = data.generatedContent;
      let contentId = generated?.content_id;

      if (!contentId && generated?.posts?.[0]) {
        const post = generated.posts[0];
        const platform = post.platform || "instagram";
        const saveRes = await apiRequest("/api/customer/content/social", {
          method: "POST",
          body: JSON.stringify({
            text: post.baseCaption || post.content || "",
            platforms: [platform],
            lifecycle_status: "approved"
          })
        });
        contentId = saveRes?.content_id;

        if (contentId) {
          await apiRequest("/api/customer/schedule", {
            method: "POST",
            body: JSON.stringify({
              content_id: contentId,
              content_type: "social",
              platform,
              scheduled_at: date.toISOString()
            })
          });
          trackOnboardingEvent("first_post_scheduled", { type, content_id: contentId });
        }
      } else if (contentId) {
        const platform = generated?.posts?.[0]?.platform || "instagram";
        await apiRequest("/api/customer/schedule", {
          method: "POST",
          body: JSON.stringify({
            content_id: contentId,
            content_type: "social",
            platform,
            scheduled_at: date.toISOString()
          })
        });
        trackOnboardingEvent("first_post_scheduled", { type, content_id: contentId });
      }

      await updateStep(step + 1, { isScheduled: true, scheduledContentId: contentId });
    } catch {
      setError("Scheduling failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-card text-center">
      <div className="mb-4">
        <i className="fas fa-calendar-check text-success" style={{ fontSize: '3rem' }}></i>
      </div>
      <h2 className="fw-bold mb-2">First success! Ready to schedule?</h2>
      <p className="text-muted mb-4 small">Complete the loop and get your content in front of your audience.</p>

      {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

      <div className="d-grid gap-3">
        <button
          className="btn btn-pilot-ob"
          onClick={() => handleSchedule('now')}
          disabled={loading}
        >
          {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fas fa-paper-plane me-2"></i>}
          Post Now
        </button>
        <button
          className="btn btn-grey"
          onClick={() => handleSchedule('later')}
          disabled={loading}
        >
          {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fas fa-clock me-2"></i>}
          Schedule for Tomorrow
        </button>
        <button
          className="btn btn-link text-muted small"
          onClick={() => updateStep(step + 1, { isScheduled: false })}
          disabled={loading}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default ScheduleStep;
