import React, { useState } from "react";

/**
 * Integrations - FINAL LOCK REBUILD
 * 1:1 Parity with index.html. 8 Platforms. Identical layout.
 */
export default function Integrations() {
  const [openSection, setOpenSection] = useState('social');

  const platforms = [
    { id: 'facebook', name: 'Facebook', iconColor: '#1877F2', status: 'Connected', path: 'M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1V12h3l-.5 3H13v6.8c4.56-.93 8-4.96 8-9.8z' },
    { id: 'instagram', name: 'Instagram', iconColor: '#E4405F', status: 'Not Connected', path: 'M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z' },
    { id: 'linkedin', name: 'LinkedIn', iconColor: '#0A66C2', status: 'Not Connected', path: 'M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z' },
    { id: 'twitter', name: 'X (Twitter)', iconColor: '#000000', status: 'Not Connected', path: 'M18.24 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.446-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.079 19.77z' },
    { id: 'tiktok', name: 'TikTok', iconColor: '#000000', status: 'Not Connected', path: 'M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64c0 3.33 2.76 5.7 5.69 5.7c3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z' },
    { id: 'pinterest', name: 'Pinterest', iconColor: '#E60023', status: 'Not Connected', path: 'M9.04 21.54c.96.29 1.93.46 2.96.46a10 10 0 0 0 10-10A10 10 0 0 0 12 2A10 10 0 0 0 2 12c0 4.25 2.67 7.9 6.44 9.34c-.09-.78-.18-2.07 0-2.96l1.15-4.94s-.29-.58-.29-1.5c0-1.38.86-2.41 1.84-2.41c.86 0 1.26.63 1.26 1.44c0 .86-.57 2.09-.86 3.27c-.17.98.52 1.84 1.52 1.84c1.78 0 3.16-1.9 3.16-4.58c0-2.4-1.72-4.04-4.19-4.04c-2.82 0-4.48 2.1-4.48 4.31c0 .86.28 1.73.74 2.3c.09.06.09.14.06.29l-.29 1.09c0 .17-.11.23-.28.11c-1.28-.56-2.02-2.38-2.02-3.85c0-3.16 2.24-6.03 6.56-6.03c3.44 0 6.12 2.47 6.12 5.75c0 3.44-2.13 6.2-5.18 6.2c-.98 0-1.92-.52-2.26-1.13l-.67 2.37c-.24.86-.86 2.01-1.29 2.7v-.03z' },
    { id: 'youtube', name: 'YouTube', iconColor: '#FF0000', status: 'Not Connected', path: 'M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73z' },
    { id: 'wordpress', name: 'WordPress', iconColor: '#21759b', status: 'Not Connected', path: 'M12.158 12.786l-2.698 7.84c.806.236 1.657.365 2.54.365a9.96 9.96 0 005.424-1.583L12.158 12.786zM3.488 18.067L9.362 2c-.642.103-1.258.26-1.839.467L3.488 18.067zm12.376-7.466c0-.986-.35-1.67-.65-2.2-.426-.68-.824-1.26-.824-1.942 0-.77.584-1.488 1.408-1.488.04 0 .076.004.116.006A7.983 7.983 0 0012 4.01c-2.422 0-4.607.98-6.195 2.56.126.004.246.012.356.012.89 0 2.27-.107 2.27-.107.46-.027.514.65.054.704 0 0-.463.054-1.077.08l3.41 10.15 2.05-6.155-1.458-3.996c-.538-.026-.952-.08-1.05-.08-.46-.027-.406-.704.054-.704 0 0 1.408.107 2.242.107.89 0 2.27-.107 2.27-.107.46-.027.514.65.054.704 0 0-.463.054-1.077.08zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z' }
  ];

  return (
    <div id="tab-integrations">
      <div className="accordion" id="intAcc">
        <div className="accordion-item border-0 mb-3 shadow-sm rounded overflow-hidden">
          <h2 className="accordion-header">
            <button 
              className={`accordion-button ${openSection === 'social' ? '' : 'collapsed'} fw-bold text-main bg-surface-primary`} 
              onClick={() => setOpenSection(openSection === 'social' ? '' : 'social')}
            >
              Social Media Platforms
            </button>
          </h2>
          {openSection === 'social' && (
            <div className="accordion-collapse collapse show">
              <div className="accordion-body p-3 bg-light">
                <div className="row g-3">
                  {platforms.map(p => (
                    <div key={p.id} className="col-6">
                      <div className="integration-card p-3 bg-white border rounded shadow-sm text-center">
                        <div className="integration-icon mb-2">
                          <svg 
                            className="icon-32" 
                            style={{ '--plat-color': p.iconColor }} 
                            viewBox="0 0 24 24"
                          >
                            <path d={p.path} fill="var(--plat-color)"></path>
                          </svg>
                        </div>
                        <h6 className="fw-bold mb-1 extra-small">{p.name}</h6>
                        <span className={`badge ${p.status === 'Connected' ? 'bg-success' : 'bg-secondary'} mb-2`}>{p.status}</span>
                        {p.status === 'Connected' ? (
                          <button className="btn btn-outline-danger btn-sm w-100 extra-small">Revoke</button>
                        ) : (
                          <button className="btn-pilot btn-sm w-100 extra-small">Connect</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="accordion-item border-0 mb-3 shadow-sm rounded overflow-hidden">
          <h2 className="accordion-header">
            <button 
              className={`accordion-button ${openSection === 'analytics' ? '' : 'collapsed'} fw-bold text-main bg-surface-primary`} 
              onClick={() => setOpenSection(openSection === 'analytics' ? '' : 'analytics')}
            >
              Analytics & Search
            </button>
          </h2>
          {openSection === 'analytics' && (
            <div className="accordion-collapse collapse show">
              <div className="accordion-body p-3 bg-light">
                <div className="mb-3 p-3 bg-white border rounded shadow-sm">
                  <label className="extra-small fw-bold d-block mb-2 text-uppercase">Google Analytics 4</label>
                  <input className="input-pill mb-2 w-100 extra-small" placeholder="GA4 Measurement ID" type="text" />
                  <button className="btn-pilot btn-sm">Connect GA4</button>
                </div>
                <div className="mb-3 p-3 bg-white border rounded shadow-sm">
                  <label className="extra-small fw-bold d-block mb-2 text-uppercase">Google Search Console</label>
                  <button className="btn-pilot btn-sm w-100 extra-small">Connect Console</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
