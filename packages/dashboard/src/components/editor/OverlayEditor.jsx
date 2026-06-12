// packages/dashboard/src/components/editor/OverlayEditor.jsx
// ITEM 2 — Social editor overlay function.
// Overlays are stored as OBJECTS and never flattened:
//   { background:{url,fit,color}, overlay_text:[...], overlay_image:[...] }
// All geometry is in PERCENT of the stage (resolution independent).
// No external canvas library — pointer-driven move/resize/rotate + canvas PNG export.

import React, { useRef, useState, useEffect, useCallback } from "react";

const FONTS = ["Inter", "Arial", "Georgia", "Times New Roman", "Courier New", "Impact", "Verdana"];
const ASPECTS = { "1:1": 1, "4:5": 4 / 5, "9:16": 9 / 16, "16:9": 16 / 9 };

let _idc = 0;
const uid = (p) => `${p}_${Date.now()}_${_idc++}`;

const EMPTY = { background: { url: null, fit: "cover", color: "#111827" }, overlay_text: [], overlay_image: [] };

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

export default function OverlayEditor({ value, onChange, aspectKey = "1:1" }) {
  const [state, setState] = useState(() => normalize(value));
  const [selected, setSelected] = useState(null); // { kind:'text'|'image', id }
  const [aspect, setAspect] = useState(aspectKey);
  const stageRef = useRef(null);
  const drag = useRef(null); // active gesture

  // Keep internal state in sync if the parent swaps the asset
  useEffect(() => { setState(normalize(value)); /* eslint-disable-next-line */ }, [value?.__assetId]);

  const emit = useCallback((next) => { setState(next); onChange && onChange(next); }, [onChange]);

  function normalizeAndEmit(mutator) {
    emit(mutator(structuredClone(state)));
  }

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
    const o = { id: uid("t"), text: "Double-click to edit", x: 25, y: 40, w: 50, rotation: 0,
      fontSize: 8, fontFamily: "Inter", color: "#ffffff", opacity: 1, align: "center",
      bold: true, italic: false, z: nextZ() };
    normalizeAndEmit(s => { s.overlay_text.push(o); return s; });
    setSelected({ kind: "text", id: o.id });
  }

  function addImageFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ar = img.width / img.height;
        const w = 40, h = clamp(40 / ar / (ASPECTS[aspect]), 5, 90);
        const o = { id: uid("i"), url: reader.result, x: 30, y: 30, w, h, rotation: 0,
          opacity: 1, crop: { t: 0, r: 0, b: 0, l: 0 }, z: nextZ() };
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

  // ── Pointer gestures (move / resize / rotate) ───────────────────────────────
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
        o.w = clamp(g.orig.w + dxPct, 5, 120);
        if (g.kind === "image") o.h = clamp(g.orig.h + dyPct, 5, 120);
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

  // ── PNG export (draws objects, never the DOM) ───────────────────────────────
  async function exportPNG(targetW = 1080) {
    const ar = ASPECTS[aspect];
    const W = targetW, H = Math.round(targetW / ar);
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    // background
    ctx.fillStyle = state.background.color || "#000"; ctx.fillRect(0, 0, W, H);
    if (state.background.url) {
      const bg = await loadImg(state.background.url);
      drawCover(ctx, bg, W, H, state.background.fit);
    }
    for (const o of allLayers) {
      ctx.save();
      const cx = (o.x + (o.w) / 2) / 100 * W;
      const cy = (o.y + ((o.h ?? o.w) / 2)) / 100 * H;
      ctx.globalAlpha = o.opacity ?? 1;
      ctx.translate(cx, cy);
      ctx.rotate((o.rotation || 0) * Math.PI / 180);
      if (o.kind === "image") {
        const img = await loadImg(o.url);
        const w = o.w / 100 * W, h = (o.h ?? o.w) / 100 * H;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } else {
        const px = Math.round((o.fontSize / 100) * H);
        ctx.font = `${o.italic ? "italic " : ""}${o.bold ? "700 " : "400 "}${px}px ${o.fontFamily}`;
        ctx.fillStyle = o.color; ctx.textAlign = o.align; ctx.textBaseline = "middle";
        const w = o.w / 100 * W;
        const ox = o.align === "left" ? -w / 2 : o.align === "right" ? w / 2 : 0;
        wrapText(ctx, o.text, ox, 0, w, px * 1.2);
      }
      ctx.restore();
    }
    return cv.toDataURL("image/png");
  }

  const sel = getSelectedObj();
  const arPct = ASPECTS[aspect];

  return (
    <div className="overlay-editor" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      {/* ── Stage ─────────────────────────────────────────────── */}
      <div style={{ flex: "0 0 auto" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {Object.keys(ASPECTS).map(k => (
            <button key={k} className={`btn-grey${aspect === k ? " active" : ""}`} style={btnSm} onClick={() => setAspect(k)}>{k}</button>
          ))}
        </div>
        <div
          ref={stageRef}
          onPointerDown={() => setSelected(null)}
          style={{
            position: "relative", width: 360, height: Math.round(360 / arPct),
            background: state.background.color, borderRadius: 10, overflow: "hidden",
            border: "1px solid #252D42", userSelect: "none", touchAction: "none",
          }}
        >
          {state.background.url && (
            <img src={state.background.url} alt="bg" draggable={false}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: state.background.fit, pointerEvents: "none" }} />
          )}
          {allLayers.map(o => {
            const isSel = selected && selected.id === o.id;
            const common = {
              position: "absolute", left: `${o.x}%`, top: `${o.y}%`, width: `${o.w}%`,
              height: o.kind === "image" ? `${o.h}%` : "auto",
              transform: `rotate(${o.rotation || 0}deg)`, transformOrigin: "center",
              opacity: o.opacity ?? 1, cursor: "move",
              outline: isSel ? "1.5px solid #6068E8" : "none", zIndex: (o.z ?? 0) + 1,
            };
            return (
              <div key={o.id} style={common}
                onPointerDown={(e) => onHandleDown(e, o.kind, o.id, "move")}
                onDoubleClick={(e) => { e.stopPropagation(); if (o.kind === "text") { const t = prompt("Text", o.text); if (t != null) { setSelected({ kind: "text", id: o.id }); patchSelected({ text: t }); } } }}
              >
                {o.kind === "image"
                  ? <img src={o.url} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none",
                      clipPath: o.crop ? `inset(${o.crop.t}% ${o.crop.r}% ${o.crop.b}% ${o.crop.l}%)` : "none" }} />
                  : <div style={{ width: "100%", color: o.color, fontFamily: o.fontFamily, fontWeight: o.bold ? 700 : 400,
                      fontStyle: o.italic ? "italic" : "normal", textAlign: o.align, lineHeight: 1.2,
                      fontSize: `${(o.fontSize / 100) * (360 / arPct)}px`, pointerEvents: "none", wordBreak: "break-word" }}>{o.text}</div>}
                {isSel && (
                  <>
                    <span onPointerDown={(e) => onHandleDown(e, o.kind, o.id, "resize")} style={{ ...handle, right: -6, bottom: -6, cursor: "nwse-resize" }} />
                    <span onPointerDown={(e) => onHandleDown(e, o.kind, o.id, "rotate")} style={{ ...handle, left: "50%", top: -22, marginLeft: -6, cursor: "grab", background: "#22c55e" }} />
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <button className="btn-grey" style={btnSm} onClick={addText}>+ Text</button>
          <label className="btn-grey" style={{ ...btnSm, cursor: "pointer" }}>+ Image
            <input type="file" accept="image/*" hidden onChange={e => e.target.files[0] && addImageFromFile(e.target.files[0])} />
          </label>
          <label className="btn-grey" style={{ ...btnSm, cursor: "pointer" }}>Set background
            <input type="file" accept="image/*" hidden onChange={e => e.target.files[0] && setBackgroundFromFile(e.target.files[0])} />
          </label>
        </div>
      </div>

      {/* ── Properties panel ─────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 220, fontSize: 13 }}>
        {!sel && (
          <div style={{ color: "#8892B0" }}>
            <p style={{ fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>Background</p>
            <Row label="Fit">
              <select value={state.background.fit} onChange={e => normalizeAndEmit(s => { s.background.fit = e.target.value; return s; })} style={inp}>
                <option value="cover">cover</option><option value="contain">contain</option>
              </select>
            </Row>
            <Row label="Color"><input type="color" value={state.background.color} onChange={e => normalizeAndEmit(s => { s.background.color = e.target.value; return s; })} /></Row>
            <p style={{ marginTop: 14, color: "#64748b" }}>Select a layer to edit it, or add Text / Image.</p>
            <LayerList layers={allLayers} selected={selected} onSelect={setSelected} />
          </div>
        )}
        {sel && selected.kind === "text" && (
          <div>
            <PanelHeader title="Text" onDelete={removeSelected} onUp={() => reorder("up")} onDown={() => reorder("down")} />
            <Row label="Text"><textarea value={sel.text} onChange={e => patchSelected({ text: e.target.value })} rows={2} style={{ ...inp, resize: "vertical" }} /></Row>
            <Row label="Font">
              <select value={sel.fontFamily} onChange={e => patchSelected({ fontFamily: e.target.value })} style={inp}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Row>
            <Row label="Size"><input type="range" min="3" max="20" step="0.5" value={sel.fontSize} onChange={e => patchSelected({ fontSize: parseFloat(e.target.value) })} /></Row>
            <Row label="Color"><input type="color" value={sel.color} onChange={e => patchSelected({ color: e.target.value })} /></Row>
            <Row label="Align">
              <div style={{ display: "flex", gap: 4 }}>
                {["left", "center", "right"].map(a => <button key={a} className={`btn-grey${sel.align === a ? " active" : ""}`} style={btnSm} onClick={() => patchSelected({ align: a })}>{a[0].toUpperCase()}</button>)}
              </div>
            </Row>
            <Row label="Style">
              <div style={{ display: "flex", gap: 4 }}>
                <button className={`btn-grey${sel.bold ? " active" : ""}`} style={btnSm} onClick={() => patchSelected({ bold: !sel.bold })}><b>B</b></button>
                <button className={`btn-grey${sel.italic ? " active" : ""}`} style={btnSm} onClick={() => patchSelected({ italic: !sel.italic })}><i>I</i></button>
              </div>
            </Row>
            <Row label="Opacity"><input type="range" min="0" max="1" step="0.05" value={sel.opacity} onChange={e => patchSelected({ opacity: parseFloat(e.target.value) })} /></Row>
            <Row label="Rotate"><input type="range" min="-180" max="180" value={sel.rotation} onChange={e => patchSelected({ rotation: parseInt(e.target.value, 10) })} /></Row>
          </div>
        )}
        {sel && selected.kind === "image" && (
          <div>
            <PanelHeader title="Image" onDelete={removeSelected} onUp={() => reorder("up")} onDown={() => reorder("down")} />
            <Row label="Opacity"><input type="range" min="0" max="1" step="0.05" value={sel.opacity} onChange={e => patchSelected({ opacity: parseFloat(e.target.value) })} /></Row>
            <Row label="Rotate"><input type="range" min="-180" max="180" value={sel.rotation} onChange={e => patchSelected({ rotation: parseInt(e.target.value, 10) })} /></Row>
            <Row label="Crop T"><input type="range" min="0" max="45" value={sel.crop?.t ?? 0} onChange={e => patchSelected({ crop: { ...sel.crop, t: parseInt(e.target.value, 10) } })} /></Row>
            <Row label="Crop B"><input type="range" min="0" max="45" value={sel.crop?.b ?? 0} onChange={e => patchSelected({ crop: { ...sel.crop, b: parseInt(e.target.value, 10) } })} /></Row>
            <Row label="Crop L"><input type="range" min="0" max="45" value={sel.crop?.l ?? 0} onChange={e => patchSelected({ crop: { ...sel.crop, l: parseInt(e.target.value, 10) } })} /></Row>
            <Row label="Crop R"><input type="range" min="0" max="45" value={sel.crop?.r ?? 0} onChange={e => patchSelected({ crop: { ...sel.crop, r: parseInt(e.target.value, 10) } })} /></Row>
          </div>
        )}
      </div>

      {/* expose export to parent via ref-less callback */}
      <ExportBridge onReady={(fn) => { OverlayEditor._export = fn; }} exportPNG={exportPNG} />
    </div>
  );
}

// expose a static export hook the parent can call
OverlayEditor.exportCurrentPNG = () => (OverlayEditor._export ? OverlayEditor._export() : Promise.resolve(null));

// ── small helpers / subcomponents ─────────────────────────────────────────────
function ExportBridge({ onReady, exportPNG }) { useEffect(() => { onReady(exportPNG); }); return null; }
const btnSm = { padding: "3px 8px", fontSize: 12, borderRadius: 6 };
const inp = { width: "100%", padding: "4px 6px", background: "#0f1422", color: "#e5e7eb", border: "1px solid #252D42", borderRadius: 6, fontSize: 12 };
const handle = { position: "absolute", width: 12, height: 12, borderRadius: "50%", background: "#6068E8", border: "2px solid #fff" };

function Row({ label, children }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
    <span style={{ width: 64, color: "#8892B0", flexShrink: 0 }}>{label}</span><div style={{ flex: 1 }}>{children}</div></div>;
}
function PanelHeader({ title, onDelete, onUp, onDown }) {
  return <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
    <span style={{ fontWeight: 600, color: "#cbd5e1" }}>{title} layer</span>
    <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
      <button className="btn-grey" style={btnSm} title="Bring forward" onClick={onUp}>▲</button>
      <button className="btn-grey" style={btnSm} title="Send back" onClick={onDown}>▼</button>
      <button className="btn-grey" style={{ ...btnSm, color: "#f87171" }} onClick={onDelete}>Delete</button>
    </div></div>;
}
function LayerList({ layers, selected, onSelect }) {
  if (!layers.length) return null;
  return <div style={{ marginTop: 14 }}>
    <p style={{ fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>Layers ({layers.length})</p>
    {layers.slice().reverse().map(l => (
      <div key={l.id} onClick={() => onSelect({ kind: l.kind, id: l.id })}
        style={{ padding: "4px 8px", borderRadius: 6, marginBottom: 3, cursor: "pointer", fontSize: 12,
          background: selected?.id === l.id ? "#1e2640" : "transparent", color: "#cbd5e1" }}>
        {l.kind === "text" ? `T  ${(l.text || "").slice(0, 22)}` : "🖼  image"}
      </div>
    ))}
  </div>;
}

// ── pure utils ────────────────────────────────────────────────────────────────
function normalize(v) {
  if (!v || typeof v !== "object") return structuredClone(EMPTY);
  return {
    background: { ...EMPTY.background, ...(v.background || {}) },
    overlay_text: Array.isArray(v.overlay_text) ? v.overlay_text : [],
    overlay_image: Array.isArray(v.overlay_image) ? v.overlay_image : [],
  };
}
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function drawCover(ctx, img, W, H, fit) {
  const ar = img.width / img.height, car = W / H;
  let w, h, x, y;
  const cover = fit !== "contain";
  if ((ar > car) === cover) { h = H; w = H * ar; } else { w = W; h = W / ar; }
  if (fit === "contain") { if (ar > car) { w = W; h = W / ar; } else { h = H; w = H * ar; } }
  x = (W - w) / 2; y = (H - h) / 2;
  ctx.drawImage(img, x, y, w, h);
}
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = String(text || "").split(/\s+/); let line = ""; const lines = [];
  for (const w of words) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, x, startY + i * lh));
}
