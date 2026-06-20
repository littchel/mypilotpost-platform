import React, { useState } from "react";
import { PLATFORM_LIMITS, validateContent } from "../../lib/platformRequirements";
import PlatformIcon from "../shared/PlatformIcon";

// ── Common styles ──────────────────────────────────────────────────────────────
const S = {
  feedCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    overflow: "hidden",
    width: "100%",
    maxWidth: 420,
    margin: "0 auto",
  },
  mobileCard: {
    background: "#000",
    borderRadius: 20,
    overflow: "hidden",
    width: 280,
    height: 498,
    margin: "0 auto",
    position: "relative",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  },
  avatar: (size = 32, radius = "50%") => ({
    width: size, height: size, borderRadius: radius,
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
  }),
  mediaBox: (h = 240) => ({
    width: "100%", height: h, background: "#f1f5f9",
    display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  }),
  emptyMedia: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    color: "#cbd5e1",
  },
  captionText: (size = 13) => ({
    fontSize: size, lineHeight: 1.5, color: "#1e293b",
  }),
  emptyCaption: {
    fontSize: 13, color: "#cbd5e1", fontStyle: "italic",
  },
  actionRow: {
    display: "flex", gap: 16, color: "#64748b", fontSize: 18, padding: "8px 12px",
  },
};

function BrandAvatar({ brandName, size = 32, radius = "50%" }) {
  const initials = brandName
    ? brandName.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase()
    : "B";
  return (
    <div style={{ ...S.avatar(size, radius), flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.38, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{initials}</span>
    </div>
  );
}

function PreviewOverlays({ overlays, height }) {
  if (!overlays) return null;
  const textLayers = overlays.overlay_text || [];
  const imageLayers = overlays.overlay_image || [];
  const allLayers = [
    ...textLayers.map(o => ({ ...o, kind: "text" })),
    ...imageLayers.map(o => ({ ...o, kind: "image" })),
  ].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4, overflow: "hidden" }}>
      {allLayers.map(o => {
        const commonStyle = {
          position: "absolute",
          left: `${o.x}%`,
          top: `${o.y}%`,
          width: `${o.w}%`,
          height: o.kind === "image" ? `${o.h}%` : "auto",
          transform: `rotate(${o.rotation || 0}deg)`,
          transformOrigin: "center",
          opacity: o.opacity ?? 1,
          zIndex: (o.z ?? 0) + 1,
        };

        if (o.kind === "image") {
          if (o.isShape) {
            return (
              <div
                key={o.id}
                style={{
                  ...commonStyle,
                  backgroundColor: o.color || "#2563eb",
                  borderRadius: o.shapeType === "circle" ? "50%" : 0,
                }}
              />
            );
          }
          return (
            <img
              key={o.id}
              src={o.url}
              alt=""
              style={{ ...commonStyle, objectFit: "cover" }}
            />
          );
        } else {
          // text or CTA
          if (o.isCTA) {
            return (
              <div
                key={o.id}
                style={{
                  ...commonStyle,
                  backgroundColor: o.ctaBgColor || "#2563eb",
                  borderRadius: `${o.ctaBorderRadius ?? 6}px`,
                  padding: `${o.ctaPadding / 3 ?? 2.5}px`,
                  color: o.color || "#ffffff",
                  fontFamily: o.fontFamily,
                  fontWeight: o.bold ? 700 : 400,
                  fontStyle: o.italic ? "italic" : "normal",
                  textAlign: o.align || "center",
                  fontSize: `${Math.max(6, (o.fontSize / 100) * height)}px`,
                  wordBreak: "break-word",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                }}
              >
                {o.text}
              </div>
            );
          }
          return (
            <div
              key={o.id}
              style={{
                ...commonStyle,
                color: o.color,
                fontFamily: o.fontFamily,
                fontWeight: o.bold ? 700 : 400,
                fontStyle: o.italic ? "italic" : "normal",
                textAlign: o.align || "center",
                lineHeight: 1.2,
                fontSize: `${Math.max(6, (o.fontSize / 100) * height)}px`,
                wordBreak: "break-word"
              }}
            >
              {o.text}
            </div>
          );
        }
      })}
    </div>
  );
}

function getMediaUrl(m) {
  if (!m) return null;
  return m.preview_url || m.url || m.image;
}

function isMediaVideo(m) {
  if (!m) return false;
  const mime = m.mime_type || "";
  const url = getMediaUrl(m) || "";
  return m.type === "video" || mime.startsWith("video/") || url.endsWith(".mp4") || url.endsWith(".mov") || url.includes("video");
}

