# 📘 myPilotPost — UI/UX DESIGN SYSTEM (AUTHORITATIVE v1.2)

Status: LOCKED  
Scope: Customer Dashboard UI (Frontend System)  
Source Priority:
1. index.html (PRIMARY RENDER TRUTH)
2. Design System Canon (TOKENS + RULES)
3. Platform Canons (CONSTRAINTS)

---

# 1️⃣ CORE PRINCIPLE (NON-NEGOTIABLE)

The UI is not designed — it is rendered from system truth.

Rules:
- HTML = visual truth
- Canon = behavioral + structural truth
- If conflict → FIX HTML
- No redesigns allowed
- No interpretation allowed

---

# 2️⃣ DESIGN TOKENS (MANDATORY SYSTEM)

## 2.1 Color Tokens

ALL COLORS MUST USE TOKENS — NEVER HARD CODE

css :root {   --pilot-blue: #2563eb;   --pilot-blue-light: #dbeafe;    --sidebar-bg: #ffffff;    --text-main: #0f172a;   --text-muted: #64748b;    --border-subtle: #e5e7eb;    --surface-primary: #ffffff;   --surface-secondary: #f8fafc;   --surface-background: #fdfdfd;    --hover-bg: #f1f5f9;    --radius-md: 6px;   --radius-lg: 10px;    --card-shadow: 0 1px 2px rgba(0,0,0,0.04); } 

---

## 2.2 Color Usage Rules

Primary:
- pilot-blue → active states, key actions

Secondary:
- pilot-blue-light → active backgrounds

Surfaces:
- background → surface-background
- cards → surface-primary
- tables/modals → surface-secondary

Borders:
- ALWAYS border-subtle

Hover:
- ONLY hover-bg

---

## 2.3 Forbidden

❌ Hex colors in components  
❌ Tailwind colors  
❌ Inline styles  

---

# 3️⃣ TYPOGRAPHY SYSTEM

## 3.1 Font Stack

- Inter (woff2)
- system fallback

---

## 3.2 Font Sizes (LOCKED)

css 0.65rem  /* labels */ 0.75rem  /* table headers */ 0.85rem  /* body text */ 1.3rem   /* brand */ 

---

## 3.3 Font Weights

css 400 500 600 700 800 

---

## 3.4 Rules

- Uppercase ONLY for section labels
- No new font sizes allowed
- No new weights allowed

---

# 4️⃣ SPACING SYSTEM (STRICT GRID)

## 4.1 Base Rule

All spacing MUST follow 4px grid.

---

## 4.2 Allowed Values

css 4px   (0.25rem) 8px   (0.5rem) 12px  (0.75rem) 16px  (1rem) 20px  (1.25rem) 24px  (1.5rem) 

---

## 4.3 Forbidden

❌ 0.6rem  
❌ 0.4rem  
❌ any non-multiple of 4px  

---

# 5️⃣ LAYOUT SYSTEM

## 5.1 Global Structure

text Sidebar (fixed) Header (top) Main Layout:   - Workspace (left)   - Intel Sidebar (right) Modals 

---

## 5.2 Sidebar

css .sidebar {   width: 260px;   background: var(--sidebar-bg);   border-right: 1px solid var(--border-subtle);   padding: 1rem 0.75rem;   display: flex;   flex-direction: column;   height: 100vh;   position: fixed; } 

---

## 5.3 Header

css header {   height: 56px;   background: #fff;   border-bottom: 1px solid var(--border-subtle);   padding: 0 1.25rem;   display: flex;   align-items: center;   justify-content: space-between; } 

---

## 5.4 Main Layout

css main {   display: grid;   grid-template-columns: 1fr 180px; } 

---

## 5.5 Workspace

css #workspace-area {   padding: 1rem;   background: var(--surface-background);   overflow-y: auto; } 

---

## 5.6 Intel Sidebar

css width: 180px; background: #fff; padding: 0.75rem 0.5rem; 

---

# 6️⃣ COMPONENT SYSTEM

---

## 6.1 Navigation

css .nav-link {   padding: 0.5rem;   font-size: 0.85rem;   border-radius: var(--radius-md); } 

States:

- Default → text-main  
- Hover → hover-bg + pilot-blue  
- Active → pilot-blue-light + pilot-blue  

---

## 6.2 Cards

css .card-workspace {   background: var(--surface-primary);   border: 1px solid var(--border-subtle);   border-radius: var(--radius-lg);   padding: 1rem;   box-shadow: var(--card-shadow); } 

---

## 6.3 Inputs

css .input-pill {   padding: 0.5rem 0.75rem;   border: 1px solid var(--border-subtle);   border-radius: var(--radius-md);   font-size: 0.85rem; } 

---

## 6.4 Tables

css th {   background: var(--surface-secondary);   font-size: 0.75rem;   text-transform: uppercase; }  td {   font-size: 0.85rem; } 

---

## 6.5 Modals

css .modal-body {   padding: 1rem; }  .modal-header, .modal-footer {   padding: 0.75rem 1rem; } 

---

## 6.6 Calendar

css .calendar-week-view {   display: grid;   grid-template-columns: repeat(7, 1fr);   gap: 0.5rem; /* FIXED from 0.4rem */ } 

---

## 6.7 Comments

css .comment-item {   border-bottom: 1px solid var(--border-subtle);   padding: 0.5rem 0; } 

---

# 7️⃣ INTERACTION SYSTEM

## 7.1 States

Hover:
- background → hover-bg

Active:
- background → pilot-blue-light
- text → pilot-blue

Focus:
- must always be visible

---

## 7.2 Transitions

css transition: 0.2s ease; 

---

# 8️⃣ ACCESSIBILITY (MANDATORY)

- Contrast ≥ 4.5:1
- Keyboard navigation enabled
- Focus visible on ALL interactive elements
- ARIA labels for icons
- Semantic HTML only

---

## Tab Order

1. Header  
2. Sidebar  
3. Main  
4. Footer  

---

# 9️⃣ PERFORMANCE RULES

- HTML < 50KB  
- CSS < 30KB  
- JS < 100KB  

---

## Required

- Lazy loading
- No layout shifts
- Smooth scrolling

---

# 🔟 FILE STRUCTURE (FRONTEND RULE)

text HTML   Head   Body     Sidebar     Header     Main     Modals Scripts 

---

# 1️⃣1️⃣ SYSTEM VIOLATIONS (MUST BE FIXED)

### Spacing Violations
- 0.6rem → replace with 0.5 or 0.75
- 0.4rem → replace with 0.5

---

### Color Violations
Replace:
- #f1f5f9 → var(--hover-bg)
- #f8fafc → var(--surface-secondary)
- #fdfdfd → var(--surface-background)

---

### Token Violations
- Any raw hex → REMOVE

---

# 1️⃣2️⃣ ENFORCEMENT RULES

DO NOT:

- Add new components
- Change layout
- Introduce new spacing
- Introduce new colors

ALWAYS:

- Use tokens
- Follow 4px grid
- Match HTML structure
- Maintain consistency

---

# 1️⃣3️⃣ FINAL TRUTH

This system is:

✔ Architecturally correct  
⚠ Partially tokenized  
❌ Inconsistently implemented  

---

# 🚨 FINAL DIRECTIVE

UI must be:

- Token-pure  
- Grid-aligned  
- Canon-compliant  

Anything else = SYSTEM DRIFT

---

# 🏁 STATUS

UI SYSTEM: LOCKED  
R