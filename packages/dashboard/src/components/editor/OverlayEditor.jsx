// packages/dashboard/src/components/editor/OverlayEditor.jsx
// Upgraded Brand Overlay Workspace Engine.
// Supports: Video backgrounds, shapes, logo layers, CTA buttons, template library, safe-zones, precise X/Y sliders, and canvas export.

import React, { useRef, useState, useEffect, useCallback } from "react";

const FONTS = ["Inter", "Arial", "Georgia", "Times New Roman", "Courier New", "Impact", "Verdana", "Outfit", "Playfair Display"];
const ASPECTS = { "1:1": 1, "4:5": 4 / 5, "9:16": 9 / 16, "16:9": 16 / 9 };

const SWATCHES = [
  "#2563eb", // Brand Blue
  "#7c3aed", // Brand Purple
  "#db2777", // Pink
  "#dc2626", // Red
  "#ea580c", // Orange
  "#eab308", // Yellow
  "#16a34a", // Green
  "#0d9488", // Teal
  "#1e293b", // Charcoal
  "#ffffff", // White
  "#000000"  // Black
];

let _idc = 0;
const uid = (p) => `${p}_${Date.now()}_${_idc++}`;

const EMPTY = { background: { url: null, fit: "cover", color: "#111827" }, overlay_text: [], overlay_image: [] };

const DEFAULT_TEMPLATES = [
  {
    name: "Minimal Logo & CTA Box",
    overlays: {
      background: { url: null, fit: "cover", color: "#1e1b4b" },
      overlay_text: [
        { id: "t_def_1", text: "Empower Your Relocation", x: 10, y: 20, w: 80, rotation: 0, fontSize: 8, fontFamily: "Inter", color: "#ffffff", opacity: 1, align: "center", bold: true, italic: false, z: 1 },
        { id: "t_def_2", text: "GET STARTED NOW", x: 30, y: 75, w: 40, rotation: 0, fontSize: 4.5, fontFamily: "Inter", color: "#ffffff", opacity: 1, align: "center", bold: true, italic: false, z: 2, isCTA: true, ctaBgColor: "#7c3aed", ctaBorderRadius: 8, ctaPadding: 8 }
      ],
      overlay_image: [
        { id: "s_def_1", isShape: true, shapeType: "circle", x: 45, y: 42, w: 10, h: 10, rotation: 0, opacity: 0.15, color: "#ffffff", z: 3 }
      ]
    }
  },
  {
    name: "Vertical Video Safe-Zone Promo",
    overlays: {
      background: { url: null, fit: "cover", color: "#0f172a" },
      overlay_text: [
        { id: "t_def_3", text: "NEW EXCLUSIVE BID", x: 10, y: 35, w: 80, rotation: 0, fontSize: 9.5, fontFamily: "Impact", color: "#eab308", opacity: 1, align: "center", bold: true, italic: false, z: 1 },
        { id: "t_def_4", text: "Tap link below to check rates", x: 15, y: 48, w: 70, rotation: 0, fontSize: 5, fontFamily: "Inter", color: "#ffffff", opacity: 0.95, align: "center", bold: false, italic: true, z: 2 }
      ],
      overlay_image: []
    }
  },
  {
    name: "Elegant Lower-Third Accent",
    overlays: {
      background: { url: null, fit: "cover", color: "#022c22" },
      overlay_text: [
        { id: "t_def_5", text: "BidMyMove Premium Solutions", x: 10, y: 72, w: 60, rotation: 0, fontSize: 7, fontFamily: "Georgia", color: "#ffffff", opacity: 1, align: "left", bold: true, italic: false, z: 1 },
        { id: "t_def_6", text: "Simplifying moving since 2026", x: 10, y: 82, w: 60, rotation: 0, fontSize: 4, fontFamily: "Inter", color: "#10b981", opacity: 0.9, align: "left", bold: false, italic: false, z: 2 }
      ],
      overlay_image: [
        { id: "s_def_2", isShape: true, shapeType: "rectangle", x: 6, y: 70, w: 1.2, h: 18, rotation: 0, opacity: 1, color: "#10b981", z: 3 }
      ]
    }
  }
];

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