function MediaArea({ media, platform, height = 240, overlays = null }) {
  const mediaItems = Array.isArray(media) ? media : (media ? [media] : []);
  const mainMedia = mediaItems[0];
  const isVideo = isMediaVideo(mainMedia);
  const mediaUrl = getMediaUrl(mainMedia);

  if (mediaUrl) {
    if (isVideo) {
      const isVerticalPlatform = platform === "instagram_story" || platform === "instagram_reel" || platform === "facebook_story" || platform === "facebook_reel" || platform === "shorts" || platform === "tiktok";
      return (
        <div style={{ ...S.mediaBox(height), position: "relative", background: "#000" }}>
          <video
            src={mediaUrl}
            autoPlay
            muted
            loop
            playsInline
            controls
            style={{ width: "100%", height: "100%", objectFit: isVerticalPlatform ? "contain" : "cover", background: "#000" }}
          />
          {/* Duration Badge */}
          {mainMedia?.duration && (
            <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, zIndex: 10 }}>
              {Math.round(mainMedia.duration)}s
            </div>
          )}
          {/* Overlays preview layered over video */}
          <PreviewOverlays overlays={overlays} height={height} />
          {/* Safe zone overlay for vertical platforms */}
          {isVerticalPlatform && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", border: "2px dashed rgba(239, 68, 68, 0.4)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 12, zIndex: 5 }}>
              <div style={{ fontSize: 9, color: "#ef4444", fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>SAFE ZONE (Header area)</div>
              <div style={{ display: "flex", justifyContent: "flex-end", flex: 1, alignItems: "center" }}>
                {/* Simulated vertical buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14, color: "#fff", fontSize: 16, textShadow: "0 1px 3px rgba(0,0,0,0.6)", paddingRight: 6 }}>
                  <i className="fas fa-heart"></i>
                  <i className="fas fa-comment"></i>
                  <i className="fas fa-share"></i>
                </div>
              </div>
              <div style={{ fontSize: 9, color: "#ef4444", fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.8)", textAlign: "center" }}>SAFE ZONE (Caption area)</div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ ...S.mediaBox(height), position: "relative", overflow: "hidden" }}>
        <img src={mediaUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <PreviewOverlays overlays={overlays} height={height} />
      </div>
    );
  }

  return (
    <div style={S.mediaBox(height)}>
      <div style={S.emptyMedia}>
        <i className="fas fa-photo-video" style={{ fontSize: 28 }}></i>
        <span style={{ fontSize: 11 }}>No media attached</span>
      </div>
    </div>
  );
}

function Caption({ text, limit, platformKey }) {
  const shown = text?.trim();
  const truncated = limit && shown && shown.length > limit;
  const display = truncated ? shown.slice(0, limit) + "… see more" : shown;
  return (
    <span>
      {display ? (
        <span style={S.captionText()}>{display}</span>
      ) : (
        <span style={S.emptyCaption}>Your caption will appear here…</span>
      )}
    </span>
  );
}

// ── Platform Renderers ─────────────────────────────────────────────────────────

const FacebookRenderer = ({ content, media, brandName, overlays }) => (
  <div style={S.feedCard}>
    <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
      <BrandAvatar brandName={brandName} size={36} radius={8} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1e21" }}>{brandName}</div>
        <div style={{ fontSize: 11, color: "#90949c" }}>Just now · <i className="fas fa-globe-americas" style={{ fontSize: 9 }}></i></div>
      </div>
    </div>
    <div style={{ padding: "0 14px 10px" }}>
      <Caption text={content} limit={500} />
    </div>
    <MediaArea media={media} platform="facebook" height={220} overlays={overlays} />
    <div style={{ padding: "4px 14px", display: "flex", gap: 2, borderTop: "1px solid #e4e6eb", color: "#65676b", fontSize: 12 }}>
      <button style={{ flex: 1, border: "none", background: "none", cursor: "pointer", padding: "8px 0", fontWeight: 600, color: "#65676b", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <i className="far fa-thumbs-up"></i> Like
      </button>
      <button style={{ flex: 1, border: "none", background: "none", cursor: "pointer", padding: "8px 0", fontWeight: 600, color: "#65676b", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <i className="far fa-comment"></i> Comment
      </button>
      <button style={{ flex: 1, border: "none", background: "none", cursor: "pointer", padding: "8px 0", fontWeight: 600, color: "#65676b", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <i className="fas fa-share"></i> Share
      </button>
    </div>
  </div>
);

const FacebookStoryRenderer = ({ content, media, brandName, overlays }) => {
  const mediaItems = Array.isArray(media) ? media : (media ? [media] : []);
  const mainMedia = mediaItems[0];
  const mediaUrl = getMediaUrl(mainMedia);
  const isVideo = isMediaVideo(mainMedia);
  const handle = brandName || "Your Brand";

  return (
    <div style={S.mobileCard}>
      <div style={{ position: "absolute", inset: 0, background: "#1a1a1a" }}>
        {mediaUrl ? (
          isVideo ? (
            <video
              src={mediaUrl}
              autoPlay
              muted
              loop
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <img
              src={mediaUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )
        ) : (
          <div style={{ ...S.mediaBox(498), background: "#262626" }}>
            <div style={S.emptyMedia}>
              <i className="fas fa-photo-video" style={{ fontSize: 32 }}></i>
              <span style={{ fontSize: 12 }}>Story Preview</span>
            </div>
          </div>
        )}
        <PreviewOverlays overlays={overlays} height={498} />
      </div>

      {/* Story Progress Indicators */}
      <div style={{ position: "absolute", top: 12, left: 8, right: 8, display: "flex", gap: 4, zIndex: 10 }}>
        <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.8)", borderRadius: 1 }}></div>
        <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.35)", borderRadius: 1 }}></div>
      </div>

      {/* Story Profile Header */}
      <div style={{ position: "absolute", top: 22, left: 10, right: 10, display: "flex", alignItems: "center", gap: 8, zIndex: 10 }}>
        <BrandAvatar brandName={brandName} size={28} radius={8} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>{handle}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>Just now</span>
        <span style={{ marginLeft: "auto", color: "#fff", fontSize: 16, cursor: "pointer", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>✕</span>
      </div>

      {/* Story overlay text caption */}
      {content && (
        <div style={{ position: "absolute", bottom: 20, left: 16, right: 16, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)", borderRadius: 8, padding: "8px 12px", zIndex: 10, border: "1px solid rgba(255,255,255,0.15)" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#fff", lineHeight: 1.4, wordBreak: "break-word" }}>
            {content.slice(0, 150)}{content.length > 150 ? "..." : ""}
          </p>
        </div>
      )}
    </div>
  );
};

