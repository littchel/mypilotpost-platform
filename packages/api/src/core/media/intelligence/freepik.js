export async function searchFreepik({ query, limit = 12 }, env) {
  if (!env.FREEPIK_API_KEY) return [];

  const res = await fetch(
    `https://api.freepik.com/v1/resources?query=${encodeURIComponent(query)}&limit=${limit}`,
    {
      headers: {
        "Accept-Language": "en-US",
        "X-Freepik-API-Key": env.FREEPIK_API_KEY
      }
    }
  );

  if (!res.ok) throw new Error(`Freepik API error ${res.status}`);

  const data = await res.json();
  return data.data || [];
}
