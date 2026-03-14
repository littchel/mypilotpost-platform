/**
 * myPilotPost — Instagram Platform Adapter
 * Canon 5 — Delivery Execution Truth
 *
 * Uses Facebook Graph API for Instagram Business accounts.
 */

import { getDB } from "../../lib/db.js";

export async function deliver({ content_id, brand_id }) {
  const env = globalThis.__ENV__;
  const db = getDB(env);

  try {
    // 1️⃣ Fetch token
    const account = await db
      .prepare(
        `
        SELECT access_token, external_account_id
        FROM connected_accounts
        WHERE brand_id = ?
          AND platform = 'instagram'
        LIMIT 1
        `
      )
      .bind(brand_id)
      .first();

    if (!account?.access_token || !account?.external_account_id) {
      return {
        success: false,
        error_code: "missing_token",
        error_message: "Instagram not connected"
      };
    }

    // 2️⃣ Fetch content
    const content = await db
      .prepare(
        `
        SELECT text_content, media_url
        FROM content_social
        WHERE id = ?
        `
      )
      .bind(content_id)
      .first();

    if (!content?.media_url) {
      return {
        success: false,
        error_code: "missing_media",
        error_message: "Instagram requires media_url"
      };
    }

    // 3️⃣ Create media container
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${account.external_account_id}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: content.media_url,
          caption: content.text_content,
          access_token: account.access_token
        })
      }
    );

    if (!containerRes.ok) {
      const err = await containerRes.text();
      return {
        success: false,
        error_code: "container_failed",
        error_message: err
      };
    }

    const container = await containerRes.json();

    // 4️⃣ Publish media
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${account.external_account_id}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: container.id,
          access_token: account.access_token
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
        error_code: "missing_post_id",
        error_message: "Instagram did not return post ID"
      };
    }

    // 5️⃣ Store external_post_id
    await db
      .prepare(
        `
        UPDATE delivery_jobs
        SET external_post_id = ?
        WHERE content_id = ?
          AND brand_id = ?
          AND platform = 'instagram'
          AND status = 'scheduled'
        `
      )
      .bind(publishData.id, content_id, brand_id)
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