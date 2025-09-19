// --- config recherche ---
export const SEARCH_CONFIG = {
  lang: "fr",          // "fr" puis "en" en secours
  googleApiKey: "",    // <- mets ta clé Google ici (facultatif)
  googleCx: ""         // <- mets ton CX Custom Search ici (facultatif)
};

const getInfoEl = (t) => (typeof t === 'string' ? document.querySelector(t) : t);

export const climberIcon = L.divIcon({
  className: "climber-icon",
  html: "🧗",
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

async function searchWikipedia(name, lang="fr") {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json();
  if (!j || !j.content_urls || !j.content_urls.desktop) return null;
  return {
    title: j.title || name,
    excerpt: j.extract || "",
    url: j.content_urls.desktop.page
  };
}

async function searchGoogleCSE(name) {
  const { googleApiKey, googleCx } = SEARCH_CONFIG;
  if (!googleApiKey || !googleCx) return null;
  const q = `${name} site d'escalade falaise`;
  const u = new URL("https://www.googleapis.com/customsearch/v1");
  u.searchParams.set("key", googleApiKey);
  u.searchParams.set("cx", googleCx);
  u.searchParams.set("q", q);
  const r = await fetch(u);
  if (!r.ok) return null;
  const j = await r.json();
  const it = (j.items && j.items[0]) || null;
  if (!it) return null;
  return {
    title: it.title || name,
    excerpt: it.snippet || "",
    url: it.link
  };
}

async function buildCragInfoHTML({ name, lat, lon, source }) {
  let res = await searchWikipedia(name, SEARCH_CONFIG.lang);
  if (!res) res = await searchWikipedia(name, "en");
  if (!res) res = await searchGoogleCSE(name);

  const header = `<h3 style="margin:0 0 6px 0;">${name || "Falaise"}</h3>
  <ul style="margin:0 0 8px 0;padding-left:18px;">
    <li>Lat: ${lat}</li>
    <li>Lon: ${lon}</li>
  </ul>`;

  if (source) {
    return `${header}
      <p style="margin:0 0 6px 0;"><strong>Source:</strong> ${source}</p>`;
  }

  if (res) {
    const link = res.url ? `<a href="${res.url}" target="_blank" rel="noopener">${res.title}</a>` : res.title;
    return `${header}
      <p style="margin:0 0 6px 0;">${res.excerpt || ""}</p>
      <p style="margin:0;">${link || ""}</p>`;
  }

  return `${header}<p style="margin:0;">no info</p>`;
}

export function addCragMarker(map, infoTarget, { name, lat, lon, source, props = {} }) {
  const infoEl = getInfoEl(infoTarget);
  const m = L.marker([lat, lon], { icon: climberIcon }).addTo(map).bindPopup(name || "Falaise");
  m.on("click", async () => {
    infoEl.textContent = "Recherche…";
    try {
      infoEl.innerHTML = await buildCragInfoHTML({ name, lat, lon, source });
    } catch {
      infoEl.innerHTML = `<h3 style="margin:0 0 6px 0;">${name || "Falaise"}</h3><p style="margin:0;">no info</p>`;
    }
  });
  return m;
}

export function addCragsFromGeoJSON(map, infoTarget, fc) {
  const feats = (fc && fc.features) || [];
  feats.forEach(f => {
    if (!f || f.type !== "Feature" || !f.geometry || f.geometry.type !== "Point") return;
    const [lon, lat] = f.geometry.coordinates || [];
    if (lat == null || lon == null) return;
    const p = f.properties || {};
    const source = p.source || p.website || p.wikidata || p.wikipedia || null;
    addCragMarker(map, infoTarget, { name: p.name || "Falaise", lat, lon, source, props: p });
  });
}

export async function loadCragsFromGeoJSON(map, infoTarget, urlOrObject) {
  const fc = typeof urlOrObject === "string"
    ? await fetch(urlOrObject).then(r => r.json())
    : urlOrObject;
  addCragsFromGeoJSON(map, infoTarget, fc);
}
