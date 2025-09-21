let map = null;
let routeLayer = null;
let currentPos = null;
let targetCrag = null;
let profile = "driving"; // "driving" | "cycling" | "foot"

export function initRoute(m) { map = m; }
export function setRoutingProfile(p) { profile = p || "driving"; }
export function updateCurrentPosition(lat, lon) { currentPos = [Number(lat), Number(lon)]; }
export function setTargetCrag({ name, lat, lon }) { targetCrag = { name: name || "Falaise", lat: Number(lat), lon: Number(lon) }; }
export function clearRoute() { if (map && routeLayer) { map.removeLayer(routeLayer); routeLayer = null; } }

async function osrmRoute(from, to) {
  const url = `https://router.project-osrm.org/route/v1/${profile}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&alternatives=false`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 15000);
  const r = await fetch(url, { signal: ac.signal }).catch(() => null);
  clearTimeout(t);
  if (!r || !r.ok) throw new Error("Service d’itinéraire indisponible.");
  const j = await r.json();
  const route = j?.routes?.[0];
  if (!route) throw new Error("Pas d’itinéraire trouvé.");
  return route;
}

export async function drawRouteToTarget() {
  if (!map) throw new Error("initRoute non appelé.");
  if (!currentPos) throw new Error("Position actuelle inconnue.");
  if (!targetCrag) throw new Error("Aucune falaise sélectionnée.");
  const route = await osrmRoute(currentPos, [targetCrag.lat, targetCrag.lon]);
  clearRoute();
  routeLayer = L.geoJSON(route.geometry, { style: { color: "#7b3fe4", weight: 5 } }).addTo(map);
  map.fitBounds(routeLayer.getBounds(), { padding: [20, 20] });
  return { km: route.distance / 1000, minutes: route.duration / 60, target: targetCrag };
}
