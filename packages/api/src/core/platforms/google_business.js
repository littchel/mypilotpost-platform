/**
 * Google Business Profile Platform Adapter
 * Standardized Contract V1
 * Posts a LOCAL_POST to the authenticated location.
 * Requires account_id = "accounts/{accountId}/locations/{locationId}"
 */

const GBP_BASE = "https://mybusiness.googleapis.com/v4";

export async function publish({ content, connection, _env }) {
  const { text } = content;
  const { access_token, account_id } = connection;

  // account_id expected format: "accounts/123/locations/456"
  if (!account_id?.includes("/locations/")) {
    throw new Error("GBP_MISSING_LOCATION: account_id must be accounts/{id}/locations/{id}");
  }

  const body = {
    languageCode: "en-US",
    summary: text,
    topicType: "STANDARD",
  };

  const res = await fetch(`${GBP_BASE}/${account_id}/localPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`GBP_POST_FAILED: ${await res.text()}`);
  }

  const data = await res.json();
  return { success: true, external_id: data.name };
}
