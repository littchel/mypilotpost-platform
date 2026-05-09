import React, { useState } from "react";

/* ── DNA Completion Ring ── */
const DNARing = ({ pct }) => {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const fill = circ - (pct / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
      <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="url(#dnaGrad)" strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={fill}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)' }}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="dnaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{pct}%</div>
      </div>
    </div>
  );
};

/* ── Guided Field ── */
const GuidedField = ({ label, helper, placeholder, value, onChange, multiline, example }) => (
  <div style={{ marginBottom: 28 }}>
    <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
      {label}
    </label>
    {helper && (
      <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 8, fontStyle: 'italic' }}>
        {helper}
      </p>
    )}
    {multiline ? (
      <textarea
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e5e9f0', borderRadius: 10, fontSize: 14, color: '#0f172a', resize: 'vertical', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }}
        onFocus={e => e.target.style.borderColor = '#2563EB'}
        onBlur={e => e.target.style.borderColor = '#e5e9f0'}
      />
    ) : (
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e5e9f0', borderRadius: 10, fontSize: 14, color: '#0f172a', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }}
        onFocus={e => e.target.style.borderColor = '#2563EB'}
        onBlur={e => e.target.style.borderColor = '#e5e9f0'}
      />
    )}
    {example && (
      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
        <strong>Example:</strong> {example}
      </div>
    )}
  </div>
);

/* ── Tag Input ── */
const TagInput = ({ label, helper, tags, onChange }) => {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) { onChange([...tags, v]); setInput(''); }
  };
  return (
    <div style={{ marginBottom: 28 }}>
      <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{label}</label>
      {helper && <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 8, fontStyle: 'italic' }}>{helper}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 12px', border: '1.5px solid #e5e9f0', borderRadius: 10, minHeight: 48, marginBottom: 8 }}>
        {tags.map(t => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eff6ff', color: '#1d4ed8', borderRadius: 20, padding: '4px 10px', fontSize: 13, fontWeight: 600 }}>
            {t}
            <button onClick={() => onChange(tags.filter(x => x !== t))} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Type and press Enter..."
          style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, minWidth: 120, background: 'none' }}
        />
      </div>
    </div>
  );
};

/* ── Sub-tab panels ── */

const BrandCorePanel = ({ data, onChange }) => (
  <div>
    <GuidedField label="What is your brand's mission?" helper="The core reason your brand exists — beyond making money. This shapes every piece of content you create." placeholder="We exist to..." value={data.mission} onChange={v => onChange('mission', v)} multiline example="We exist to help independent business owners build the authority they deserve in their industry." />
    <GuidedField label="What is your brand's vision?" helper="Where your brand is headed in 3–5 years. A clear vision attracts the right audience and filters the wrong opportunities." placeholder="In 5 years, our brand will..." value={data.vision} onChange={v => onChange('vision', v)} multiline example="To become the most trusted growth partner for 10,000 service businesses across the UK and Australia." />
    <GuidedField label="What is your unique positioning?" helper="What makes you different from every competitor doing the same thing. Not features — strategic position." placeholder="Unlike others, we..." value={data.positioning} onChange={v => onChange('positioning', v)} multiline example="Unlike generic marketing agencies, we build brand authority systems — not just campaigns." />
    <TagInput label="Key differentiators" helper="3–6 things that genuinely set you apart from competitors. Be specific — avoid generic terms like 'quality' or 'service'." tags={data.differentiators || []} onChange={v => onChange('differentiators', v)} />
    <GuidedField label="Authority goals" helper="What authority position are you building in your industry? What do you want to be known and recognised for?" placeholder="We want to be known as..." value={data.authorityGoals} onChange={v => onChange('authorityGoals', v)} multiline />
  </div>
);

const AudienceDNAPanel = ({ data, onChange }) => (
  <div>
    <GuidedField label="Describe your ideal client profile (ICP)" helper="Be specific — industry, company size, role, revenue stage. The more precise, the better your content will perform." placeholder="My ideal client is..." value={data.icp} onChange={v => onChange('icp', v)} multiline example="Mid-market professional services firms (20–100 employees), founders or marketing managers, UK-based, £500K–£5M revenue, frustrated with inconsistent lead flow." />
    <GuidedField label="What are their deepest pain points?" helper="What keeps your ideal client up at night? What problems do they have that they've failed to solve?" placeholder="Their biggest frustrations are..." value={data.painPoints} onChange={v => onChange('painPoints', v)} multiline />
    <GuidedField label="What do they truly desire?" helper="The outcome they're actually chasing — not the feature they want, but the transformation they're after." placeholder="What they really want is..." value={data.desires} onChange={v => onChange('desires', v)} multiline />
    <GuidedField label="What objections do they have?" helper="The reasons they hesitate to buy. Addressing these in your content builds trust and reduces sales friction." placeholder="They hesitate because..." value={data.objections} onChange={v => onChange('objections', v)} multiline />
    <TagInput label="Buying triggers" helper="The specific events or moments that make them ready to act. Understanding triggers helps you time your content perfectly." tags={data.buyingTriggers || []} onChange={v => onChange('buyingTriggers', v)} />
    <GuidedField label="Psychographic profile" helper="Their values, worldview, aspirations. What do they care about beyond business? What do they read, follow, believe?" placeholder="They value..." value={data.psychographics} onChange={v => onChange('psychographics', v)} multiline />
  </div>
);

