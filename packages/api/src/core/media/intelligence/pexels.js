export async function searchPexels({ query, limit = 12 }, env) {
  if (!env.PEXELS_API_KEY) return [];

  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${limit}&orientation=landscape`,
    { headers: { Authorization: env.PEXELS_API_KEY } }
  );

  if (!res.ok) throw new Error(`Pexels API error ${res.status}`);

  const data = await res.json();
  return data.photos || [];
}
