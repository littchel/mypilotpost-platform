/**
 * Geolocation & Regional Mapping Utility
 * Maps ISO 3166-1 alpha-2 country codes to pricing regions.
 */

const AFRICA_COUNTRIES = [
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CD", "CG", 
  "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", 
  "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", 
  "ST", "SN", "SC", "SL", "SO", "SS", "SD", "TZ", "TG", "TN", "UG", "ZM"
];

/**
 * Maps a country code to a pricing region.
 * @param {string} countryCode ISO 3166-1 alpha-2 country code
 * @returns {string} One of: 'south_africa', 'zimbabwe', 'africa', 'global'
 */
export function getRegion(countryCode) {
  if (!countryCode) return "global";
  
  const code = countryCode.toUpperCase();
  
  if (code === "ZA") return "south_africa";
  if (code === "ZW") return "zimbabwe";
  
  if (AFRICA_COUNTRIES.includes(code)) {
    return "africa";
  }
  
  return "global";
}
