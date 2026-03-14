/**
 * myPilotPost — Facebook Platform Adapter
 * Canon 5 — Delivery Execution Truth
 *
 * Responsibilities:
 * - Publish content to Facebook
 * - Store external_post_id
 * - Return structured success/failure
 *
 * Does NOT:
 * - Change delivery_jobs.status
 * - Perform analytics
 * - Perform ingestion
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
          AND platform = 'facebook'
        LIMIT 1
        `
      )
      .bind(brand_id)
      .first();

    if (!account?.access_token || !account?.external_account_id) {
      return {
        success: false,
        error_code: "missing_token",
        error_message: "Facebook not connected"
      };
    }

    // 2️⃣ Fetch content
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

    // 3️⃣ Publish
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${account.external_account_id}/feed`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: content.text_content,
          access_token: account.access_token
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return {
        success: false,
        error_code: "publish_failed",
        error_message: err
      };
    }

    const data = await response.json();

    if (!data?.id) {
      return {
        success: false,
        error_code: "missing_post_id",
        error_message: "Facebook did not return post ID"
      };
    }

    // 4️⃣ Store external_post_id
    await db
      .prepare(
        `
        UPDATE delivery_jobs
        SET external_post_id = ?
        WHERE content_id = ?
          AND brand_id = ?
          AND platform = 'facebook'
          AND status = 'scheduled'
        `
      )
      .bind(data.id, content_id, brand_id)
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