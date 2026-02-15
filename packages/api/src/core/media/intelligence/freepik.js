import { error } from "../../../lib/json.js";

export async function searchFreepik({ query, limit = 12 }, env) {
  const res = await fetch(
    `https://api.freepik.com/v1/resources?query=${encodeURIComponent(query)}&limit=${limit}`,
    {
      headers: {
        "Accept-Language": "en-US",
        "X-Freepik-API-Key": env.FREEPIK_API_KEY
      }
    }
  );

  if (!res.ok) {
    throw error("FREEPIK_SEARCH_FAILED", 502);
  }

  const data = await res.json();
  return data.data || [];
}
