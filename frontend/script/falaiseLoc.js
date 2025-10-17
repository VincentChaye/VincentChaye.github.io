// falaiseLoc.js (version corrigée)

import { setTargetCrag } from "./route.js";
import { API_BASE_URL } from "../config.js";

export const SEARCH_CONFIG = {
  lang: "fr",
  googleApiKey: "",
  googleCx: ""
};

// ---- Utils DOM ----
const getInfoEl = (t) => {
  if (!t) return null;
  if (typeof t !== "string") return t || null;
  // Essaye d’abord querySelector (supporte #id, .class, etc.)
  let el = document.querySelector(t);
  if (el) return el;
  // Si on a passé "crag-info" sans '#', tente getElementById
  if (!t.startsWith("#") && !t.startsWith("."))
    el = document.getElementById(t);
  return el || null;
};

const safeSetInnerHTML = (el, html) => {
  if (!el) return false;
  el.innerHTML = html;
  return true;
};

const loadedSpotIds = new Set();

export const climberIcon = L.divIcon({
  className: "climber-icon",
  html: "🧗",
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// ---- Recherches externes (best effort, jamais bloquant) ----
async function searchWikipedia(name, lang = "fr") {
  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      name
    )}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    if (!j || !j.content_urls || !j.content_urls.desktop) return null;
    return { title: j.title || name, excerpt: j.extract || "", url: j.content_urls.desktop.page };
  } catch {
    return null;
  }
}

async function searchGoogleCSE(name) {
  try {
    const { googleApiKey, googleCx } = SEARCH_CONFIG;
    if (!googleApiKey || !googleCx) return null;
    const u = new URL("https://www.googleapis.com/customsearch/v1");
    u.searchParams.set("key", googleApiKey);
    u.searchParams.set("cx", googleCx);
    u.searchParams.set("q", `${name} falaise escalade`);
    u.searchParams.set("num", "1");
    u.searchParams.set("hl", SEARCH_CONFIG.lang || "fr");
    const r = await fetch(u);
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    const it = j?.items?.[0];
    if (!it) return null;
    return { title: it.title || name, excerpt: it.snippet || "", url: it.link };
  } catch {
    return null;
  }
}

async function buildCragInfoHTML({ name, lat, lon, source }) {
  const latNum = Number(lat);
  const lonNum = Number(lon);
  const header = `<h3 style="margin:0 0 6px 0;">${name || "Falaise"}</h3>
  <ul style="margin:0 0 8px 0;padding-left:18px;">
    <li>Lat: ${Number.isFinite(latNum) ? latNum.toFixed(5) : "-"}</li>
    <li>Lon: ${Number.isFinite(lonNum) ? lonNum.toFixed(5) : "-"}</li>
  </ul>`;

  let res = await searchGoogleCSE(name || "falaise escalade");
  if (!res) {
    res =
      (await searchWikipedia(name || "Falaise", SEARCH_CONFIG.lang || "fr")) ||
      (await searchWikipedia(name || "Falaise", "en"));
  }

  const body = res
    ? `<p style="margin:0 0 6px 0;">${res.excerpt || ""}</p>
       <p style="margin:0;">${
         res.url ? `<a href="${res.url}" target="_blank" rel="noopener">${res.title}</a>` : res.title
       }</p>`
    : `<p style="margin:0;">no info</p>`;

  const src = source ? `<p style="margin:6px 0 0 0;"><strong>Source:</strong> ${source}</p>` : "";

  return header + body + src;
}