const VoicePanel = ({ data, onChange }) => (
  <div>
    <GuidedField label="Describe your brand's communication tone" helper="How would you describe the feeling of talking with your brand? Use 3–5 adjectives." placeholder="Our tone is..." value={data.tone} onChange={v => onChange('tone', v)} example="Direct, warm, strategic, confident — never corporate." />
    <TagInput label="Vocabulary we use" helper="Words and phrases that are characteristic of your brand voice. These should appear naturally in your content." tags={data.vocabulary || []} onChange={v => onChange('vocabulary', v)} />
    <TagInput label="Vocabulary we NEVER use" helper="Words that feel off-brand, too corporate, too generic, or wrong for your audience. Forbidden language." tags={data.forbiddenLanguage || []} onChange={v => onChange('forbiddenLanguage', v)} />
    <GuidedField label="CTA style" helper="How do your calls to action feel? Direct and urgent, or conversational and inviting?" placeholder="Our CTAs feel..." value={data.ctaStyle} onChange={v => onChange('ctaStyle', v)} example="Conversational — 'Let's talk about your brand' rather than 'Book Now'." />
    <GuidedField label="Communication style" helper="Long-form or short? Data-heavy or story-first? Educational or opinion-led?" placeholder="We communicate by..." value={data.communicationStyle} onChange={v => onChange('communicationStyle', v)} multiline />
  </div>
);

const ContentDNAPanel = ({ data, onChange }) => (
  <div>
    <TagInput label="Content pillars" helper="3–5 recurring themes your content always orbits. Everything you publish should connect to at least one pillar." tags={data.pillars || []} onChange={v => onChange('pillars', v)} />
    <TagInput label="Content formats you use" helper="The types of content that work best for your brand and audience." tags={data.formats || []} onChange={v => onChange('formats', v)} />
    <GuidedField label="Publishing cadence" helper="How often do you publish? Be realistic — consistency beats frequency." placeholder="We publish..." value={data.cadence} onChange={v => onChange('cadence', v)} example="4× per week across LinkedIn and Instagram. 1 long-form article per month." />
    <TagInput label="Authority themes" helper="The specific topic areas where you're building deep expertise and thought leadership." tags={data.authorityThemes || []} onChange={v => onChange('authorityThemes', v)} />
    <GuidedField label="Narrative priorities" helper="What story is your brand telling right now? What's the ongoing narrative arc you're building?" placeholder="The story we're telling is..." value={data.narrativePriorities} onChange={v => onChange('narrativePriorities', v)} multiline />
  </div>
);

const VisualDNAPanel = ({ data, onChange }) => (
  <div>
    <GuidedField label="Primary brand colour" helper="Your main brand colour (hex code or description)." placeholder="#2563EB or 'electric blue'" value={data.primaryColor} onChange={v => onChange('primaryColor', v)} />
    <GuidedField label="Secondary colours" helper="Supporting palette colours." placeholder="White, dark navy, warm gold..." value={data.secondaryColors} onChange={v => onChange('secondaryColors', v)} />
    <GuidedField label="Typography style" helper="Your font choices and typographic personality." placeholder="Clean sans-serif, modern editorial..." value={data.typography} onChange={v => onChange('typography', v)} />
    <GuidedField label="Visual direction" helper="How do your images, graphics, and visuals feel? Professional studio photography? Bold flat design? Documentary-style?" placeholder="Our visual style is..." value={data.visualDirection} onChange={v => onChange('visualDirection', v)} multiline example="Clean, premium, minimal. White backgrounds, natural light photography, confident people." />
    <GuidedField label="Imagery style" helper="What do your photos and graphics communicate emotionally?" placeholder="Our imagery evokes..." value={data.imageryStyle} onChange={v => onChange('imageryStyle', v)} />
  </div>
);

