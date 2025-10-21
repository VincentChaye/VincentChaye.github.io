// config.js
const PROD_API = "https://zonedegrimpe-api-f8fehxc0hhcmdfh5.francecentral-01.azurewebsites.net";

function isLocalHost(host) {
  return /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i.test(host);
}

export const API_BASE_URL =
  (typeof import !== "undefined" && import.meta?.env?.VITE_API_BASE_URL)
  || (typeof window !== "undefined" && isLocalHost(window.location.hostname)
      ? "http://localhost:3000"
      : PROD_API);

// <<< nouveau : préfixe de chemin >>>
export const API_PATH_PREFIX = "/api";
export const CACHE_TTL_MS = 1000 * 60 * 10; // si pas déjà défini
export const CACHE_KEYS = { SPOTS: "spots_cache_v1" }; // si pas déjà défini
