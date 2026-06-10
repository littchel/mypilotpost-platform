/**
 * myPilotPost — Pexels Provider (enhanced)
 * Extends the existing intelligence/pexels.js search.
 * Fetches 40 results, passes orientation, returns normalized images.
 */

import { searchPexels as _searchPexels } from '../intelligence/pexels.js';

// Curated fallback pool — used when API key missing or API fails.
// Generic enough to work across industries. Never shown as "AI Picks".
// Fallback widths set to 1600 to clear the 1600px quality floor in ranking.js.
// Using ?w=1600 on Pexels CDN URLs gives the correct size.
const FALLBACK = [
  { id: 'f1', url: 'https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg?auto=compress&cs=tinysrgb&w=1600', preview: 'https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg?auto=compress&cs=tinysrgb&w=640', author: 'fauxels', width: 1600, height: 1067, alt: 'people team meeting professional' },
  { id: 'f2', url: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1600', preview: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=640', author: 'Canva Studio', width: 1600, height: 1067, alt: 'technology laptop modern workspace' },
  { id: 'f3', url: 'https://images.pexels.com/photos/3760809/pexels-photo-3760809.jpeg?auto=compress&cs=tinysrgb&w=1600', preview: 'https://images.pexels.com/photos/3760809/pexels-photo-3760809.jpeg?auto=compress&cs=tinysrgb&w=640', author: 'Andrea Piacquadio', width: 1600, height: 1067, alt: 'people collaboration creative team' },
  { id: 'f4', url: 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1600', preview: 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=640', author: 'fauxels_b', width: 1600, height: 1067, alt: 'professional business meeting success' },
  { id: 'f5', url: 'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=1600', preview: 'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=640', author: 'Negative Space', width: 1600, height: 1067, alt: 'minimal clean modern abstract laptop' },
  { id: 'f6', url: 'https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=1600', preview: 'https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=640', author: 'Christina Morillo', width: 1600, height: 1067, alt: 'person smiling lifestyle authentic woman' },
].map(f => ({ ...f, ratio: f.width / f.height, provider: 'pexels' }));

function normalize(photo) {
  const url = photo.src?.large2x || photo.src?.original || '';
  const preview = photo.src?.medium || photo.src?.small || url;
  const w = photo.width || 0;
  const h = photo.height || 1;
  return {
    id: String(photo.id),
    external_id: String(photo.id),
    url,
    preview,
    thumbnail_url: preview,
    author: photo.photographer || 'Unknown',
    author_url: photo.photographer_url || '',
    width: w,
    height: h,
    ratio: w / h,
    alt: photo.alt || '',
    avg_color: photo.avg_color || '',
    attribution: photo.photographer ? `Photo by ${photo.photographer} on Pexels` : 'Photo from Pexels',
    provider: 'pexels',
  };
}

export async function fetchPexels({ query, orientation = 'landscape', limit = 40 }, env) {
  if (!env?.PEXELS_API_KEY) return FALLBACK;
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${limit}&orientation=${orientation}`,
      { headers: { Authorization: env.PEXELS_API_KEY } }
    );
    if (!res.ok) return FALLBACK;
    const data = await res.json();
    const photos = data.photos || [];
    return photos.length ? photos.map(normalize) : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