export default function OverlayEditor({ value, onChange, aspectKey = "1:1" }) {
  const [state, setState] = useState(() => normalize(value));
  const [selected, setSelected] = useState(null); // { kind:'text'|'image', id }
  const [aspect, setAspect] = useState(aspectKey);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [templates, setTemplates] = useState([]);
  const stageRef = useRef(null);
  const drag = useRef(null); // active gesture

  // Keep internal state in sync if the parent swaps the asset
  useEffect(() => {
    setState(normalize(value));
  }, [value?.__assetId]);

  // Load templates from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("mypilotpost_overlay_templates");
      if (stored) {
        setTemplates(JSON.parse(stored));
      } else {
        setTemplates(DEFAULT_TEMPLATES);
        localStorage.setItem("mypilotpost_overlay_templates", JSON.stringify(DEFAULT_TEMPLATES));
      }
    } catch (e) {
      setTemplates(DEFAULT_TEMPLATES);
    }
  }, []);

  const emit = useCallback((next) => {
    setState(next);
    onChange && onChange(next);
  }, [onChange]);

  function normalizeAndEmit(mutator) {
    emit(mutator(structuredClone(state)));
  }

  // Check if background url is a video
  const isVideoBg = state.background.url && (
    state.background.url.endsWith(".mp4") ||
    state.background.url.endsWith(".mov") ||
    state.background.url.endsWith(".webm") ||
    state.background.url.includes("video")
  );

  // ── Layer helpers ────────────────────────────────────────────────────────────
  const allLayers = [
    ...state.overlay_text.map(o => ({ ...o, kind: "text" })),
    ...state.overlay_image.map(o => ({ ...o, kind: "image" })),
  ].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  const nextZ = () => (allLayers.reduce((m, l) => Math.max(m, l.z ?? 0), 0) + 1);

  function getSelectedObj() {
    if (!selected) return null;
    const arr = selected.kind === "text" ? state.overlay_text : state.overlay_image;
    return arr.find(o => o.id === selected.id) || null;
  }

  function patchSelected(patch) {
    if (!selected) return;
    normalizeAndEmit(s => {
      const arr = selected.kind === "text" ? s.overlay_text : s.overlay_image;
      const o = arr.find(x => x.id === selected.id);
      if (o) Object.assign(o, patch);
      return s;
    });
  }

  // ── Add overlays ─────────────────────────────────────────────────────────────
  function addText() {
    const o = {
      id: uid("t"), text: "Double-click to edit text", x: 25, y: 40, w: 50, rotation: 0,
      fontSize: 7, fontFamily: "Inter", color: "#ffffff", opacity: 1, align: "center",
      bold: true, italic: false, z: nextZ()
    };
    normalizeAndEmit(s => { s.overlay_text.push(o); return s; });
    setSelected({ kind: "text", id: o.id });
  }

  function addCTAButton() {
    const o = {
      id: uid("t"), text: "Learn More", x: 35, y: 70, w: 30, rotation: 0,
      fontSize: 5, fontFamily: "Inter", color: "#ffffff", opacity: 1, align: "center",
      bold: true, italic: false, z: nextZ(), isCTA: true,
      ctaBgColor: "#2563eb", ctaBorderRadius: 6, ctaPadding: 8
    };
    normalizeAndEmit(s => { s.overlay_text.push(o); return s; });
    setSelected({ kind: "text", id: o.id });
  }

  function addShape(shapeType = "rectangle") {
    const o = {
      id: uid("i"), isShape: true, shapeType, x: 40, y: 40, w: 20, h: 20, rotation: 0,
      opacity: 0.8, color: "#2563eb", z: nextZ()
    };
    normalizeAndEmit(s => { s.overlay_image.push(o); return s; });
    setSelected({ kind: "image", id: o.id });
  }

  function addImageFromFile(file, isLogo = false) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ar = img.width / img.height;
        const w = isLogo ? 20 : 40;
        const h = clamp(w / ar / (ASPECTS[aspect]), 5, 90);
        const o = {
          id: uid("i"), url: reader.result, x: isLogo ? 70 : 30, y: isLogo ? 10 : 30, w, h, rotation: 0,
          opacity: 1, crop: { t: 0, r: 0, b: 0, l: 0 }, z: nextZ(), isLogo
        };
        normalizeAndEmit(s => { s.overlay_image.push(o); return s; });
        setSelected({ kind: "image", id: o.id });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function setBackgroundFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => normalizeAndEmit(s => { s.background = { ...s.background, url: reader.result }; return s; });
    reader.readAsDataURL(file);
  }

  function removeSelected() {
    if (!selected) return;
    normalizeAndEmit(s => {
      if (selected.kind === "text") s.overlay_text = s.overlay_text.filter(o => o.id !== selected.id);
      else s.overlay_image = s.overlay_image.filter(o => o.id !== selected.id);
      return s;
    });
    setSelected(null);
  }

  function reorder(dir) {
    if (!selected) return;
    const obj = getSelectedObj(); if (!obj) return;
    const sorted = allLayers;
    const idx = sorted.findIndex(l => l.id === obj.id);
    const swap = dir === "up" ? sorted[idx + 1] : sorted[idx - 1];
    if (!swap) return;
    normalizeAndEmit(s => {
      const a = (s.overlay_text.find(o => o.id === obj.id) || s.overlay_image.find(o => o.id === obj.id));
      const b = (s.overlay_text.find(o => o.id === swap.id) || s.overlay_image.find(o => o.id === swap.id));
      const za = a.z ?? 0, zb = b.z ?? 0; a.z = zb; b.z = za;
      return s;
    });
  }

  // ── Templates ────────────────────────────────────────────────────────────────
  function saveAsTemplate() {
    const name = prompt("Enter a name for this template:", `Template ${templates.length + 1}`);
    if (!name) return;
    const cleanOverlays = structuredClone(state);
    // Don't save the hardcoded user background image in the template metadata if it's transient
    const cleanTpl = { name, overlays: cleanOverlays };
    const updated = [...templates, cleanTpl];
    setTemplates(updated);
    localStorage.setItem("mypilotpost_overlay_templates", JSON.stringify(updated));
    alert(`Template "${name}" saved!`);
  }

  function loadTemplate(tpl) {
    if (!tpl) return;
    normalizeAndEmit(s => {
      const bgUrl = s.background.url; // Keep current background if possible
      const target = structuredClone(tpl.overlays);
      if (bgUrl && !target.background.url) {
        target.background.url = bgUrl;
      }
      return target;
    });
  }

  // ── Pointer gestures ──────────────────────────────────────────────────────────
  function stageRect() { return stageRef.current.getBoundingClientRect(); }

  function onHandleDown(e, kind, id, mode) {
    e.stopPropagation(); e.preventDefault();
    const r = stageRect();
    const arr = kind === "text" ? state.overlay_text : state.overlay_image;
    const obj = arr.find(o => o.id === id);
    drag.current = {
      kind, id, mode,
      startX: e.clientX, startY: e.clientY,
      rect: r, orig: structuredClone(obj),
      cx: r.left + (obj.x + (obj.w) / 2) / 100 * r.width,
      cy: r.top + (obj.y + ((obj.h ?? obj.w) / 2)) / 100 * r.height,
    };
    setSelected({ kind, id });
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  }

  const onPointerMove = useCallback((e) => {
    const g = drag.current; if (!g) return;
    const r = g.rect;
    const dxPct = (e.clientX - g.startX) / r.width * 100;
    const dyPct = (e.clientY - g.startY) / r.height * 100;
    normalizeAndEmit(s => {
      const arr = g.kind === "text" ? s.overlay_text : s.overlay_image;
      const o = arr.find(x => x.id === g.id); if (!o) return s;
      if (g.mode === "move") {
        o.x = clamp(g.orig.x + dxPct, -20, 100);
        o.y = clamp(g.orig.y + dyPct, -20, 100);
      } else if (g.mode === "resize") {
        o.w = clamp(g.orig.w + dxPct, 3, 120);
        if (g.kind === "image") o.h = clamp((g.orig.h ?? g.orig.w) + dyPct, 3, 120);
      } else if (g.mode === "rotate") {
        const ang = Math.atan2(e.clientY - g.cy, e.clientX - g.cx) * 180 / Math.PI + 90;
        o.rotation = Math.round(ang);
      }
      return s;
    });
  }, [state]); // eslint-disable-line

  function onPointerUp() {
    window.removeEventListener("pointermove", onPointerMove);
    drag.current = null;
  }

  // Helper to draw rounded rects on canvas
  function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // ── PNG export (draws objects, never the DOM) ───────────────────────────────
  async function exportPNG(targetW = 1080) {
    const ar = ASPECTS[aspect];
    const W = targetW, H = Math.round(targetW / ar);
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    
    // background color
    ctx.fillStyle = state.background.color || "#000"; ctx.fillRect(0, 0, W, H);
    
    // background image
    if (state.background.url && !isVideoBg) {
      try {
        const bg = await loadImg(state.background.url);
        drawCover(ctx, bg, W, H, state.background.fit);
      } catch (e) {
        console.error("Failed to load background image for export", e);
      }
    }
    
    // overlays
    for (const o of allLayers) {
      ctx.save();
      const cx = (o.x + (o.w) / 2) / 100 * W;
      const cy = (o.y + ((o.h ?? o.w) / 2)) / 100 * H;
      ctx.globalAlpha = o.opacity ?? 1;
      ctx.translate(cx, cy);
      ctx.rotate((o.rotation || 0) * Math.PI / 180);
      
      if (o.kind === "image") {
        if (o.isShape) {
          ctx.fillStyle = o.color || "#2563eb";
          const w = o.w / 100 * W, h = (o.h ?? o.w) / 100 * H;
          if (o.shapeType === "circle") {
            ctx.beginPath();
            ctx.arc(0, 0, Math.min(w, h) / 2, 0, 2 * Math.PI);
            ctx.fill();
          } else {
            ctx.fillRect(-w / 2, -h / 2, w, h);
          }
        } else {
          try {
            const img = await loadImg(o.url);
            const w = o.w / 100 * W, h = (o.h ?? o.w) / 100 * H;
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
          } catch (e) {
            console.error("Failed to load overlay image for export", e);
          }
        }
      } else {
        // text or CTA
        const px = Math.round((o.fontSize / 100) * H);
        ctx.font = `${o.italic ? "italic " : ""}${o.bold ? "700 " : "400 "}${px}px ${o.fontFamily}`;
        
        if (o.isCTA) {
          // Draw CTA Button rounded background
          const padding = o.ctaPadding ?? 8;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          
          // Calculate text dimensions
          const lines = wrapTextLines(ctx, o.text, (o.w / 100) * W);
          const blockW = (o.w / 100) * W;
          const blockH = Math.max(px * 1.3, lines.length * px * 1.25) + padding * 2;
          
          ctx.fillStyle = o.ctaBgColor || "#2563eb";
          drawRoundedRect(ctx, -blockW / 2, -blockH / 2, blockW, blockH, o.ctaBorderRadius ?? 6);
          ctx.fill();
          
          ctx.fillStyle = o.color || "#ffffff";
          drawTextLines(ctx, lines, 0, 0, px * 1.25);
        } else {
          ctx.fillStyle = o.color;
          ctx.textAlign = o.align || "center";
          ctx.textBaseline = "middle";
          const w = o.w / 100 * W;
          const ox = o.align === "left" ? -w / 2 : o.align === "right" ? w / 2 : 0;
          
          const lines = wrapTextLines(ctx, o.text, w);
          drawTextLines(ctx, lines, ox, 0, px * 1.25);
        }
      }
      ctx.restore();
    }
    return cv.toDataURL("image/png");
  }

  const handleDownload = async () => {
    try {
      const dataUrl = await exportPNG();
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `mypilotpost-overlay-${Date.now()}.png`;
      a.click();
    } catch (e) {
      alert("Could not export canvas download: " + e.message);
    }
  };

  const sel = getSelectedObj();
  const arPct = ASPECTS[aspect];

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "stretch", width: "100%", height: 520, background: "#0b0f19", color: "#f8fafc", borderRadius: 12, overflow: "hidden", border: "1px solid #1e293b" }}>
      {/* ── EXPOSE EXPORT PNG METHOD ── */}
      <ExportBridge onReady={(fn) => { OverlayEditor._export = fn; }} exportPNG={exportPNG} />

      {/* ── LEFT STAGE (70%) ── */}
      <div style={{ flex: 1, background: "#020617", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, position: "relative" }}>
        
        {/* Top bar toolbar */}
        <div style={{ width: "100%", maxWidth: 460, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.keys(ASPECTS).map(k => (
              <button
                key={k}
                onClick={() => setAspect(k)}
                style={{
                  border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700,
                  padding: "5px 10px", cursor: "pointer",
                  background: aspect === k ? "#3b82f6" : "#1e293b",
                  color: "#fff"
                }}
              >
                {k}
              </button>
            ))}
          </div>
          
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox" checked={showSafeZones} onChange={e => setShowSafeZones(e.target.checked)} />
              <span>Safe Zones</span>
            </label>
          </div>
        </div>

        {/* The Stage */}
        <div
          ref={stageRef}
          onPointerDown={() => setSelected(null)}
          style={{
            position: "relative",
            width: aspect === "9:16" ? 270 : 360,
            height: aspect === "9:16" ? 480 : Math.round(360 / arPct),
            background: state.background.color,
            borderRadius: 8,
            overflow: "hidden",
            border: "2px solid #334155",
            userSelect: "none",
            touchAction: "none",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
          }}
        >
          {state.background.url && (
            isVideoBg ? (
              <video
                src={state.background.url}
                autoPlay
                muted
                loop
                playsInline
                draggable={false}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: state.background.fit, pointerEvents: "none" }}
              />
            ) : (
              <img
                src={state.background.url}
                alt="bg"
                draggable={false}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: state.background.fit, pointerEvents: "none" }}
              />
            )
          )}

          {/* Render overlay layers */}
          {allLayers.map(o => {
            const isSel = selected && selected.id === o.id;
            const widthVal = aspect === "9:16" ? 270 : 360;
            const heightVal = aspect === "9:16" ? 480 : Math.round(360 / arPct);
            
            const common = {
              position: "absolute", left: `${o.x}%`, top: `${o.y}%`, width: `${o.w}%`,
              height: o.kind === "image" ? `${o.h}%` : "auto",
              transform: `rotate(${o.rotation || 0}deg)`, transformOrigin: "center",
              opacity: o.opacity ?? 1, cursor: "move",
              outline: isSel ? "2px solid #3b82f6" : "none", zIndex: (o.z ?? 0) + 1,
            };

            return (
              <div
                key={o.id}
                style={common}
                onPointerDown={(e) => onHandleDown(e, o.kind, o.id, "move")}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (o.kind === "text") {
                    const t = prompt("Edit text overlay:", o.text);
                    if (t != null) {
                      setSelected({ kind: "text", id: o.id });
                      patchSelected({ text: t });
                    }
                  }
                }}
              >
                {o.kind === "image" ? (
                  o.isShape ? (
                    <div style={{
                      width: "100%", height: "100%",
                      backgroundColor: o.color || "#2563eb",
                      borderRadius: o.shapeType === "circle" ? "50%" : 0
                    }} />
                  ) : (
                    <img src={o.url} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
                  )
                ) : (
                  o.isCTA ? (
                    <div style={{
                      width: "100%",
                      backgroundColor: o.ctaBgColor || "#2563eb",
                      borderRadius: `${o.ctaBorderRadius ?? 6}px`,
                      padding: `${o.ctaPadding ?? 8}px`,
                      color: o.color || "#ffffff",
                      fontFamily: o.fontFamily,
                      fontWeight: o.bold ? 700 : 400,
                      fontStyle: o.italic ? "italic" : "normal",
                      textAlign: o.align || "center",
                      fontSize: `${(o.fontSize / 100) * heightVal}px`,
                      wordBreak: "break-word",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.25)"
                    }}>
                      {o.text}
                    </div>
                  ) : (
                    <div style={{
                      width: "100%", color: o.color, fontFamily: o.fontFamily,
                      fontWeight: o.bold ? 700 : 400, fontStyle: o.italic ? "italic" : "normal",
                      textAlign: o.align || "center", lineHeight: 1.25,
                      fontSize: `${(o.fontSize / 100) * heightVal}px`,
                      pointerEvents: "none", wordBreak: "break-word"
                    }}>
                      {o.text}
                    </div>
                  )
                )}

                {isSel && (
                  <>
                    <span onPointerDown={(e) => onHandleDown(e, o.kind, o.id, "resize")} style={{ ...handle, right: -6, bottom: -6, cursor: "nwse-resize" }} />
                    <span onPointerDown={(e) => onHandleDown(e, o.kind, o.id, "rotate")} style={{ ...handle, left: "50%", top: -20, marginLeft: -6, cursor: "grab", background: "#10b981" }} />
                  </>
                )}
              </div>
            );
          })}

          {/* Safe Zone guidelines overlay */}
          {showSafeZones && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", border: "2px dashed rgba(239, 68, 68, 0.45)", zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 14 }}>
              <div style={{ fontSize: 9, color: "#f87171", fontWeight: 700, textTransform: "uppercase", textShadow: "0 1px 2px #000" }}>⚠️ Top Header Blockage Zone (Reels/TikTok)</div>
              <div style={{ fontSize: 9, color: "#f87171", fontWeight: 700, textTransform: "uppercase", textShadow: "0 1px 2px #000", textAlign: "center" }}>⚠️ Bottom Caption / Details Blockage Zone</div>
            </div>
          )}
        </div>

        {/* Bottom toolbar quick inserts */}
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button onClick={addText} style={btnTool}><i className="fas fa-font me-1"></i>+ Text</button>
          <button onClick={addCTAButton} style={btnTool}><i className="fas fa-hand-pointer me-1"></i>+ CTA Button</button>
          <button onClick={() => addShape("rectangle")} style={btnTool}><i className="fas fa-square me-1"></i>+ Rectangle</button>
          <button onClick={() => addShape("circle")} style={btnTool}><i className="fas fa-circle me-1"></i>+ Circle</button>
          
          <label style={{ ...btnTool, cursor: "pointer" }}>
            <i className="fas fa-image me-1"></i>+ Add Logo
            <input type="file" accept="image/*" hidden onChange={e => e.target.files[0] && addImageFromFile(e.target.files[0], true)} />
          </label>

          <label style={{ ...btnTool, cursor: "pointer" }}>
            <i className="fas fa-photo-video me-1"></i>+ Custom Image
            <input type="file" accept="image/*" hidden onChange={e => e.target.files[0] && addImageFromFile(e.target.files[0], false)} />
          </label>
        </div>
      </div>

      {/* ── RIGHT PANEL: PROPERTIES & CONTROLS (30%) ── */}
      <div style={{ width: 290, background: "#0f172a", borderLeft: "1px solid #1e293b", padding: 16, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        
        {/* Templates selector section */}
        <div style={{ marginBottom: 14 }}>
          <label className="extra-small fw-bold text-muted text-uppercase mb-1" style={{ display: "block" }}>Overlay Templates</label>
          <div style={{ display: "flex", gap: 6 }}>
            <select
              onChange={e => loadTemplate(templates[parseInt(e.target.value, 10)])}
              defaultValue=""
              style={{ ...inp, flex: 1 }}
            >
              <option value="" disabled>Load layout template...</option>
              {templates.map((t, idx) => <option key={t.name} value={idx}>{t.name}</option>)}
            </select>
            <button onClick={saveAsTemplate} style={{ ...btnTool, padding: "5px 10px" }} title="Save current layout as template">
              <i className="fas fa-save"></i>
            </button>
          </div>
        </div>

        {/* Selected Layer Properties */}
        <div style={{ flex: 1 }}>
          {!sel ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 8 }}>Background Settings</div>
              <Row label="Fit">
                <select value={state.background.fit} onChange={e => normalizeAndEmit(s => { s.background.fit = e.target.value; return s; })} style={inp}>
                  <option value="cover">cover</option>
                  <option value="contain">contain</option>
                </select>
              </Row>
              <Row label="Color">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={state.background.color} onChange={e => normalizeAndEmit(s => { s.background.color = e.target.value; return s; })} />
                  <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{state.background.color}</span>
                </div>
              </Row>
              <label style={{ ...btnTool, width: "100%", textAlign: "center", marginTop: 10, cursor: "pointer", display: "block" }}>
                <i className="fas fa-upload me-1"></i>Replace Background Image
                <input type="file" accept="image/*,video/*" hidden onChange={e => e.target.files[0] && setBackgroundFromFile(e.target.files[0])} />
              </label>

              {allLayers.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>Layers ({allLayers.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                    {allLayers.slice().reverse().map(l => (
                      <div
                        key={l.id}
                        onClick={() => setSelected({ kind: l.kind, id: l.id })}
                        style={{
                          padding: "6px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                          background: "#1e293b", border: "1px solid #334155", color: "#cbd5e1"
                        }}
                      >
                        {l.kind === "text"
                          ? (l.isCTA ? `🔘 CTA: ${l.text}` : `✍️ Text: ${l.text.slice(0, 16)}...`)
                          : (l.isShape ? `🔷 Shape: ${l.shapeType}` : `🖼️ Image` + (l.isLogo ? " (Logo)" : ""))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Properties for selected item */}
              {selected.kind === "text" && (
                <div>
                  <PanelHeader title={sel.isCTA ? "CTA Button" : "Text"} onDelete={removeSelected} onUp={() => reorder("up")} onDown={() => reorder("down")} />
                  
                  <Row label="Content">
                    <textarea value={sel.text} onChange={e => patchSelected({ text: e.target.value })} rows={2} style={{ ...inp, resize: "vertical" }} />
                  </Row>
                  
                  <Row label="Font">
                    <select value={sel.fontFamily} onChange={e => patchSelected({ fontFamily: e.target.value })} style={inp}>
                      {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </Row>

                  <Row label="Font Size">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="range" min="1.5" max="18" step="0.25" value={sel.fontSize} onChange={e => patchSelected({ fontSize: parseFloat(e.target.value) })} style={{ flex: 1 }} />
                      <span style={{ fontSize: 11, width: 24, textAlign: "right" }}>{sel.fontSize}%</span>
                    </div>
                  </Row>

                  <Row label="Text Color">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                      {SWATCHES.map(color => (
                        <button
                          key={color}
                          onClick={() => patchSelected({ color })}
                          style={{ width: 16, height: 16, borderRadius: "50%", background: color, border: sel.color === color ? "2px solid #fff" : "1px solid rgba(255,255,255,0.25)", cursor: "pointer" }}
                        />
                      ))}
                      <input type="color" value={sel.color} onChange={e => patchSelected({ color: e.target.value })} style={{ width: 18, height: 18, border: "none", background: "none", cursor: "pointer" }} />
                    </div>
                  </Row>

                  {sel.isCTA && (
                    <>
                      <Row label="Btn BG">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                          {SWATCHES.map(color => (
                            <button
                              key={color}
                              onClick={() => patchSelected({ ctaBgColor: color })}
                              style={{ width: 16, height: 16, borderRadius: "50%", background: color, border: sel.ctaBgColor === color ? "2px solid #fff" : "1px solid rgba(255,255,255,0.25)", cursor: "pointer" }}
                            />
                          ))}
                          <input type="color" value={sel.ctaBgColor || "#2563eb"} onChange={e => patchSelected({ ctaBgColor: e.target.value })} style={{ width: 18, height: 18, border: "none", background: "none", cursor: "pointer" }} />
                        </div>
                      </Row>

                      <Row label="Corners">
                        <input type="range" min="0" max="24" value={sel.ctaBorderRadius ?? 6} onChange={e => patchSelected({ ctaBorderRadius: parseInt(e.target.value, 10) })} />
                      </Row>

                      <Row label="Padding">
                        <input type="range" min="4" max="16" value={sel.ctaPadding ?? 8} onChange={e => patchSelected({ ctaPadding: parseInt(e.target.value, 10) })} />
                      </Row>
                    </>
                  )}

                  {!sel.isCTA && (
                    <Row label="Align">
                      <div style={{ display: "flex", gap: 4 }}>
                        {["left", "center", "right"].map(a => (
                          <button
                            key={a}
                            onClick={() => patchSelected({ align: a })}
                            style={{
                              border: "none", borderRadius: 4, fontSize: 10, padding: "3px 8px", cursor: "pointer",
                              background: sel.align === a ? "#3b82f6" : "#334155", color: "#fff"
                            }}
                          >
                            {a[0].toUpperCase() + a.slice(1)}
                          </button>
                        ))}
                      </div>
                    </Row>
                  )}

                  <Row label="Style">
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => patchSelected({ bold: !sel.bold })} style={{ ...btnSmStyle, background: sel.bold ? "#3b82f6" : "#334155" }}><b>B</b></button>
                      <button onClick={() => patchSelected({ italic: !sel.italic })} style={{ ...btnSmStyle, background: sel.italic ? "#3b82f6" : "#334155" }}><i>I</i></button>
                    </div>
                  </Row>

                  <Row label="Opacity">
                    <input type="range" min="0" max="1" step="0.05" value={sel.opacity ?? 1} onChange={e => patchSelected({ opacity: parseFloat(e.target.value) })} />
                  </Row>

                  <Row label="Rotate">
                    <input type="range" min="-180" max="180" value={sel.rotation ?? 0} onChange={e => patchSelected({ rotation: parseInt(e.target.value, 10) })} />
                  </Row>

                  {/* Position Coordinates Sliders */}
                  <Row label="Position X">
                    <input type="range" min="-20" max="100" value={sel.x} onChange={e => patchSelected({ x: parseFloat(e.target.value) })} />
                  </Row>
                  <Row label="Position Y">
                    <input type="range" min="-20" max="100" value={sel.y} onChange={e => patchSelected({ y: parseFloat(e.target.value) })} />
                  </Row>
                </div>
              )}

              {selected.kind === "image" && (
                <div>
                  <PanelHeader title={sel.isShape ? `Shape (${sel.shapeType})` : `Image`} onDelete={removeSelected} onUp={() => reorder("up")} onDown={() => reorder("down")} />
                  
                  {sel.isShape && (
                    <Row label="Shape Color">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                        {SWATCHES.map(color => (
                          <button
                            key={color}
                            onClick={() => patchSelected({ color })}
                            style={{ width: 16, height: 16, borderRadius: "50%", background: color, border: sel.color === color ? "2px solid #fff" : "1px solid rgba(255,255,255,0.25)", cursor: "pointer" }}
                          />
                        ))}
                        <input type="color" value={sel.color} onChange={e => patchSelected({ color: e.target.value })} style={{ width: 18, height: 18, border: "none", background: "none", cursor: "pointer" }} />
                      </div>
                    </Row>
                  )}

                  <Row label="Width">
                    <input type="range" min="3" max="100" value={sel.w} onChange={e => patchSelected({ w: parseFloat(e.target.value) })} />
                  </Row>
                  
                  <Row label="Height">
                    <input type="range" min="3" max="100" value={sel.h ?? sel.w} onChange={e => patchSelected({ h: parseFloat(e.target.value) })} />
                  </Row>

                  <Row label="Opacity">
                    <input type="range" min="0" max="1" step="0.05" value={sel.opacity ?? 1} onChange={e => patchSelected({ opacity: parseFloat(e.target.value) })} />
                  </Row>

                  <Row label="Rotate">
                    <input type="range" min="-180" max="180" value={sel.rotation ?? 0} onChange={e => patchSelected({ rotation: parseInt(e.target.value, 10) })} />
                  </Row>

                  {/* Position Coordinates Sliders */}
                  <Row label="Position X">
                    <input type="range" min="-20" max="100" value={sel.x} onChange={e => patchSelected({ x: parseFloat(e.target.value) })} />
                  </Row>
                  <Row label="Position Y">
                    <input type="range" min="-20" max="100" value={sel.y} onChange={e => patchSelected({ y: parseFloat(e.target.value) })} />
                  </Row>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ borderTop: "1px solid #1e293b", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={handleDownload}
            style={{
              width: "100%", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700,
              padding: "6px 12px", background: "#334155", color: "#fff", cursor: "pointer"
            }}
          >
            <i className="fas fa-download me-1"></i>Download Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Expose static hook bridge ──────────────────────────────────────────────────
OverlayEditor.exportCurrentPNG = () => (OverlayEditor._export ? OverlayEditor._export() : Promise.resolve(null));

// ── Subcomponents ──────────────────────────────────────────────────────────────
function ExportBridge({ onReady, exportPNG }) { useEffect(() => { onReady(exportPNG); }, [onReady, exportPNG]); return null; }

const btnTool = {
  border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, padding: "5px 10px",
  background: "#1e293b", color: "#cbd5e1", cursor: "pointer", display: "flex", alignItems: "center"
};
const btnSmStyle = { border: "none", borderRadius: 4, width: 22, height: 22, fontSize: 10, cursor: "pointer", color: "#fff" };
const inp = { width: "100%", padding: "5px 8px", background: "#0b0f19", color: "#cbd5e1", border: "1px solid #334155", borderRadius: 6, fontSize: 11 };
const handle = { position: "absolute", width: 12, height: 12, borderRadius: "50%", background: "#3b82f6", border: "2px solid #fff" };

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{label}</span>
      <div>{children}</div>
    </div>
  );
}

function PanelHeader({ title, onDelete, onUp, onDown }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid #1e293b" }}>
      <span style={{ fontWeight: 700, fontSize: 12, color: "#e2e8f0" }}>{title} layer</span>
      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={onUp} style={{ border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 10, background: "#1e293b", color: "#fff", cursor: "pointer" }} title="Bring forward">▲</button>
        <button onClick={onDown} style={{ border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 10, background: "#1e293b", color: "#fff", cursor: "pointer" }} title="Send back">▼</button>
        <button onClick={onDelete} style={{ border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 10, background: "#7f1d1d", color: "#fca5a5", cursor: "pointer" }} title="Delete layer">×</button>
      </div>
    </div>
  );
}

// ── Pure canvas utils ──────────────────────────────────────────────────────────
function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = (e) => {
      // If it's a relative URL, prepend host
      if (src && src.startsWith("/")) {
        i.src = window.location.origin + src;
      } else {
        rej(e);
      }
    };
    i.src = src;
  });
}

function drawCover(ctx, img, W, H, fit) {
  const ar = img.width / img.height, car = W / H;
  let w, h, x, y;
  const cover = fit !== "contain";
  if ((ar > car) === cover) { h = H; w = H * ar; } else { w = W; h = W / ar; }
  if (fit === "contain") { if (ar > car) { w = W; h = W / ar; } else { h = H; w = H * ar; } }
  x = (W - w) / 2; y = (H - h) / 2;
  ctx.drawImage(img, x, y, w, h);
}

function wrapTextLines(ctx, text, maxW) {
  const words = String(text || "").split(/\s+/);
  let line = "";
  const lines = [];
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = t;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawTextLines(ctx, lines, x, y, lh) {
  const startY = y - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, x, startY + i * lh));
}

function normalize(v) {
  if (!v || typeof v !== "object") return structuredClone(EMPTY);
  return {
    background: { ...EMPTY.background, ...(v.background || {}) },
    overlay_text: Array.isArray(v.overlay_text) ? v.overlay_text : [],
    overlay_image: Array.isArray(v.overlay_image) ? v.overlay_image : [],
  };
}
