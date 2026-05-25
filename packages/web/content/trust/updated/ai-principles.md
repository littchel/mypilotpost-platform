# AI Principles

**Route:** `/ai-principles`

**Thuthu (Pty) Ltd t/a myPilotPost** · Registration Number: 2025/102758/07  
23 Fielding Crescent, Mondeor Green, Johannesburg, Gauteng, 2091, South Africa

---

Artificial intelligence is a core part of myPilotPost — but not in the way most platforms use it. We believe AI should assist human judgment, not replace it. Every AI feature in myPilotPost is designed to be explainable, advisory, and transparent. No AI system within myPilotPost makes automated decisions with legal or similarly significant effects on users without human review.

This page documents our AI governance position in plain language. These are architectural constraints embedded in the platform — not marketing statements.

> myPilotPost acts as a co-pilot, not an autopilot. Intelligence is built in, explainable, and advisory — never opaque or autonomous.

---

## What AI Does in myPilotPost

AI in myPilotPost is used to assist, suggest, and accelerate content workflows — not to act independently on your behalf:

- **Content drafting assistance** — AI helps generate content variations and structures based on your mission brief and brand context
- **Brand voice enforcement** — AI checks content against your stored brand guidelines before presenting drafts
- **Strategic recommendations** — AI surfaces descriptive insights about scheduling, timing, and content patterns based on your own data
- **SEO assistance** — AI provides descriptive, explainable suggestions; at v1, no predictive performance claims are made
- **Template-driven workflows** — AI fills structured content templates based on your mission context and brand identity
- **Next best action suggestions** — AI recommends what to do next; it does not execute any action without explicit user confirmation

---

## What AI Does NOT Do

> These are non-negotiable constraints embedded in the product architecture and enforceable as commitments under our Terms and Conditions.

- **AI does not auto-publish** — no content is ever sent to a third-party platform without explicit user scheduling and approval via the Launch Pad
- **AI does not make hidden decisions** — every AI recommendation surfaces an explanation of why it was generated
- **AI does not replace human approval** — the scheduling and approval workflow requires deliberate user action; AI cannot bypass or shortcut this step
- **AI does not fabricate analytics** — all metrics displayed in Mission Analytics are derived from real delivery and engagement data from connected platforms; we do not generate estimated or modelled engagement figures
- **AI does not manipulate engagement** — we do not use AI to artificially inflate, game, or misrepresent platform metrics
- **AI does not access social media inboxes** — OAuth permissions are scoped to publishing and analytics retrieval only; we do not request or access direct messages, private content, or inbox data
- **AI does not make automated decisions with legal effects** — consistent with GDPR Article 22 and POPIA's principles, no automated processing within myPilotPost produces decisions that legally or significantly affect users without human involvement

---

## Machine Learning Architecture

### ML as an Offline Advisory Layer

Machine learning in myPilotPost is implemented as a separate, offline optimisation layer. This is an intentional architectural decision:

- ML models run separately from the real-time content and scheduling pipeline
- ML outputs are advisory recommendations surfaced to users — they do not trigger automated platform actions
- ML capabilities become progressively more accurate as real content and engagement data accumulates in your account
- No architectural changes are required to activate enhanced ML capabilities as the platform matures

### Explainability by Design

Every AI-generated suggestion includes context about why it was generated:

- Content recommendations reference the brand guidelines and mission context they were derived from
- Scheduling suggestions reference observed patterns from your own historical analytics data
- No black-box outputs — if a recommendation cannot be explained in plain language, it is not surfaced to users

---

## Human-in-the-Loop by Default

myPilotPost is built on the principle that human judgment governs every consequential action:

| Stage | Human Control Point |
|---|---|
| Content generation | User reviews, edits, and approves every draft before it can be scheduled |
| Design | User creates in Canva; myPilotPost does not modify designs autonomously |
| Scheduling | User explicitly schedules each post via the Launch Pad; AI cannot schedule on their behalf |
| Publishing | Delivery is triggered only by the confirmed schedule; no AI-initiated publishing occurs |
| Analytics | AI surfaces patterns; users decide what strategic action to take |
| ML recommendations | Presented as advisory suggestions in the UI; never enforced or executed automatically |

---

## AI Governance Principles

These principles govern all AI development and deployment at myPilotPost:

- **Explainability over automation** — if we cannot explain a recommendation in plain language, we do not ship it
- **Descriptive insights before predictive claims** — we show you what has happened before suggesting what might happen
- **Human-in-the-loop by default** — every AI-assisted action requires a deliberate human confirmation step
- **Brand isolation as a first-class rule** — AI features are never trained across customer brand boundaries; your brand data does not influence another customer's AI outputs
- **ML advises, never decides** — machine learning outputs are advisory inputs, not autonomous triggers
- **Admin observes and governs, never silently acts** — AI-assisted admin tools surface information for governance purposes; they do not alter customer data or state
- **No automated decisions with significant effects** — consistent with GDPR Article 22 and POPIA's accountability principle

---

*Questions about AI governance: trust@mypilotpost.com*  
*Legal: legal@mypilotpost.com*