const GrowthGoalsPanel = ({ data, onChange }) => {
  const goals = [
    { key: 'awarenessGoal',   label: 'Awareness Goal',   placeholder: 'Reach 50,000 unique profiles per month in our target vertical...' },
    { key: 'leadGoal',        label: 'Lead Generation',  placeholder: 'Generate 30 qualified enquiries per month from LinkedIn content...' },
    { key: 'retentionGoal',   label: 'Retention Goal',   placeholder: 'Maintain 90%+ client retention through monthly value content...' },
    { key: 'seoGoal',         label: 'SEO Goal',         placeholder: 'Rank top 3 for 5 target keywords in our industry by Q3...' },
    { key: 'authorityGoal',   label: 'Authority Goal',   placeholder: 'Be featured in 3 industry publications and 5 podcasts by year end...' },
    { key: 'conversionGoal',  label: 'Conversion Goal',  placeholder: 'Convert 5% of content audience to email subscribers...' },
  ];
  return (
    <div>
      <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
        Set specific, measurable growth targets across each dimension. These goals will calibrate your Content Opportunities and intelligence scoring.
      </p>
      {goals.map(g => (
        <GuidedField key={g.key} label={g.label} placeholder={g.placeholder} value={data[g.key] || ''} onChange={v => onChange(g.key, v)} />
      ))}
    </div>
  );
};

