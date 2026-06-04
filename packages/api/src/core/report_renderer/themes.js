/**
 * myPilotPost — Report Themes
 * Design token maps per template type. All reference CSS vars defined in the document.
 */

export const THEMES = {
  executive: {
    name: 'executive',
    displayName: 'Executive',
    cover: {
      bg: 'linear-gradient(160deg,#0a1628 0%,#0f172a 45%,#162442 100%)',
      accent: '#2563eb',
      text: '#ffffff',
      textMuted: 'rgba(255,255,255,0.52)',
      textSubtle: 'rgba(255,255,255,0.28)',
      divider: 'rgba(255,255,255,0.1)',
      badgeBg: 'rgba(37,99,235,0.2)',
      badgeBorder: 'rgba(37,99,235,0.45)',
      badgeText: '#93c5fd',
    },
    section: {
      watermarkColor: 'rgba(37,99,235,0.04)',
      accentBorder: '#2563eb',
      headerBg: '#f8fafc',
    },
    backpage: {
      bg: 'linear-gradient(160deg,#0a1628 0%,#0f172a 100%)',
      accent: '#2563eb',
      text: '#ffffff',
      textMuted: 'rgba(255,255,255,0.55)',
      divider: 'rgba(255,255,255,0.1)',
    },
  },
  agency: {
    name: 'agency',
    displayName: 'Agency',
    cover: {
      bg: 'linear-gradient(150deg,#111827 0%,#1f2937 55%,#0f172a 100%)',
      accent: '#3b82f6',
      text: '#ffffff',
      textMuted: 'rgba(255,255,255,0.5)',
      textSubtle: 'rgba(255,255,255,0.28)',
      divider: 'rgba(255,255,255,0.08)',
      badgeBg: 'rgba(59,130,246,0.15)',
      badgeBorder: 'rgba(59,130,246,0.35)',
      badgeText: '#93c5fd',
    },
    section: {
      watermarkColor: 'rgba(59,130,246,0.035)',
      accentBorder: '#3b82f6',
      headerBg: '#f9fafb',
    },
    backpage: {
      bg: 'linear-gradient(150deg,#111827 0%,#1f2937 100%)',
      accent: '#3b82f6',
      text: '#ffffff',
      textMuted: 'rgba(255,255,255,0.5)',
      divider: 'rgba(255,255,255,0.08)',
    },
  },
  white_label: {
    name: 'white_label',
    displayName: 'White Label',
    cover: {
      bg: 'linear-gradient(160deg,#1e293b 0%,#334155 100%)',
      accent: 'var(--wl-accent,#2563eb)',
      text: '#ffffff',
      textMuted: 'rgba(255,255,255,0.5)',
      textSubtle: 'rgba(255,255,255,0.28)',
      divider: 'rgba(255,255,255,0.1)',
      badgeBg: 'rgba(255,255,255,0.1)',
      badgeBorder: 'rgba(255,255,255,0.2)',
      badgeText: 'rgba(255,255,255,0.85)',
    },
    section: {
      watermarkColor: 'rgba(37,99,235,0.03)',
      accentBorder: 'var(--wl-accent,#2563eb)',
      headerBg: '#f8fafc',
    },
    backpage: {
      bg: 'linear-gradient(160deg,#1e293b 0%,#334155 100%)',
      accent: 'var(--wl-accent,#2563eb)',
      text: '#ffffff',
      textMuted: 'rgba(255,255,255,0.5)',
      divider: 'rgba(255,255,255,0.1)',
    },
  },
  internal: {
    name: 'internal',
    displayName: 'Internal',
    cover: {
      bg: 'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)',
      accent: '#64748b',
      text: '#ffffff',
      textMuted: 'rgba(255,255,255,0.5)',
      textSubtle: 'rgba(255,255,255,0.3)',
      divider: 'rgba(255,255,255,0.08)',
      badgeBg: 'rgba(255,255,255,0.08)',
      badgeBorder: 'rgba(255,255,255,0.15)',
      badgeText: 'rgba(255,255,255,0.7)',
    },
    section: {
      watermarkColor: 'rgba(100,116,139,0.05)',
      accentBorder: '#64748b',
      headerBg: '#f8fafc',
    },
    backpage: {
      bg: '#1e293b',
      accent: '#64748b',
      text: '#ffffff',
      textMuted: 'rgba(255,255,255,0.5)',
      divider: 'rgba(255,255,255,0.08)',
    },
  },
};

export function getTheme(name = 'executive') {
  return THEMES[name] || THEMES.executive;
}
