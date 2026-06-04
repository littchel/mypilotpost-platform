/**
 * myPilotPost — Table of Contents Builder
 * Generates TOC structure and HTML string from sections list.
 */

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildContents(sections) {
  return sections.map(s => ({
    number: s.number,
    title: s.title,
    anchor: `s${s.number}`,
  }));
}

export function renderTOC(items) {
  const rows = items.map(item => {
    const num = String(item.number).padStart(2, '0');
    return `
      <a href="#${item.anchor}" class="toc-row">
        <span class="toc-num">${num}</span>
        <span class="toc-title">${esc(item.title)}</span>
        <span class="toc-leader" aria-hidden="true"></span>
        <span class="toc-ref">§${item.number}</span>
      </a>`;
  }).join('');

  return `
    <div class="report-contents" id="contents">
      <div class="contents-inner">
        <div class="contents-eyebrow">REPORT CONTENTS</div>
        <h2 class="contents-heading">What's Inside</h2>
        <div class="contents-rule"></div>
        <nav class="toc-list" aria-label="Report contents">${rows}</nav>
        <div class="contents-footer-bar">
          <span class="contents-brand-credit">myPilotPost &middot; Brand Intelligence Platform</span>
        </div>
      </div>
    </div>`;
}
