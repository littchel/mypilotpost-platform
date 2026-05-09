# myPilotPost — ARCHITECTURE RULES

## 🏛️ Core Principles
1. **Canon Over Chaos:** All new features must align with the "Canon Lock" operating system architecture. No "generic" pages.
2. **Platform-Native:** Publishing logic must follow the `platformRequirements.js` specs (ratios, durations, mobile safe zones).
3. **Identity-First:** Every request must be authenticated via `requireAuth` or `requireAdmin`. No anonymous data access.
4. **Brand-Aware:** All dashboard data must be scoped to `brand_id` using the `requireBrandContext` middleware.

## 📁 File Structure
- **`packages/api/src/auth`:** Authoritative source for security and RBAC.
- **`packages/api/src/core`:** Business logic (AI, Billing, Intelligence). Avoid putting logic directly in routes.
- **`packages/api/src/routes`:** Thin Hono or Wrangler wrappers around core logic.
- **`packages/dashboard/src/components/publishing`:** Verification-aware UI components.

## 🛠️ Technology Stack Standards
- **CSS:** Use Vanilla CSS and variables in `App.jsx` or specialized `.css` files. Avoid inline styles for complex layouts.
- **API:** Use `fetch` with the `Authorization: Bearer <token>` header.
- **State:** Use `AuthContext` for identity and `BrandContext` for active workspace management.

## 🔒 Security Requirements
- **Passwords:** Must use PBKDF2 with 100k iterations (Node/Worker compatible).
- **Tokens:** JWT only. Never store passwords in cleartext or local state.
- **CORS:** Origins must be explicitly whitelisted in `getCorsHeaders()`. No `*` allowed in production.