const FacebookReelRenderer = ({ content, media, brandName, overlays }) => {
  const mediaItems = Array.isArray(media) ? media : (media ? [media] : []);
  const mainMedia = mediaItems[0];
  const mediaUrl = getMediaUrl(mainMedia);
  const handle = brandName || "Your Brand";

  return (
    <div style={S.mobileCard}>
      <div style={{ position: "absolute", inset: 0, background: "#000" }}>
        {mediaUrl ? (
          <video
            src={mediaUrl}
            autoPlay
            muted
            loop
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ ...S.mediaBox(498), background: "#1a1a1a" }}>
            <div style={S.emptyMedia}>
              <i className="fas fa-video" style={{ fontSize: 32 }}></i>
              <span style={{ fontSize: 12 }}>Reel Preview</span>
            </div>
          </div>
        )}
        <PreviewOverlays overlays={overlays} height={498} />
      </div>

      {/* Reel Info Controls Overlay */}
      <div style={{ position: "absolute", bottom: 16, left: 12, right: 48, zIndex: 10, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <BrandAvatar brandName={brandName} size={26} radius={6} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>{handle}</span>
          <button style={{ border: "none", background: "#1877F2", color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>Follow</button>
        </div>

        <div style={{ fontSize: 11, lineHeight: 1.4, marginBottom: 8, maxHeight: 60, overflow: "hidden" }}>
          {content ? (content.length > 90 ? content.slice(0, 90) + "..." : content) : <span style={{ color: "#bbb" }}>Reel description...</span>}
        </div>
      </div>

      {/* Right side interaction buttons */}
      <div style={{ position: "absolute", bottom: 20, right: 8, zIndex: 10, display: "flex", flexDirection: "column", gap: 16, alignItems: "center", color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <i className="fas fa-thumbs-up" style={{ fontSize: 20 }}></i>
          <span style={{ fontSize: 10, marginTop: 4 }}>Like</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <i className="fas fa-comment" style={{ fontSize: 20 }}></i>
          <span style={{ fontSize: 10, marginTop: 4 }}>0</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <i className="fas fa-share" style={{ fontSize: 18 }}></i>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <i className="fas fa-ellipsis-h" style={{ fontSize: 16 }}></i>
        </div>
      </div>
    </div>
  );
};

const InstagramFeedRenderer = ({ content, media, brandName, overlays }) => {
  const handle = brandName?.toLowerCase().replace(/\s+/g, "") || "yourbrand";
  const mediaItems = Array.isArray(media) ? media : (media ? [media] : []);
  const mainMedia = mediaItems[0];
  return (
    <div style={S.feedCard}>
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #efefef" }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{handle[0]?.toUpperCase()}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{handle}</span>
        <span style={{ marginLeft: "auto", fontSize: 18, color: "#262626" }}>···</span>
      </div>
      <MediaArea media={mainMedia} platform="instagram" height={300} overlays={overlays} />
      <div style={{ padding: "10px 12px" }}>
        <div style={S.actionRow}>
          <i className="far fa-heart"></i>
          <i className="far fa-comment"></i>
          <i className="far fa-paper-plane"></i>
          <i className="far fa-bookmark" style={{ marginLeft: "auto" }}></i>
        </div>
        <div style={{ padding: "0 2px" }}>
          <div style={{ fontSize: 13, lineHeight: 1.4 }}>
            <span style={{ fontWeight: 700, marginRight: 6 }}>{handle}</span>
            <Caption text={content} limit={125} />
          </div>
        </div>
      </div>
    </div>
  );
};

const InstagramStoryRenderer = ({ content, media, brandName, overlays }) => {
  const mediaItems = Array.isArray(media) ? media : (media ? [media] : []);
  const mainMedia = mediaItems[0];
  const mediaUrl = getMediaUrl(mainMedia);
  const isVideo = isMediaVideo(mainMedia);
  const handle = brandName?.toLowerCase().replace(/\s+/g, "") || "yourbrand";

  return (
    <div style={S.mobileCard}>
      <div style={{ position: "absolute", inset: 0, background: "#1a1a1a" }}>
        {mediaUrl ? (
          isVideo ? (
            <video
              src={mediaUrl}
              autoPlay
              muted
              loop
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <img
              src={mediaUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )
        ) : (
          <div style={{ ...S.mediaBox(498), background: "#262626" }}>
            <div style={S.emptyMedia}>
              <i className="fas fa-photo-video" style={{ fontSize: 32 }}></i>
              <span style={{ fontSize: 12 }}>Story Preview</span>
            </div>
          </div>
        )}
        <PreviewOverlays overlays={overlays} height={498} />
      </div>

      {/* Story Progress Indicators */}
      <div style={{ position: "absolute", top: 12, left: 8, right: 8, display: "flex", gap: 4, zIndex: 10 }}>
        <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.8)", borderRadius: 1 }}></div>
        <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.35)", borderRadius: 1 }}></div>
        <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.35)", borderRadius: 1 }}></div>
      </div>

      {/* Story Profile Header */}
      <div style={{ position: "absolute", top: 22, left: 10, right: 10, display: "flex", alignItems: "center", gap: 8, zIndex: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #fff" }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: "#fff" }}>{handle[0]?.toUpperCase()}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>{handle}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>1h</span>
        <span style={{ marginLeft: "auto", color: "#fff", fontSize: 16, cursor: "pointer", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>✕</span>
      </div>

      {/* Story overlay text caption */}
      {content && (
        <div style={{ position: "absolute", bottom: 20, left: 16, right: 16, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)", borderRadius: 8, padding: "8px 12px", zIndex: 10, border: "1px solid rgba(255,255,255,0.15)" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#fff", lineHeight: 1.4, wordBreak: "break-word" }}>
            {content.slice(0, 150)}{content.length > 150 ? "..." : ""}
          </p>
        </div>
      )}
    </div>
  );
};

const InstagramReelRenderer = ({ content, media, brandName, overlays }) => {
  const mediaItems = Array.isArray(media) ? media : (media ? [media] : []);
  const mainMedia = mediaItems[0];
  const mediaUrl = getMediaUrl(mainMedia);
  const handle = brandName?.toLowerCase().replace(/\s+/g, "") || "yourbrand";

  return (
    <div style={S.mobileCard}>
      <div style={{ position: "absolute", inset: 0, background: "#000" }}>
        {mediaUrl ? (
          <video
            src={mediaUrl}
            autoPlay
            muted
            loop
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ ...S.mediaBox(498), background: "#1a1a1a" }}>
            <div style={S.emptyMedia}>
              <i className="fas fa-video" style={{ fontSize: 32 }}></i>
              <span style={{ fontSize: 12 }}>Reel Preview</span>
            </div>
          </div>
        )}
        <PreviewOverlays overlays={overlays} height={498} />
      </div>

      {/* Reel Info Controls Overlay */}
      <div style={{ position: "absolute", bottom: 16, left: 12, right: 48, zIndex: 10, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: "#000" }}>{handle[0]?.toUpperCase()}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700 }}>{handle}</span>
          <button style={{ border: "1px solid #fff", background: "none", color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>Follow</button>
        </div>

        <div style={{ fontSize: 11, lineHeight: 1.4, marginBottom: 8, maxHeight: 60, overflow: "hidden" }}>
          {content ? (content.length > 90 ? content.slice(0, 90) + "..." : content) : <span style={{ color: "#bbb" }}>Reel caption...</span>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#e2e8f0" }}>
          <i className="fas fa-music"></i>
          <span>Original Audio - {brandName}</span>
        </div>
      </div>

      {/* Right side interaction buttons */}
      <div style={{ position: "absolute", bottom: 20, right: 8, zIndex: 10, display: "flex", flexDirection: "column", gap: 16, alignItems: "center", color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <i className="fas fa-heart" style={{ fontSize: 20 }}></i>
          <span style={{ fontSize: 10, marginTop: 4 }}>Like</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <i className="fas fa-comment" style={{ fontSize: 20 }}></i>
          <span style={{ fontSize: 10, marginTop: 4 }}>0</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <i className="fas fa-paper-plane" style={{ fontSize: 18 }}></i>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <i className="fas fa-ellipsis-h" style={{ fontSize: 16 }}></i>
        </div>
        <div style={{ width: 24, height: 24, borderRadius: 4, border: "2px solid #fff", background: "#333", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 8 }}>
          <i className="fas fa-music" style={{ fontSize: 9 }}></i>
        </div>
      </div>
    </div>
  );
};

const InstagramCarouselRenderer = ({ content, media, brandName, overlays }) => {
  const mediaItems = Array.isArray(media) ? media : (media ? [media] : []);
  const [activeIndex, setActiveIndex] = useState(0);
  const handle = brandName?.toLowerCase().replace(/\s+/g, "") || "yourbrand";

  const nextSlide = (e) => {
    e.stopPropagation();
    if (mediaItems.length > 0) {
      setActiveIndex((prev) => (prev + 1) % mediaItems.length);
    }
  };

  const prevSlide = (e) => {
    e.stopPropagation();
    if (mediaItems.length > 0) {
      setActiveIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
    }
  };

  const currentMedia = mediaItems[activeIndex];

  return (
    <div style={S.feedCard}>
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #efefef" }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{handle[0]?.toUpperCase()}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{handle}</span>
        <span style={{ marginLeft: "auto", fontSize: 18, color: "#262626" }}>···</span>
      </div>

      <div style={{ position: "relative", width: "100%", height: 300, background: "#f1f5f9" }}>
        {currentMedia ? (
          <MediaArea media={currentMedia} platform="instagram_carousel" height={300} overlays={overlays} />
        ) : (
          <div style={S.mediaBox(300)}>
            <div style={S.emptyMedia}>
              <i className="fas fa-photo-video" style={{ fontSize: 28 }}></i>
              <span style={{ fontSize: 11 }}>No media attached</span>
            </div>
          </div>
        )}

        {mediaItems.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              style={{
                position: "absolute",
                top: "50%",
                left: 10,
                transform: "translateY(-50%)",
                background: "rgba(255, 255, 255, 0.8)",
                border: "none",
                borderRadius: "50%",
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                zIndex: 10,
              }}
            >
              <i className="fas fa-chevron-left" style={{ color: "#333", fontSize: 12 }}></i>
            </button>
            <button
              onClick={nextSlide}
              style={{
                position: "absolute",
                top: "50%",
                right: 10,
                transform: "translateY(-50%)",
                background: "rgba(255, 255, 255, 0.8)",
                border: "none",
                borderRadius: "50%",
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                zIndex: 10,
              }}
            >
              <i className="fas fa-chevron-right" style={{ color: "#333", fontSize: 12 }}></i>
            </button>
            
            <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 5, zIndex: 10 }}>
              {mediaItems.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: i === activeIndex ? "#0095f6" : "rgba(255,255,255,0.6)",
                    transition: "background-color 0.2s"
                  }}
                />
              ))}
            </div>

            <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.7)", color: "#fff", padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, zIndex: 10 }}>
              {activeIndex + 1}/{mediaItems.length}
            </div>
          </>
        )}
      </div>

      <div style={{ padding: "10px 12px" }}>
        <div style={S.actionRow}>
          <i className="far fa-heart"></i>
          <i className="far fa-comment"></i>
          <i className="far fa-paper-plane"></i>
          <i className="far fa-bookmark" style={{ marginLeft: "auto" }}></i>
        </div>
        <div style={{ padding: "0 2px" }}>
          <div style={{ fontSize: 13, lineHeight: 1.4 }}>
            <span style={{ fontWeight: 700, marginRight: 6 }}>{handle}</span>
            <Caption text={content} limit={125} />
          </div>
        </div>
      </div>
    </div>
  );
};

