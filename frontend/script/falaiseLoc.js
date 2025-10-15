import { setTargetCrag } from "./route.js";
import { API_BASE_URL } from "../config.js"; // <<< ajoute ce fichier à la racine de /frontend

export const SEARCH_CONFIG = {
  lang: "fr",
  googleApiKey: "",
  googleCx: ""
};

const getInfoEl = (t) => (typeof t === "string" ? document.querySelector(t) : t);

export const climberIcon = L.divIcon({
  className: "climber-icon",
  html: "🧗",
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

async function searchWikipedia(name, lang = "fr") {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
  const r = await fetch(url).catch(() => null);
  if (!r || !r.ok) return null;
  const j = await r.json().catch(() => null);
  if (!j || !j.content_urls || !j.content_urls.desktop) return null;
  return { title: j.title || name, excerpt: j.extract || "", url: j.content_urls.desktop.page };
}

async function searchGoogleCSE(name) {
  const { googleApiKey, googleCx } = SEARCH_CONFIG;
  if (!googleApiKey || !googleCx) return null;
  const u = new URL("https://www.googleapis.com/customsearch/v1");
  u.searchParams.set("key", googleApiKey);
  u.searchParams.set("cx", googleCx);
  u.searchParams.set("q", `${name} falaise escalade`);
  u.searchParams.set("num", "1");
  u.searchParams.set("hl", SEARCH_CONFIG.lang || "fr");
  const r = await fetch(u).catch(() => null);
  if (!r || !r.ok) return null;
  const j = await r.json().catch(() => null);
  const it = j?.items?.[0];
  if (!it) return null;
  return { title: it.title || name, excerpt: it.snippet || "", url: it.link };
}

async function buildCragInfoHTML({ name, lat, lon, source }) {
  const header = `<h3 style="margin:0 0 6px 0;">${name || "Falaise"}</h3>
  <ul style="margin:0 0 8px 0;padding-left:18px;">
    <li>Lat: ${(+lat).toFixed(5)}</li>
    <li>Lon: ${(+lon).toFixed(5)}</li>
  </ul>`;

  let res = await searchGoogleCSE(name || "falaise escalade");
  if (!res) {
    res =
      (await searchWikipedia(name || "Falaise", SEARCH_CONFIG.lang || "fr")) ||
      (await searchWikipedia(name || "Falaise", "en"));
  }

  const body = res
    ? `<p style="margin:0 0 6px 0;">${res.excerpt || ""}</p><p style="margin:0;">${
        res.url ? `<a href="${res.url}" target="_blank" rel="noopener">${res.title}</a>` : res.title
      }</p>`
    : `<p style="margin:0;">no info</p>`;

  const src = source ? `<p style="margin:6px 0 0 0;"><strong>Source:</strong> ${source}</p>` : "";

  return header + body + src;
}

// Accepte soit une map, soit un layer de cluster (layerOrMap)
export function addCragMarker(layerOrMap, infoTarget, { name, lat, lon, source, props = {} }) {
  lat = Number(lat);
  lon = Number(lon);
  const infoEl = getInfoEl(infoTarget);
  const m = L.marker([lat, lon], { icon: climberIcon }).bindPopup(name || "Falaise");

  if (layerOrMap && typeof layerOrMap.addLayer === "function") {
    layerOrMap.addLayer(m);
  } else {
    m.addTo(layerOrMap);
  }

  m.on("click", async () => {
    setTargetCrag({ name, lat, lon });
    infoEl.innerHTML = `
      <h3 style="margin:0 0 6px 0;">${name || "Falaise"}</h3>
      <ul style="margin:0 0 8px 0;padding-left:18px;">
        <li>Lat: ${lat.toFixed(5)}</li>
        <li>Lon: ${lon.toFixed(5)}</li>
      </ul>
      <p style="margin:0;">Recherche…</p>`;
    try {
      infoEl.innerHTML = await buildCragInfoHTML({ name, lat, lon, source });
    } catch {
      infoEl.innerHTML = `
        <h3 style="margin:0 0 6px 0;">${name || "Falaise"}</h3>
        <ul style="margin:0 0 8px 0;padding-left:18px;">
          <li>Lat: ${lat.toFixed(5)}</li>
          <li>Lon: ${lon.toFixed(5)}</li>
        </ul>
        <p style="margin:0;">no info</p>`;
    }
  });

  return m;
}

export function addCragsFromGeoJSON(layerOrMap, infoTarget, fc) {
  const feats = (fc && fc.features) || [];
  feats.forEach((f) => {
    if (!f || f.type !== "Feature" || !f.geometry || f.geometry.type !== "Point") return;
    const [lon, lat] = f.geometry.coordinates || [];
    if (lat == null || lon == null) return;
    const p = f.properties || {};
    const source = p.source || p.website || p.wikidata || p.wikipedia || null;
    addCragMarker(layerOrMap, infoTarget, { name: p.name || "Falaise", lat, lon, source, props: p });
  });
}

export async function loadCragsFromGeoJSON(layerOrMap, infoTarget, urlOrObject) {
  const fc =
    typeof urlOrObject === "string" ? await fetch(urlOrObject).then((r) => r.json()) : urlOrObject;
  addCragsFromGeoJSON(layerOrMap, infoTarget, fc);
}

/* =========================
   === API BACKEND (NEW) ===
   ========================= */

// Appel API: récupère une FeatureCollection depuis le backend (option bbox)
async function fetchSpotsFeatureCollection({ minLng, minLat, maxLng, maxLat, limit = 1000 } = {}) {
  const u = new URL(`${API_BASE_URL}/api/spots`);
  if (
    [minLng, minLat, maxLng, maxLat].every((v) => typeof v === "number" && !Number.isNaN(v))
  ) {
    u.searchParams.set("minLng", String(minLng));
    u.searchParams.set("minLat", String(minLat));
    u.searchParams.set("maxLng", String(maxLng));
    u.searchParams.set("maxLat", String(maxLat));
  }
  u.searchParams.set("limit", String(limit));
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error("API spots failed");
  return r.json(); // FeatureCollection
}

// Charge depuis l’API en fonction de la bbox de la map
export async function loadCragsFromAPI(map, layerOrMap, infoTarget) {
  const b = map.getBounds();
  const fc = await fetchSpotsFeatureCollection({
    minLng: b.getWest(),
    minLat: b.getSouth(),
    maxLng: b.getEast(),
    maxLat: b.getNorth()
  });
  addCragsFromGeoJSON(layerOrMap, infoTarget, fc);
}

// Création d’une falaise via l’API
export async function createSpotOnAPI({ name, grade, info, lng, lat }) {
  const body = {
    name,
    grade,
    info,
    geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] }
  };
  const r = await fetch(`${API_BASE_URL}/api/spots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error("create spot failed");
  return r.json(); // { id: ... }
}
