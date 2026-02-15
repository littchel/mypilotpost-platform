import { encrypt } from "../../lib/crypto.js";
import CanvaProvider from "./providers/canva.js";
import GoogleDriveProvider from "./providers/google-drive.js";
import DropboxProvider from "./providers/dropbox.js";
import ZapierProvider from "./providers/zapier.js";

const PROVIDERS = {
  canva: CanvaProvider,
  google_drive: GoogleDriveProvider,
  dropbox: DropboxProvider,
  zapier: ZapierProvider
};

export async function startOAuth(request, env, brandId, providerName) {
  const Provider = PROVIDERS[providerName];
  if (!Provider) throw new Error("Unsupported provider");

  const state = crypto.randomUUID();
  const redirectUri = `${env.PUBLIC_BASE_URL}/api/integrations/oauth/callback`;

  await env.ADMIN_DB.prepare(`
    INSERT INTO oauth_states (state, brand_id, provider, redirect_uri, expires_at)
    VALUES (?, ?, ?, ?, datetime('now', '+10 minutes'))
  `).bind(state, brandId, providerName, redirectUri).run();

  const provider = new Provider();
  return Response.redirect(
    provider.authorize({ state, redirectUri, env }),
    302
  );
}