const InstagramRenderer = ({ content, media, brandName, overlays }) => {
  const [format, setFormat] = useState("feed");
  const mediaItems = Array.isArray(media) ? media : (media ? [media] : []);
  const hasMultiple = mediaItems.length > 1;
  const firstItem = mediaItems[0];
  const isVideo = isMediaVideo(firstItem);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
      {/* Dynamic sub-format switcher for Instagram */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 6 }}>
        {["feed", "story", "reel", "carousel"].map((fmt) => {
          const disabled = (fmt === "carousel" && !hasMultiple) || (fmt === "reel" && !isVideo && mediaItems.length > 0);
          return (
            <button
              key={fmt}
              disabled={disabled}
              onClick={() => setFormat(fmt)}
              style={{
                border: "none",
                background: format === fmt ? "#0095f6" : "#f1f5f9",
                color: format === fmt ? "#fff" : (disabled ? "#cbd5e1" : "#475569"),
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: 10,
                fontWeight: 700,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
              }}
            >
              {fmt.toUpperCase()}
            </button>
          );
        })}
      </div>

      {format === "feed" && (
        <InstagramFeedRenderer content={content} media={media} brandName={brandName} overlays={overlays} />
      )}
      {format === "story" && (
        <InstagramStoryRenderer content={content} media={media} brandName={brandName} overlays={overlays} />
      )}
      {format === "reel" && (
        <InstagramReelRenderer content={content} media={media} brandName={brandName} overlays={overlays} />
      )}
      {format === "carousel" && (
        <InstagramCarouselRenderer content={content} media={media} brandName={brandName} overlays={overlays} />
      )}
    </div>
  );
};

