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

function MediaArea({ media, platform, height = 240 }) {
  if (media?.image) {
    return (
      <div style={S.mediaBox(height)}>
        <img src={media.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div style={S.mediaBox(height)}>
      <div style={S.emptyMedia}>
        <i className="fas fa-image" style={{ fontSize: 28 }}></i>
        <span style={{ fontSize: 11 }}>No media</span>
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

const FacebookRenderer = ({ content, media, brandName }) => (
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
    <MediaArea media={media} platform="facebook" height={220} />
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

const InstagramRenderer = ({ content, media, brandName }) => {
  const handle = brandName?.toLowerCase().replace(/\s+/g, "") || "yourbrand";
  return (
  <div style={S.feedCard}>
    <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #efefef" }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{handle[0]?.toUpperCase()}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{handle}</span>
      <span style={{ marginLeft: "auto", fontSize: 18, color: "#262626" }}>···</span>
    </div>
    <MediaArea media={media} platform="instagram" height={300} />
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

const LinkedInRenderer = ({ content, media, brandName }) => (
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
    <MediaArea media={media} platform="linkedin" height={196} />
    <div style={{ padding: "8px 14px", borderTop: "1px solid #e0e0e0", display: "flex", justifyContent: "space-around", color: "#666", fontSize: 12, fontWeight: 600 }}>
      <span><i className="far fa-thumbs-up me-1"></i>Like</span>
      <span><i className="far fa-comment me-1"></i>Comment</span>
      <span><i className="fas fa-retweet me-1"></i>Repost</span>
      <span><i className="fas fa-share me-1"></i>Send</span>
    </div>
  </div>
);

const XRenderer = ({ content, media, brandName }) => (
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
        {media?.image && <MediaArea media={media} platform="x" height={180} />}
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

const TikTokRenderer = ({ content, media }) => (
  <div style={S.mobileCard}>
    <div style={{ position: "absolute", inset: 0, background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {media?.image
        ? <img src={media.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ color: "#333", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <i className="fab fa-tiktok" style={{ fontSize: 40 }}></i>
            <span style={{ fontSize: 11, color: "#555" }}>Video Media</span>
          </div>
      }
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

const PinterestRenderer = ({ content, media, brandName }) => (
  <div style={{ ...S.feedCard, maxWidth: 280, borderRadius: 16 }}>
    <div style={{ position: "relative", borderRadius: "16px 16px 0 0", overflow: "hidden" }}>
      <MediaArea media={media} platform="pinterest" height={340} />
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

const ThreadsRenderer = ({ content, media, brandName }) => (
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
        {media?.image && <MediaArea media={media} platform="threads" height={180} />}
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

const YouTubeRenderer = ({ content, media, brandName }) => (
  <div style={S.feedCard}>
    <div style={{ position: "relative", background: "#000" }}>
      <MediaArea media={media} platform="youtube" height={180} />
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

const ShortsRenderer = ({ content, media }) => (
  <div style={S.mobileCard}>
    <div style={{ position: "absolute", inset: 0, background: "#0f0f0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {media?.image
        ? <img src={media.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ color: "#222", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <i className="fab fa-youtube" style={{ fontSize: 40 }}></i>
            <span style={{ fontSize: 11, color: "#444" }}>Shorts Media</span>
          </div>
      }
    </div>
    <div style={{ position: "absolute", bottom: 40, left: 10, right: 60, zIndex: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <div style={{ ...S.avatar(20, "50%"), background: "#fff" }}></div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>@yourbrand</span>
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

const RENDERERS = {
  facebook:  FacebookRenderer,
  instagram: InstagramRenderer,
  linkedin:  LinkedInRenderer,
  x:         XRenderer,
  tiktok:    TikTokRenderer,
  pinterest: PinterestRenderer,
  threads:   ThreadsRenderer,
  youtube:   YouTubeRenderer,
  shorts:    ShortsRenderer,
};

// ── Platform labels ────────────────────────────────────────────────────────────
const PLABELS = {
  facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn",
  x: "X", tiktok: "TikTok", pinterest: "Pinterest",
  threads: "Threads", youtube: "YouTube", shorts: "Shorts",
};

// ── Main Panel ─────────────────────────────────────────────────────────────────
export default function PlatformPreviewPanel({ platforms = [], content = "", overrides = {}, media = null, brandName = "Your Brand" }) {
  const [activeTab, setActiveTab] = useState(platforms[0] || "facebook");

  if (platforms.length > 0 && !platforms.includes(activeTab)) {
    // Sync without triggering infinite loop
  }
  const safeTab = platforms.includes(activeTab) ? activeTab : (platforms[0] || "facebook");

  const currentContent = overrides[safeTab] || content;
  const validation = validateContent(safeTab, currentContent, media ? "image" : null, null);
  const Renderer = RENDERERS[safeTab] || FacebookRenderer;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span className="extra-small fw-bold text-muted text-uppercase" style={{ letterSpacing: 1 }}>
            Live Platform Rendering Engine
          </span>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>Updates instantly</span>
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
          <Renderer platform={safeTab} content={currentContent} media={media} brandName={brandName} />
        </div>
      </div>

    </div>
  );
}
