/**
 * LinkedIn Performance Adapter
 * Canon 5.5 — Raw Platform Truth Only
 *
 * Responsibilities:
 * - Fetch metrics for a single LinkedIn post (URN required)
 * - Return raw LinkedIn API response
 * - Perform no normalization
 * - Perform no transformation
 * - Perform no interpretation
 */

export async function fetchLinkedInMetrics({ accessToken, externalPostId }) {
  if (!accessToken) {
    throw new Error("LinkedIn ingestion failed: Missing accessToken");
  }

  if (!externalPostId) {
    throw new Error("LinkedIn ingestion failed: Missing externalPostId");
  }

  if (!externalPostId.startsWith("urn:")) {
    throw new Error(
      `LinkedIn ingestion failed: externalPostId must be full URN. Received: ${externalPostId}`
    );
  }

  const encodedUrn = encodeURIComponent(externalPostId);

  const url = `https://api.linkedin.com/v2/socialActions/${encodedUrn}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0"
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LinkedIn API error (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  if (!data || typeof data !== "object") {
    throw new Error("LinkedIn ingestion failed: Invalid JSON response");
  }

  // Canon 5.5 rule:
  // Return platform-native metrics exactly as received.
  // No normalization. No flattening. No computed fields.
  return data;
}