const LinkedInRenderer = ({ content, media, brandName, overlays }) => (
  <div style={S.feedCard}>
    <div style={{ padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
      <BrandAvatar brandName={brandName} size={40} radius={4} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#000" }}>{brandName}</div>
        <div style={{ fontSize: 11, color: "#666" }}>1,234 followers</div>
        <div style={{ fontSize: 10, color: "#999" }}>Just now · <i className="fas fa-globe-americas" style={{ fontSize: 9 }}></i></div>
      </div>
      <button style={{ marginLeft: "auto", border: "1px solid #0a66c2", background: "none", color: "#0a66c2", borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Follow</button>
    </div>
    <div style={{ padding: "0 14px 10px", fontSize: 13, lineHeight: 1.6, color: "#000" }}>
      <Caption text={content} limit={210} />
    </div>
    <MediaArea media={media} platform="linkedin" height={196} overlays={overlays} />
    <div style={{ padding: "8px 14px", borderTop: "1px solid #e0e0e0", display: "flex", justifyContent: "space-around", color: "#666", fontSize: 12, fontWeight: 600 }}>
      <span><i className="far fa-thumbs-up me-1"></i>Like</span>
      <span><i className="far fa-comment me-1"></i>Comment</span>
      <span><i className="fas fa-retweet me-1"></i>Repost</span>
      <span><i className="fas fa-share me-1"></i>Send</span>
    </div>
  </div>
);

const XRenderer = ({ content, media, brandName, overlays }) => {
  const hasMedia = Array.isArray(media) ? (media.length > 0 && getMediaUrl(media[0])) : (media && getMediaUrl(media));
  return (
    <div style={S.feedCard}>
      <div style={{ padding: "14px 16px", display: "flex", gap: 10 }}>
        <BrandAvatar brandName={brandName} size={40} radius="50%" />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#0f1419" }}>{brandName}</span>
            <i className="fas fa-circle-check" style={{ color: "#1d9bf0", fontSize: 12 }}></i>
            <span style={{ fontSize: 13, color: "#536471" }}>@{brandName?.toLowerCase().replace(/\s+/g, "")} · now</span>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: "#0f1419", marginBottom: 10 }}>
            <Caption text={content} limit={280} />
          </div>
          {hasMedia && <MediaArea media={media} platform="x" height={180} overlays={overlays} />}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, color: "#536471", fontSize: 18, maxWidth: 300 }}>
            <i className="far fa-comment"></i>
            <i className="fas fa-retweet"></i>
            <i className="far fa-heart"></i>
            <i className="fas fa-chart-bar"></i>
            <i className="fas fa-upload"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

const TikTokRenderer = ({ content, media, overlays }) => (
  <div style={S.mobileCard}>
    <div style={{ position: "absolute", inset: 0, background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <MediaArea media={media} platform="tiktok" height={498} overlays={overlays} />
    </div>
    {/* Safe zone overlays */}
    <div style={{ position: "absolute", top: 0, inset: "0 0 auto", height: "14%", background: "rgba(239,68,68,0.15)", borderBottom: "1px dashed #ef4444", zIndex: 5 }}>
      <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 700, padding: 4 }}>TOP UI OVERLAP</span>
    </div>
    <div style={{ position: "absolute", right: 0, top: "38%", width: "15%", height: "38%", background: "rgba(239,68,68,0.15)", borderLeft: "1px dashed #ef4444", zIndex: 5 }}></div>
    <div style={{ position: "absolute", bottom: 0, inset: "auto 0 0", height: "24%", background: "rgba(239,68,68,0.12)", borderTop: "1px dashed #ef4444", zIndex: 5 }}>
      <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 700, padding: 4 }}>CAPTION OVERLAP</span>
    </div>
    {/* UI overlay */}
    <div style={{ position: "absolute", bottom: 60, left: 10, right: 50, zIndex: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 4 }}>@yourbrand</div>
      <div style={{ fontSize: 11, color: "#fff", lineHeight: 1.3 }}>
        {content ? content.slice(0, 80) + (content.length > 80 ? "…" : "") : <span style={{ color: "#666" }}>Caption…</span>}
      </div>
    </div>
    <div style={{ position: "absolute", bottom: 80, right: 10, zIndex: 10, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
      {["heart", "comment", "share"].map(i => (
        <div key={i} style={{ textAlign: "center" }}>
          <i className={`fas fa-${i}`} style={{ color: "#fff", fontSize: 22 }}></i>
          <div style={{ fontSize: 9, color: "#fff" }}>0</div>
        </div>
      ))}
    </div>
  </div>
);

const PinterestRenderer = ({ content, media, brandName, overlays }) => (
  <div style={{ ...S.feedCard, maxWidth: 280, borderRadius: 16 }}>
    <div style={{ position: "relative", borderRadius: "16px 16px 0 0", overflow: "hidden" }}>
      <MediaArea media={media} platform="pinterest" height={340} overlays={overlays} />
      <div style={{ position: "absolute", bottom: 10, left: 10, right: 10 }}>
        <button style={{ width: "100%", background: "#e60023", border: "none", borderRadius: 20, color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 0", cursor: "pointer" }}>Save</button>
      </div>
    </div>
    <div style={{ padding: "12px 14px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 4, lineHeight: 1.3 }}>
        {content?.trim().split("\n")[0] || <span style={S.emptyCaption}>Pin title…</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
        <BrandAvatar brandName={brandName} size={20} radius="50%" />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#111" }}>{brandName?.toLowerCase().replace(/\s+/g, "") || "yourbrand"}</span>
      </div>
    </div>
  </div>
);

const ThreadsRenderer = ({ content, media, brandName, overlays }) => {
  const hasMedia = Array.isArray(media) ? (media.length > 0 && getMediaUrl(media[0])) : (media && getMediaUrl(media));
  return (
    <div style={S.feedCard}>
      <div style={{ padding: "14px 16px", display: "flex", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <BrandAvatar brandName={brandName} size={36} radius="50%" />
          <div style={{ flex: 1, width: 2, background: "#e2e8f0", margin: "6px 0", minHeight: 20 }}></div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{brandName?.toLowerCase().replace(/\s+/g, "") || "yourbrand"}</span>
            <span style={{ fontSize: 12, color: "#999" }}>· now</span>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: "#0f1419", marginBottom: 8 }}>
            <Caption text={content} limit={500} />
          </div>
          {hasMedia && <MediaArea media={media} platform="threads" height={180} overlays={overlays} />}
          <div style={{ display: "flex", gap: 16, marginTop: 10, color: "#999", fontSize: 18 }}>
            <i className="far fa-heart"></i>
            <i className="far fa-comment"></i>
            <i className="fas fa-retweet"></i>
            <i className="far fa-paper-plane"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

const YouTubeRenderer = ({ content, media, brandName, overlays }) => (
  <div style={S.feedCard}>
    <div style={{ position: "relative", background: "#000" }}>
      <MediaArea media={media} platform="youtube" height={180} overlays={overlays} />
      <div style={{ position: "absolute", bottom: 6, right: 8, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 5px", borderRadius: 3 }}>0:00</div>
    </div>
    <div style={{ padding: "10px 12px", display: "flex", gap: 10 }}>
      <BrandAvatar brandName={brandName} size={36} radius="50%" />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f0f0f", lineHeight: 1.3, marginBottom: 3 }}>
          {content?.trim().split("\n")[0] || <span style={S.emptyCaption}>Video title…</span>}
        </div>
        <div style={{ fontSize: 11, color: "#606060" }}>{brandName} · 0 views · now</div>
      </div>
    </div>
  </div>
);

const ShortsRenderer = ({ content, media, brandName, overlays }) => (
  <div style={S.mobileCard}>
    <div style={{ position: "absolute", inset: 0, background: "#0f0f0f" }}>
      <MediaArea media={media} platform="shorts" height={498} overlays={overlays} />
    </div>
    <div style={{ position: "absolute", bottom: 40, left: 10, right: 60, zIndex: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <div style={{ ...S.avatar(20, "50%"), background: "#fff" }}></div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>@{brandName?.toLowerCase().replace(/\s+/g, "") || "yourbrand"}</span>
        <button style={{ background: "#fff", color: "#000", border: "none", borderRadius: 4, fontSize: 10, padding: "2px 7px", fontWeight: 700 }}>Subscribe</button>
      </div>
      <div style={{ fontSize: 11, color: "#fff", lineHeight: 1.3 }}>
        {content ? content.slice(0, 80) : <span style={{ color: "#555" }}>Shorts title…</span>}
      </div>
    </div>
    <div style={{ position: "absolute", bottom: 80, right: 10, zIndex: 5, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
      {["heart", "comment", "share"].map(i => (
        <div key={i} style={{ textAlign: "center" }}>
          <i className={`fas fa-${i}`} style={{ color: "#fff", fontSize: 22 }}></i>
        </div>
      ))}
    </div>
  </div>
);

const WordPressRenderer = ({ content, media, brandName, overlays }) => (
  <div style={S.feedCard}>
    <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #edf2f7" }}>
      <BrandAvatar brandName={brandName} size={36} radius={8} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#2d3748" }}>{brandName} Blog</div>
        <div style={{ fontSize: 11, color: "#718096" }}>WordPress Post</div>
      </div>
    </div>
    <div style={{ padding: "16px 14px 10px" }}>
      <Caption text={content} limit={1000} />
    </div>
    {media && <MediaArea media={media} platform="wordpress" height={220} overlays={overlays} />}
  </div>
);

const WordPressEcommerceRenderer = ({ content, media, brandName, overlays }) => (
  <div style={S.feedCard}>
    <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #edf2f7" }}>
      <BrandAvatar brandName={brandName} size={36} radius={8} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#2d3748" }}>{brandName} Store</div>
        <div style={{ fontSize: 11, color: "#96588A", fontWeight: 600 }}>WooCommerce Product</div>
      </div>
    </div>
    {media && <MediaArea media={media} platform="wordpress_ecommerce" height={260} overlays={overlays} />}
    <div style={{ padding: "16px 14px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#2d3748", marginBottom: 6 }}>Product Details</div>
      <div style={{ display: "inline-block", background: "#f0fdf4", color: "#166534", fontSize: 12, fontWeight: 700, padding: "2px 6px", borderRadius: 4, marginBottom: 10 }}>
        $0.00 (Active product)
      </div>
      <Caption text={content} limit={500} />
    </div>
  </div>
);

const RENDERERS = {
  facebook:  FacebookRenderer,
  facebook_story: FacebookStoryRenderer,
  facebook_reel: FacebookReelRenderer,
  instagram: InstagramRenderer,
  instagram_story: InstagramStoryRenderer,
  instagram_reel: InstagramReelRenderer,
  instagram_carousel: InstagramCarouselRenderer,
  linkedin:  LinkedInRenderer,
  x:         XRenderer,
  tiktok:    TikTokRenderer,
  pinterest: PinterestRenderer,
  threads:   ThreadsRenderer,
  youtube:   YouTubeRenderer,
  shorts:    ShortsRenderer,
  wordpress: WordPressRenderer,
  wordpress_ecommerce: WordPressEcommerceRenderer,
};

// ── Platform labels ────────────────────────────────────────────────────────────
const PLABELS = {
  facebook: "Facebook Feed",
  facebook_story: "Facebook Story",
  facebook_reel: "Facebook Reel",
  instagram: "Instagram Feed",
  instagram_story: "Instagram Story",
  instagram_reel: "Instagram Reel",
  instagram_carousel: "Instagram Carousel",
  linkedin: "LinkedIn",
  x: "X",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  threads: "Threads",
  youtube: "YouTube",
  shorts: "Shorts",
  wordpress: "WordPress Blog",
  wordpress_ecommerce: "WooCommerce Store",
};

// ── Main Panel ─────────────────────────────────────────────────────────────────
export default function PlatformPreviewPanel({ platforms = [], content = "", overrides = {}, media = null, brandName = "Your Brand", isLiveEditor = true, overlays = null }) {
  const [activeTab, setActiveTab] = useState(platforms[0] || "facebook");

  const safeTab = platforms.includes(activeTab) ? activeTab : (platforms[0] || "facebook");

  const currentContent = overrides[safeTab] || content;
  const mediaItems = Array.isArray(media) ? media : (media ? [media] : []);
  const mainMedia = mediaItems[0];
  const mediaType = mainMedia?.type || (mainMedia?.mime_type?.startsWith("video/") ? "video" : (getMediaUrl(mainMedia) ? "image" : null));
  const mediaMeta = mainMedia ? { ratio: mainMedia.width && mainMedia.height ? `${mainMedia.width}:${mainMedia.height}` : (mainMedia.ratio || null), duration: mainMedia.duration } : null;
  const validation = validateContent(safeTab, currentContent, mediaType, mediaMeta);
  const Renderer = RENDERERS[safeTab] || FacebookRenderer;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span className="extra-small fw-bold text-muted text-uppercase" style={{ letterSpacing: 1 }}>
            {isLiveEditor ? "Live Platform Rendering Engine" : "Saved Content Preview"}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: isLiveEditor ? "#94a3b8" : "#2563eb",
            background: isLiveEditor ? "transparent" : "#eff6ff",
            padding: isLiveEditor ? 0 : "2px 8px", borderRadius: 20,
          }}>
            {isLiveEditor ? "Updates instantly" : "Viewing saved content"}
          </span>
        </div>

        {/* Platform tabs */}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
          {platforms.map(p => (
            <button
              key={p}
              onClick={() => setActiveTab(p)}
              style={{
                border: "1px solid " + (safeTab === p ? "#0f172a" : "#e2e8f0"),
                background: safeTab === p ? "#0f172a" : "#fff",
                color: safeTab === p ? "#fff" : "#64748b",
                borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 600,
                cursor: "pointer", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 5
              }}
            >
              <PlatformIcon platform={p} size={12} color={safeTab === p ? "#fff" : undefined} />
              {PLABELS[p] || p}
            </button>
          ))}
        </div>
      </div>

      {/* Validation ribbon */}
      {validation.state !== "SAFE" && (
        <div style={{
          background: validation.state === "BLOCKED" ? "#fef2f2" : "#fffbeb",
          color: validation.state === "BLOCKED" ? "#dc2626" : "#d97706",
          padding: "7px 16px", fontSize: 11, fontWeight: 600,
          borderBottom: "1px solid " + (validation.state === "BLOCKED" ? "#fecaca" : "#fde68a"),
          display: "flex", alignItems: "center", gap: 6
        }}>
          <i className={`fas fa-${validation.state === "BLOCKED" ? "ban" : "exclamation-triangle"}`}></i>
          {validation.messages.join(" ")}
        </div>
      )}

      {/* Renderer area */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
        <div style={{ width: "100%" }}>
          <Renderer platform={safeTab} content={currentContent} media={media} brandName={brandName} overlays={overlays} />
        </div>
      </div>

    </div>
  );
}
