# myPilotPost — KNOWN ISSUES

## 🛑 Critical
- **GitHub Origin Missing:** Local repository is not linked to a remote origin. Manual `git remote add` required.
- **Admin Portal Pathing:** If running `http-server` from the API root, the dashboard is at `/admin-portal/` instead of `/`. Recommend starting server inside the folder.

## ⚠️ High Priority
- **Password Reset Flow:** Verification email service is mocked in local environment. Tokens are generated but not sent via real SMTP.
- **Google Auth Local Callback:** Google OAuth requires `localhost:3000` to be whitelisted in the Google Cloud Console for the client ID.

## 🟡 Minor / UX
- **Placeholders:** Some dashboard widgets (Analytics charts) are currently using high-fidelity mock data instead of live D1 aggregations.
- **Image Previews:** Some legacy image assets in `packages/web/images` were deleted during cleanup; verification of all marketing links is needed.

## 📋 Fixed in V1.2.1
- [FIXED] Dashboard "Failed to Fetch" (CORS).
- [FIXED] Dashboard Port mismatch (Moved 5173 -> 3000).
- [FIXED] Simple login page (Restored premium 2-column layout).
- [FIXED] Hardcoded Admin bypass (Implemented RBAC login).