const CompetitorDNAPanel = ({ data, onChange }) => {
  const competitors = data.competitors || [{ name: '', strengths: '', weaknesses: '', whitespace: '' }];
  const updateCompetitor = (i, field, val) => {
    const updated = [...competitors];
    updated[i] = { ...updated[i], [field]: val };
    onChange('competitors', updated);
  };
  const addCompetitor = () => onChange('competitors', [...competitors, { name: '', strengths: '', weaknesses: '', whitespace: '' }]);
  return (
    <div>
      <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
        Map your competitive landscape. Understanding what competitors are doing — and not doing — reveals the whitespace your brand can own.
      </p>
      {competitors.map((c, i) => (
        <div key={i} style={{ background: '#f8fafc', border: '1px solid #e5e9f0', borderRadius: 14, padding: 24, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: '#0f172a' }}>Competitor {i + 1}</div>
          <GuidedField label="Name" placeholder="Competitor name or URL" value={c.name} onChange={v => updateCompetitor(i, 'name', v)} />
          <GuidedField label="Their strengths" placeholder="What do they do well?" value={c.strengths} onChange={v => updateCompetitor(i, 'strengths', v)} multiline />
          <GuidedField label="Their weaknesses" placeholder="Where are they falling short?" value={c.weaknesses} onChange={v => updateCompetitor(i, 'weaknesses', v)} multiline />
          <GuidedField label="Whitespace opportunity" placeholder="What audience/topic/format are they missing that you can own?" value={c.whitespace} onChange={v => updateCompetitor(i, 'whitespace', v)} multiline />
        </div>
      ))}
      <button onClick={addCompetitor} style={{ background: 'none', border: '1.5px dashed #cbd5e1', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#64748b', cursor: 'pointer', width: '100%' }}>
        + Add Another Competitor
      </button>
    </div>
  );
};

/* ── Sub-tab config ── */
const SUB_TABS = [
  { id: 'brand-core',     label: 'Brand Core',        icon: 'fas fa-bullseye',     fields: ['mission','vision','positioning','differentiators','authorityGoals'] },
  { id: 'audience-dna',   label: 'Audience DNA',       icon: 'fas fa-users',        fields: ['icp','painPoints','desires','objections','buyingTriggers','psychographics'] },
  { id: 'voice',          label: 'Voice & Messaging',  icon: 'fas fa-comment-alt',  fields: ['tone','vocabulary','forbiddenLanguage','ctaStyle','communicationStyle'] },
  { id: 'content-dna',    label: 'Content DNA',        icon: 'fas fa-file-alt',     fields: ['pillars','formats','cadence','authorityThemes','narrativePriorities'] },
  { id: 'visual-dna',     label: 'Visual DNA',         icon: 'fas fa-paint-brush',  fields: ['primaryColor','secondaryColors','typography','visualDirection','imageryStyle'] },
  { id: 'growth-goals',   label: 'Growth Goals',       icon: 'fas fa-rocket',       fields: ['awarenessGoal','leadGoal','retentionGoal','seoGoal','authorityGoal','conversionGoal'] },
  { id: 'competitor-dna', label: 'Competitor DNA',     icon: 'fas fa-binoculars',   fields: ['competitors'] },
];

const PANEL_COMPONENTS = {
  'brand-core':     BrandCorePanel,
  'audience-dna':   AudienceDNAPanel,
  'voice':          VoicePanel,
  'content-dna':    ContentDNAPanel,
  'visual-dna':     VisualDNAPanel,
  'growth-goals':   GrowthGoalsPanel,
  'competitor-dna': CompetitorDNAPanel,
};

/* ── Main component ── */
export default function BrandDNA({ activeBrand }) {
  const [activeSubTab, setActiveSubTab] = useState('brand-core');
  const [saved, setSaved] = useState(false);
  const [dna, setDna] = useState({
    mission: '', vision: '', positioning: '', differentiators: [], authorityGoals: '',
    icp: '', painPoints: '', desires: '', objections: '', buyingTriggers: [], psychographics: '',
    tone: '', vocabulary: [], forbiddenLanguage: [], ctaStyle: '', communicationStyle: '',
    pillars: [], formats: [], cadence: '', authorityThemes: [], narrativePriorities: '',
    primaryColor: '', secondaryColors: '', typography: '', visualDirection: '', imageryStyle: '',
    awarenessGoal: '', leadGoal: '', retentionGoal: '', seoGoal: '', authorityGoal: '', conversionGoal: '',
    competitors: [{ name: '', strengths: '', weaknesses: '', whitespace: '' }],
  });

  const updateField = (field, value) => setDna(d => ({ ...d, [field]: value }));

  // Calculate completion
  const allScalarFields = [
    'mission','vision','positioning','authorityGoals',
    'icp','painPoints','desires','objections','psychographics',
    'tone','ctaStyle','communicationStyle',
    'cadence','narrativePriorities',
    'primaryColor','typography','visualDirection','imageryStyle',
    'awarenessGoal','leadGoal',
  ];
  const allArrayFields = ['differentiators','buyingTriggers','vocabulary','forbiddenLanguage','pillars','formats','authorityThemes'];
  const scalarFilled = allScalarFields.filter(f => dna[f]?.trim?.()).length;
  const arrayFilled  = allArrayFields.filter(f => (dna[f]?.length || 0) > 0).length;
  const competitorFilled = (dna.competitors || []).some(c => c.name?.trim());
  const totalFields = allScalarFields.length + allArrayFields.length + 1;
  const filledFields = scalarFilled + arrayFilled + (competitorFilled ? 1 : 0);
  const completionPct = Math.round((filledFields / totalFields) * 100);

  const Panel = PANEL_COMPONENTS[activeSubTab];
  const currentTab = SUB_TABS.find(t => t.id === activeSubTab);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    // TODO: wire to /api/customer/brand PATCH
  };

  return (
    <div style={{ padding: '32px 36px', maxWidth: 960, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#2563EB', marginBottom: 10 }}>
            Strategic Foundation
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Brand DNA</h1>
          <p style={{ fontSize: 15, color: '#64748b', maxWidth: 540, lineHeight: 1.6 }}>
            Teach myPilotPost about <strong style={{ color: '#0f172a' }}>{activeBrand?.name || 'your brand'}</strong>. This is the strategic foundation that powers your intelligence, opportunities, and content system.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <DNARing pct={completionPct} />
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 4 }}>DNA Complete</div>
          </div>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 32, borderBottom: '1px solid #e5e9f0', paddingBottom: 0, overflowX: 'auto' }}>
        {SUB_TABS.map(tab => {
          const isActive = activeSubTab === tab.id;
          const filled = tab.fields.filter(f =>
            Array.isArray(dna[f]) ? dna[f].length > 0 : dna[f]?.trim?.()
          ).length;
          const total = tab.fields.length;
          return (
            <button
              key={tab.id}
              id={`brand-dna-tab-${tab.id}`}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px',
                background: 'none', border: 'none',
                borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                color: isActive ? '#2563EB' : '#64748b',
                fontWeight: isActive ? 700 : 500, fontSize: 13, cursor: 'pointer',
                whiteSpace: 'nowrap', marginBottom: -1,
                transition: 'color 0.2s, border-color 0.2s',
              }}
            >
              <i className={tab.icon} style={{ fontSize: 12 }} />
              {tab.label}
              {filled > 0 && (
                <span style={{ background: filled === total ? '#22c55e' : '#2563EB', color: '#fff', borderRadius: 99, fontSize: 9, fontWeight: 800, padding: '2px 6px', minWidth: 18, textAlign: 'center' }}>
                  {filled}/{total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Advisory context for this section */}
      {currentTab && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 20px', marginBottom: 28, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <i className={currentTab.icon} style={{ color: '#2563EB', marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', marginBottom: 3 }}>
              {currentTab.label} — Strategic Workshop
            </div>
            <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.5 }}>
              Complete this section to enable personalised intelligence, content strategy, and growth opportunities specific to your brand.
            </div>
          </div>
        </div>
      )}

      {/* Active panel */}
      {Panel && <Panel data={dna} onChange={updateField} />}

      {/* Save bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid #f1f5f9', marginTop: 12 }}>
        <button
          onClick={handleSave}
          style={{
            background: saved ? '#22c55e' : '#2563EB', color: '#fff', border: 'none',
            borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            transition: 'background 0.3s',
          }}
        >
          {saved ? '✓ Saved' : 'Save Brand DNA'}
        </button>
      </div>
    </div>
  );
}
