/**
 * myPilotPost — LinkedIn Platform Adapter
 * Canon 5 — Delivery Execution Truth
 *
 * Contract:
 * - Exposes deliver()
 * - Returns { success: true } OR
 *   { success: false, error_code, error_message }
 * - Stores external_post_id
 * - Does NOT update delivery_jobs.status
 *   (poster.js owns final state transition)
 */

import { getDB } from "../../lib/db.js";

export async function deliver({ content_id, brand_id }) {
  const env = globalThis.__ENV__;
  const db = getDB(env);

  try {
    /* ------------------------------------------
       1. Fetch LinkedIn token
    ------------------------------------------ */

    const account = await db
      .prepare(
        `
        SELECT access_token
        FROM connected_accounts
        WHERE brand_id = ?
          AND platform = 'linkedin'
        LIMIT 1
        `
      )
      .bind(brand_id)
      .first();

    if (!account?.access_token) {
      return {
        success: false,
        error_code: "missing_token",
        error_message: "LinkedIn not connected"
      };
    }

    /* ------------------------------------------
       2. Fetch content body
    ------------------------------------------ */

    const content = await db
      .prepare(
        `
        SELECT text_content
        FROM content_social
        WHERE id = ?
        `
      )
      .bind(content_id)
      .first();

    if (!content?.text_content) {
      return {
        success: false,
        error_code: "missing_content",
        error_message: "Content not found"
      };
    }

    /* ------------------------------------------
       3. Get LinkedIn Author URN
       (Member or Organization — adjust if needed)
    ------------------------------------------ */

    const profileRes = await fetch(
      "https://api.linkedin.com/v2/me",
      {
        headers: {
          Authorization: `Bearer ${account.access_token}`
        }
      }
    );

    if (!profileRes.ok) {
      const err = await profileRes.text();
      return {
        success: false,
        error_code: "profile_fetch_failed",
        error_message: err
      };
    }

    const profile = await profileRes.json();
    const authorUrn = `urn:li:person:${profile.id}`;

    /* ------------------------------------------
       4. Publish to LinkedIn
    ------------------------------------------ */

    const publishRes = await fetch(
      "https://api.linkedin.com/v2/ugcPosts",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "X-Restli-Protocol-Version": "2.0.0",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          author: authorUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: {
                text: content.text_content
              },
              shareMediaCategory: "NONE"
            }
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
          }
        })
      }
    );

    if (!publishRes.ok) {
      const err = await publishRes.text();
      return {
        success: false,
        error_code: "publish_failed",
        error_message: err
      };
    }

    const publishData = await publishRes.json();

    if (!publishData?.id) {
      return {
        success: false,
        error_code: "missing_urn",
        error_message: "LinkedIn did not return post URN"
      };
    }

    /* ------------------------------------------
       5. Store external_post_id
    ------------------------------------------ */

    await db
      .prepare(
        `
        UPDATE delivery_jobs
        SET external_post_id = ?
        WHERE content_id = ?
          AND brand_id = ?
          AND platform = 'linkedin'
          AND status = 'scheduled'
        `
      )
      .bind(
        publishData.id,
        content_id,
        brand_id
      )
      .run();

    return { success: true };

  } catch (err) {
    return {
      success: false,
      error_code: "unexpected_error",
      error_message: err.message
    };
  }
}