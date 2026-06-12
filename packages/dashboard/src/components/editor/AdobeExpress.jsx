// packages/dashboard/src/components/editor/AdobeExpress.jsx
// Adobe Express Embed (CCEverywhere v4). Launches the Adobe Express editor in-app and
// imports the published design back into the composer. Uses a PUBLIC, domain-allowlisted
// client_id fetched from the API (never a secret).
//
// NOTE: the Embed SDK validates the client_id against the Adobe project's allowed domains
// IN-BROWSER. On a non-allowlisted origin (e.g. localhost) initialization may be rejected by
// Adobe — that is an Adobe project config concern, surfaced here rather than hidden.

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

export default function AdobeExpress({ onImport, seedImage }) {
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error | unavailable
  const [error, setError] = useState(null);
  const ccRef = useRef(null);
  const cfgRef = useRef(null);

  // Fetch the public client_id + capability state
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await apiRequest("/api/customer/integrations/adobe/config");
        if (cancelled) return;
        if (!cfg?.express_enabled || !cfg?.client_id) { setStatus("unavailable"); return; }
        cfgRef.current = cfg;
        setStatus("idle");
      } catch {
        if (!cancelled) setStatus("unavailable");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const ensureReady = useCallback(async () => {
    if (ccRef.current) return ccRef.current;
    setStatus("loading"); setError(null);
    const CCEverywhere = await loadSDK();
    const cfg = cfgRef.current;
    const cc = await CCEverywhere.initialize({
      clientId: cfg.client_id,
      appName: cfg.app_name || "MyPilotPost",
      appVersion: { major: 1, minor: 0 },
      platformCategory: "web",
    });
    ccRef.current = cc;
    setStatus("ready");
    return cc;
  }, []);

  const launch = useCallback(async () => {
    try {
      const cc = await ensureReady();
      const editor = cc.editor || cc; // v4 exposes .editor
      const callbacks = {
        onPublish: (_intent, publishParams) => {
          try {
            const asset = (publishParams?.asset || publishParams?.assets || [])[0];
            const dataUrl = asset?.data || asset?.dataURL || asset?.url;
            if (dataUrl && onImport) onImport(dataUrl);
          } catch (e) { setError("Could not read published asset: " + e.message); }
        },
        onError: (err) => setError("Adobe Express error: " + (err?.message || String(err))),
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
      setStatus("error");
      setError(e.message || String(e));
    }
  }, [ensureReady, onImport, seedImage]);

  if (status === "unavailable") {
    return <span className="extra-small text-muted">Adobe Express not configured</span>;
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button className="btn-grey btn-sm" onClick={launch} disabled={status === "loading"}>
        <i className="fas fa-bezier-curve me-1" style={{ color: "#fa0f00" }}></i>
        {status === "loading" ? "Loading Adobe…" : "Adobe Express"}
      </button>
      {error && <span className="extra-small" style={{ color: "#f87171" }} title={error}>Adobe error — hover</span>}
    </span>
  );
}