// ---- Affichage des marqueurs ----
export function addCragMarker(layerOrMap, infoTarget, { name, lat, lon, source, props = {} }) {
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) return null;

  const infoEl = getInfoEl(infoTarget);
  const m = L.marker([latNum, lonNum], { icon: climberIcon }).bindPopup(name || "Falaise");

  if (layerOrMap && typeof layerOrMap.addLayer === "function") {
    layerOrMap.addLayer(m);
  } else if (layerOrMap && typeof layerOrMap.addTo !== "function") {
    // Si on nous passe directement la map
    m.addTo(layerOrMap);
  } else {
    m.addTo(layerOrMap);
  }

  m.on("click", async () => {
    setTargetCrag({ name, lat: latNum, lon: lonNum });

    // Pare-feu si aucune cible info
    if (!infoEl) {
      console.warn("infoTarget introuvable :", infoTarget);
      return;
    }

    safeSetInnerHTML(
      infoEl,
      `<h3 style="margin:0 0 6px 0;">${name || "Falaise"}</h3>
       <ul style="margin:0 0 8px 0;padding-left:18px;">
         <li>Lat: ${latNum.toFixed(5)}</li>
         <li>Lon: ${lonNum.toFixed(5)}</li>
       </ul>
       <p style="margin:0;">Recherche…</p>`
    );

    try {
      const html = await buildCragInfoHTML({ name, lat: latNum, lon: lonNum, source });
      safeSetInnerHTML(infoEl, html);
    } catch {
      safeSetInnerHTML(
        infoEl,
        `<h3 style="margin:0 0 6px 0;">${name || "Falaise"}</h3>
         <ul style="margin:0 0 8px 0;padding-left:18px;">
           <li>Lat: ${latNum.toFixed(5)}</li>
           <li>Lon: ${lonNum.toFixed(5)}</li>
         </ul>
         <p style="margin:0;">no info</p>`
      );
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

    // Identifiant unique pour éviter doublons
    const id = p.id || p._id || `${lon},${lat}`;
    if (loadedSpotIds.has(id)) return;

    loadedSpotIds.add(id);
    addCragMarker(layerOrMap, infoTarget, {
      name: p.name || "Falaise",
      lat,
      lon,
      source,
      props: p
    });
  });
}

export async function loadCragsFromGeoJSON(layerOrMap, infoTarget, urlOrObject) {
  try {
    const fc =
      typeof urlOrObject === "string"
        ? await fetch(urlOrObject).then((r) => {
            if (!r.ok) throw new Error(`GeoJSON HTTP ${r.status}`);
            return r.json();
          })
        : urlOrObject;
    addCragsFromGeoJSON(layerOrMap, infoTarget, fc);
  } catch (e) {
    console.warn("loadCragsFromGeoJSON failed:", e);
  }
}

/* =========================
   === API BACKEND (NEW) ===
   ========================= */

// Appel API: récupère une FeatureCollection depuis le backend (option bbox)
async function fetchSpotsFeatureCollection({ minLng, minLat, maxLng, maxLat, limit = 1000 } = {}) {
  const u = new URL(`${API_BASE_URL}/api/spots`);
  const bboxOK = [minLng, minLat, maxLng, maxLat].every(
    (v) => typeof v === "number" && Number.isFinite(v)
  );
  if (bboxOK) {
    u.searchParams.set("minLng", String(minLng));
    u.searchParams.set("minLat", String(minLat));
    u.searchParams.set("maxLng", String(maxLng));
    u.searchParams.set("maxLat", String(maxLat));
  }
  u.searchParams.set("limit", String(Math.max(1, Math.min(5000, limit))));

  const r = await fetch(u.toString());
  if (!r.ok) throw new Error(`API /spots HTTP ${r.status}`);
  return r.json(); // FeatureCollection
}

// Charge depuis l’API en fonction de la bbox de la map
export async function loadCragsFromAPI(map, layerOrMap, infoTarget) {
  try {
    const b = map.getBounds();
    const fc = await fetchSpotsFeatureCollection({
      minLng: b.getWest(),
      minLat: b.getSouth(),
      maxLng: b.getEast(),
      maxLat: b.getNorth()
    });
    addCragsFromGeoJSON(layerOrMap, infoTarget, fc);
  } catch (e) {
    console.warn("loadCragsFromAPI failed:", e);
  }
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
  if (!r.ok) throw new Error(`create spot failed (HTTP ${r.status})`);
  return r.json(); // { id: ... }
}
