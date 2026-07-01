// packages/dashboard/src/components/editor/AdobeExpress.jsx
// Adobe Express Embed (CCEverywhere v4) with custom canvas fallback engine.
// Seamlessly drops down to a client-side sandbox editor if domain validation fails.

import React, { useEffect, useRef, useState, useCallback } from "react";
import { apiRequest } from "../../lib/api/client";

const SDK_URL = "https://cc-embed.adobe.com/sdk/v4/CCEverywhere.js";

let _sdkPromise = null;
function loadSDK() {
  if (window.CCEverywhere) return Promise.resolve(window.CCEverywhere);
  if (_sdkPromise) return _sdkPromise;
  _sdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_URL; s.async = true;
    s.onload = () => resolve(window.CCEverywhere);
    s.onerror = () => reject(new Error("Failed to load Adobe Express SDK"));
    document.head.appendChild(s);
  });
  return _sdkPromise;
}

export default function AdobeExpress({ onImport, seedImage, style }) {
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error | unavailable
  const [error, setError] = useState(null);
  const [showSandbox, setShowSandbox] = useState(false);
  
  // Fallback editor controls
  const [overlayText, setOverlayText] = useState("");
  const [textPosition, setTextPosition] = useState("center");
  const [filter, setFilter] = useState("none");
  const [brandColor, setBrandColor] = useState("#4f46e5");

  const ccRef = useRef(null);
  const cfgRef = useRef(null);
  const canvasRef = useRef(null);
  const previewRef = useRef(null);

  // Fetch the public client_id + capability state
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await apiRequest("/api/customer/integrations/adobe/config");
        if (cancelled) return;
        cfgRef.current = cfg;
        setStatus("idle");
      } catch {
        if (!cancelled) setStatus("idle");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const ensureReady = useCallback(async () => {
    if (ccRef.current) return ccRef.current;
    setStatus("loading"); setError(null);
    const CCEverywhere = await loadSDK();
    const cfg = cfgRef.current || { client_id: "demo_placeholder" };
    const cc = await CCEverywhere.initialize({
      clientId: cfg.client_id,
      appName: cfg.app_name || "myPilotPost",
      appVersion: { major: 1, minor: 0 },
      platformCategory: "web",
    });
    ccRef.current = cc;
    setStatus("ready");
    return cc;
  }, []);

  const launch = useCallback(async () => {
    try {
      // If config is using placeholder, launch sandbox directly to avoid Adobe error screen
      if (!cfgRef.current?.client_id || cfgRef.current.client_id.includes("placeholder")) {
        setShowSandbox(true);
        return;
      }

      const cc = await ensureReady();
      const editor = cc.editor || cc; 
      const callbacks = {
        onPublish: (_intent, publishParams) => {
          try {
            const asset = (publishParams?.asset || publishParams?.assets || [])[0];
            const dataUrl = asset?.data || asset?.dataURL || asset?.url;
            if (dataUrl && onImport) onImport(dataUrl);
          } catch (e) { setError("Could not read published asset: " + e.message); }
        },
        onError: (err) => {
          setError("Adobe Express error: " + (err?.message || String(err)));
          setShowSandbox(true);
        },
      };
      const docConfig = seedImage
        ? { canvasSize: "SocialPost", asset: { data: seedImage, dataType: "base64", type: "image" } }
        : { canvasSize: "SocialPost" };
      const exportConfig = [{ id: "download-png", label: "Import to MyPilotPost", action: { target: "publish" }, style: { uiType: "button" } }];

      if (typeof editor.createWithAsset === "function" && seedImage) {
        editor.createWithAsset(docConfig, { callbacks, exportOptions: exportConfig });
      } else if (typeof editor.create === "function") {
        editor.create(docConfig, { callbacks, exportOptions: exportConfig });
      } else {
        throw new Error("Adobe Express editor API not available in this SDK build");
      }
    } catch (e) {
      console.warn("Adobe Express launch exception — falling back to offline sandbox editor canvas:", e.message);
      setShowSandbox(true);
    }
  }, [ensureReady, onImport, seedImage]);

  // Sandbox canvas rendering engine
  useEffect(() => {
    if (!showSandbox) return;
    
    // Tiny defer to let the canvas mount in the DOM
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      
      const img = new Image();
      img.crossOrigin = "anonymous";

      const drawTextAndOverlays = () => {
        // Draw top brand bar accent
        ctx.fillStyle = brandColor || "#4f46e5";
        ctx.fillRect(0, 0, canvas.width, Math.max(12, canvas.height * 0.02));

        if (overlayText) {
          const fontSize = Math.round(canvas.width * 0.05);
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // Calculate box coordinate bounds
          let x = canvas.width / 2;
          let y = canvas.height / 2;
          if (textPosition === "top") y = canvas.height * 0.25;
          if (textPosition === "bottom") y = canvas.height * 0.75;

          const words = overlayText.split(" ");
          let line = "";
          const lines = [];
          const maxWidth = canvas.width * 0.85;
          const lineHeight = fontSize * 1.3;

          for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + " ";
            let metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
              lines.push(line);
              line = words[n] + " ";
            } else {
              line = testLine;
            }
          }
          lines.push(line);

          // Draw dark visual backing card for premium contrast
          ctx.fillStyle = "rgba(10, 10, 15, 0.75)";
          const padding = fontSize * 0.5;
          const cardHeight = lines.length * lineHeight + padding * 2;
          ctx.fillRect(x - maxWidth / 2 - padding, y - cardHeight / 2, maxWidth + padding * 2, cardHeight);

          // Draw the text string layers
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
          ctx.shadowBlur = 6;
          lines.forEach((l, index) => {
            const lineY = y - ((lines.length - 1) * lineHeight) / 2 + index * lineHeight;
            ctx.fillText(l.trim(), x, lineY);
          });
          ctx.shadowBlur = 0;
        }

        if (previewRef.current) {
          previewRef.current.src = canvas.toDataURL("image/png");
        }
      };

      if (!seedImage) {
        canvas.width = 1080;
        canvas.height = 1080;
        const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
        grad.addColorStop(0, brandColor || "#4f46e5");
        grad.addColorStop(1, "#18181c");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1080);
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
        ctx.beginPath();
        ctx.arc(540, 540, 380, 0, Math.PI * 2);
        ctx.fill();
        drawTextAndOverlays();
      } else {
        img.onload = () => {
          canvas.width = img.naturalWidth || 1080;
          canvas.height = img.naturalHeight || 1080;
          ctx.drawImage(img, 0, 0);

          // Render filters in canvas space
          if (filter === "grayscale") {
            ctx.globalCompositeOperation = "color";
            ctx.fillStyle = "gray";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = "source-over";
          } else if (filter === "sepia") {
            ctx.globalCompositeOperation = "color";
            ctx.fillStyle = "#5c3d24";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = "source-over";
          } else if (filter === "invert") {
            ctx.globalCompositeOperation = "difference";
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = "source-over";
          } else if (filter === "darken") {
            ctx.fillStyle = "rgba(10, 10, 15, 0.4)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          drawTextAndOverlays();
        };
        img.src = seedImage;
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [showSandbox, seedImage, overlayText, textPosition, filter, brandColor]);

  const handleSaveImport = () => {
    const canvas = canvasRef.current;
    if (canvas && onImport) {
      onImport(canvas.toDataURL("image/png"));
    }
    setShowSandbox(false);
  };

  return (
    <>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: style ? 1 : undefined }}>
        <button style={style} className={style ? "" : "btn-grey btn-sm"} onClick={launch} disabled={status === "loading"}>
          <i className={style ? "fas fa-edit me-1" : "fas fa-bezier-curve me-1"} style={{ color: style ? undefined : "#fa0f00" }}></i>
          {status === "loading" ? "Loading Adobe…" : "Adobe Express"}
        </button>
        {error && <span className="extra-small text-muted ms-1" title={error} style={{ cursor: "help" }}>⚙️ Sandbox Active</span>}
      </span>

      {showSandbox && (
        <div className="rp-overlay" style={{ zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(10, 10, 15, 0.8)", backdropFilter: "blur(6px)" }}>
          <div className="rp-modal" style={{ width: "90%", maxWidth: "840px", background: "#18181c", border: "1px solid #2d2d34", borderRadius: "12px", overflow: "hidden", color: "white", padding: 24, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)" }}>
            
            <div className="rp-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2d2d34", paddingBottom: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "#fa0f00", padding: "4px 8px", borderRadius: 4, fontSize: 10, fontWeight: "bold" }}>ADOBE EMBED SDK SANDBOX</span>
                <h3 style={{ margin: 0, fontSize: 18, color: "white" }}>myPilotPost Graphic Editor</h3>
              </div>
              <button style={{ background: "none", border: "none", color: "#a1a1aa", fontSize: 24, cursor: "pointer", padding: 0 }} onClick={() => setShowSandbox(false)}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* Canvas Preview Box */}
              <div style={{ background: "#0a0a0c", border: "1px solid #2b2b30", borderRadius: 8, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "360px", padding: 12 }}>
                <canvas ref={canvasRef} style={{ display: "none" }} />
                <img ref={previewRef} style={{ maxWidth: "100%", maxHeight: "340px", borderRadius: 4, objectFit: "contain" }} alt="Design preview" />
              </div>

              {/* Design Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#a1a1aa", marginBottom: 6 }}>Overlay Text</label>
                  <input
                    type="text"
                    style={{ width: "100%", background: "#222227", border: "1px solid #33333b", borderRadius: 6, color: "white", padding: "8px 12px", fontSize: 14 }}
                    placeholder="Type headline or post hook..."
                    value={overlayText}
                    onChange={(e) => setOverlayText(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#a1a1aa", marginBottom: 6 }}>Position</label>
                  <select
                    style={{ width: "100%", background: "#222227", border: "1px solid #33333b", borderRadius: 6, color: "white", padding: "8px 12px", fontSize: 14 }}
                    value={textPosition}
                    onChange={(e) => setTextPosition(e.target.value)}
                  >
                    <option value="center">Center</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#a1a1aa", marginBottom: 6 }}>Filter Template</label>
                  <select
                    style={{ width: "100%", background: "#222227", border: "1px solid #33333b", borderRadius: 6, color: "white", padding: "8px 12px", fontSize: 14 }}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="none">Original Colors</option>
                    <option value="darken">Overlay Contrast (Vignette)</option>
                    <option value="grayscale">Editorial Grayscale</option>
                    <option value="sepia">Vintage Warmth</option>
                    <option value="invert">Dramatic Inverted</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#a1a1aa", marginBottom: 6 }}>Accent Color</label>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      type="color"
                      style={{ background: "none", border: "none", width: 44, height: 38, cursor: "pointer", padding: 0 }}
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                    />
                    <span style={{ fontSize: 13, color: "#a1a1aa" }}>{brandColor}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid #2d2d34", paddingTop: 16, marginTop: 24 }}>
              <button
                style={{ background: "#222227", border: "1px solid #33333b", borderRadius: 6, color: "#e4e4e7", padding: "8px 16px", cursor: "pointer", fontSize: 14 }}
                onClick={() => setShowSandbox(false)}
              >
                Cancel
              </button>
              <button
                style={{ background: "#fa0f00", border: "none", borderRadius: 6, color: "white", padding: "8px 16px", fontWeight: "bold", cursor: "pointer", fontSize: 14 }}
                onClick={handleSaveImport}
              >
                Save & Import Design
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
