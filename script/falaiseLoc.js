// script/falaiseLoc.js

const getInfoEl = (t) => (typeof t === 'string' ? document.querySelector(t) : t);

export const climberIcon = L.divIcon({
  className: "climber-icon",
  html: "🏔️",
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});


export function addCragMarker(map, infoTarget, { name, lat, lon, source, props = {} }) {
  const infoEl = getInfoEl(infoTarget);
  const m = L.marker([lat, lon], { icon: climberIcon }).addTo(map).bindPopup(name || "Falaise");
  m.on("click", () => {
    if (source) {
      infoEl.innerHTML = `
        <h3 style="margin:0 0 6px 0;">${name || "Falaise"}</h3>
        <ul style="margin:0;padding-left:18px;">
          <li>Lat: ${lat}</li>
          <li>Lon: ${lon}</li>
          <li>Source: ${source}</li>
        </ul>`;
    } else {
      infoEl.textContent = "no info";
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
    addCragMarker(map, infoTarget, { name: p.name, lat, lon, source, props: p });
  });
}

export async function loadCragsFromGeoJSON(map, infoTarget, urlOrObject) {
  const fc = typeof urlOrObject === "string"
    ? await fetch(urlOrObject).then(r => r.json())
    : urlOrObject;
  addCragsFromGeoJSON(map, infoTarget, fc);
}
