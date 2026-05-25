# AI Principles

**Route:** `/ai-principles`

Artificial intelligence is a core part of myPilotPost — but not in the way most platforms use it. We believe AI should assist human judgment, not replace it. Every AI feature in myPilotPost is designed to be explainable, advisory, and transparent.

> myPilotPost acts as a co-pilot, not an autopilot. Intelligence is built in, explainable, and advisory — never opaque or autonomous.

---

## What AI Does in myPilotPost

AI in myPilotPost is used to assist, suggest, and accelerate — not to act independently:

- **Content drafting assistance** — AI helps generate content variations and structures based on your brief
- **Brand voice enforcement** — AI checks content against stored brand guidelines before presenting it
- **Strategic recommendations** — AI surfaces descriptive insights about scheduling, timing, and content patterns
- **SEO assistance** — AI provides descriptive, explainable suggestions (descriptive, not predictive claims at v1)
- **Template-driven workflows** — AI fills structured templates based on mission context and brand identity
- **Next best action suggestions** — AI recommends what to do next; it does not execute without confirmation

---

## What AI Does NOT Do

> These are non-negotiable constraints embedded in the product architecture — not policy statements that could change on a whim.

- **AI does not auto-publish** — no content is ever sent to a platform without explicit user scheduling and approval
- **AI does not make hidden decisions** — every AI recommendation includes an explanation of why it was surfaced
- **AI does not replace human approval** — the Launch Pad requires deliberate scheduling; AI cannot bypass it
- **AI does not fabricate analytics** — all metrics are derived from real delivery and engagement data
- **AI does not manipulate engagement** — we do not use AI to artificially inflate or game platform metrics
- **AI does not access social media inboxes** — connected permissions are limited to publishing and analytics only
- **AI does not make predictive claims at v1** — all AI outputs are descriptive, not forecasts

---

## Machine Learning Architecture

### ML as an Offline Advisory Layer

Machine learning in myPilotPost is implemented as a separate, offline optimization layer. This design is intentional:

- ML models run separately from the real-time content and scheduling pipeline
- ML outputs are recommendations surfaced to users — they do not trigger automated actions
- ML becomes progressively more useful as real content and engagement data accumulates
- No architectural changes are required to activate ML capabilities as the platform matures

### Explainability by Design

Every AI-generated suggestion includes context about why it was made:

- Content recommendations reference the brand guidelines and mission context they were derived from
- Scheduling suggestions reference observed patterns from your own analytics
- No black-box outputs — if a recommendation cannot be explained, it is not shown

---

## Human-in-the-Loop by Default

| Stage | Human Control Point |
|---|---|
| Content generation | User reviews, edits, and approves every draft |
| Design | User creates in Canva; myPilotPost does not alter designs |
| Scheduling | User explicitly schedules each post; AI cannot schedule on their behalf |
| Publishing | Delivery is triggered by the schedule; no AI-initiated publishing |
| Analytics | AI surfaces patterns; users decide what to act on |
| ML recommendations | Presented as advisory suggestions; never enforced automatically |

---

## Our AI Governance Principles

- **Explainability over automation** — if we cannot explain it, we do not ship it
- **Descriptive insights before predictive claims** — we show you what happened before suggesting what might happen
- **Human-in-the-loop by default** — every AI action requires a human confirmation step
- **Brand isolation as a first-class rule** — AI models are never trained across customer brand boundaries
- **ML advises, never decides** — machine learning outputs are advisory inputs, not autonomous triggers
- **Admin observes and governs, never silently acts** — AI-assisted admin tools surface information; they do not alter customer state
- **Integrations extend value, they do not replace it** — AI assists connected platforms; it does not override them
