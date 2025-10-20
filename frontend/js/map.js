import { initCommonUI } from "./ui.js";
import { fetchSpots } from "./api.js";

initCommonUI();

const map = L.map("map", { zoomControl: true });
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap",
}).addTo(map);

map.setView([46.5, 2.5], 6);

const cluster = L.markerClusterGroup({
  chunkedLoading: true,
  chunkDelay: 50,
  chunkInterval: 200,
});
cluster.addTo(map);

/* ---------- Bottom Sheet ---------- */
const sheet = document.getElementById("bottomSheet");
const sheetContent = document.getElementById("sheetContent");
const sheetClose = document.getElementById("sheetClose");

// S'assure que la fiche n'est pas dans le conteneur Leaflet
if (sheet && sheet.parentElement !== document.body) {
  document.body.appendChild(sheet);
}

// Désactive/active les interactions de la carte quand la fiche est ouverte (confort mobile)
function disableMapInteractions() {
  map.scrollWheelZoom.disable();
  map.dragging.disable();
  map.touchZoom.disable();
  map.doubleClickZoom.disable();
}
function enableMapInteractions() {
  map.scrollWheelZoom.enable();
  map.dragging.enable();
  map.touchZoom.enable();
  map.doubleClickZoom.enable();
}

function openSheet(html) {
  if (!sheet || !sheetContent) return;
  sheetContent.innerHTML = html;
  sheet.setAttribute("aria-hidden", "false");
  document.body.classList.add("sheet-open");
  disableMapInteractions();
}

function closeSheet() {
  sheet?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("sheet-open");
  enableMapInteractions();
}

sheetClose?.addEventListener("click", closeSheet);
// Fermer avec la touche Échap
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sheet?.getAttribute("aria-hidden") === "false") closeSheet();
});

/* ---------- Carte : fiche spot ---------- */
function spotCardHTML(s) {
  const dir = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
  const url = s.url ? `<a href="${s.url}" target="_blank" rel="noopener">Fiche</a>` : "";
  const orient = s.orientation ? `<div><strong>Orientation :</strong> ${s.orientation}</div>` : "";
  const type = s.type ? `<div><strong>Type :</strong> ${s.type}</div>` : "";
  const desc = s.description ? `<p>${s.description}</p>` : "";
  return `
    <h3>${s.name}</h3>
    ${type}
    ${orient}
    ${desc}
    <div class="actions" style="margin-top:.5rem; display:flex; gap:.5rem;">
      ${url}
      <a class="btn" href="${dir}" target="_blank" rel="noopener">Itinéraire</a>
    </div>
  `;
}

/* ---------- Localisation utilisateur ("Me localiser") ---------- */
const locateBtn = document.getElementById("locateBtn");
let userMarker = null;
let userAccuracy = null;
let userCentered = false;

function warnIfInsecureContext() {
  // La géoloc ne marche que sur HTTPS ou http://localhost
  const isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (location.protocol !== "https:" && !isLocalhost) {
    alert("La géolocalisation nécessite HTTPS (ou http://localhost en développement).");
    return true;
  }
  return false;
}

function requestLocation() {
  if (warnIfInsecureContext()) return;
  map.locate({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  });
}

map.on("locationfound", (e) => {
  const latlng = e.latlng;
  const zoomClose = 15; 

  if (!userMarker) {
    userMarker = L.circleMarker(latlng, {
      radius: 8,
      weight: 2,
      fillOpacity: 0.8,
    })
      .addTo(map)
      .bindTooltip("Vous êtes ici", { permanent: false });
  } else {
    userMarker.setLatLng(latlng);
  }

  if (!userAccuracy) {
    userAccuracy = L.circle(latlng, {
      radius: e.accuracy,
      weight: 1,
      opacity: 0.6,
      fillOpacity: 0.1,
    }).addTo(map);
  } else {
    userAccuracy.setLatLng(latlng).setRadius(e.accuracy);
  }

  map.setView(latlng, zoomClose, { animate: true });
  userCentered = true; //signale qu'on a centré sur l'user
});

map.on("locationerror", (err) => {
  console.error("[map] locationerror:", err);
  alert("Impossible de récupérer votre position.\n" + (err.message || ""));
});

locateBtn?.addEventListener("click", requestLocation);

/* ---------- Icônes des falaises (taille fixe) ---------- */
function makeCliffIcon(size = 38) {
  const s = size;
  return L.divIcon({
    className: "climber-icon",
    html: `<span style="display:block; line-height:1; font-size:${s}px;">🧗</span>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
  });
}


requestLocation();


/* ---------- Chargement et affichage des spots ---------- */
(async () => {
  try {
    const spots = await fetchSpots({
      useCache: false,
      pageSize: 10000,
      extraParams: { format: "flat" },
    });
    console.log(`[map] Spots normalisés reçus: ${spots.length}`, spots[0]);

    if (!spots.length) {
      console.warn("[map] 0 spot après normalisation. Regarde le log ci-dessus (spots[0]).");
    }

    spots.forEach((s) => {
      const m = L.marker([s.lat, s.lng], {
        icon: makeCliffIcon(38), // ↔️ ajuste ici la taille visuelle (px)
        title: s.name,
      });
      m.on("click", () => openSheet(spotCardHTML(s)));
      cluster.addLayer(m);
    });

    if (spots.length) {
  const bounds = L.latLngBounds(spots.map((s) => [s.lat, s.lng]));
  if (!userCentered) {
    map.fitBounds(bounds.pad(0.2));
  }
} else {
  L.marker([46.5, 2.5]).addTo(map).bindPopup("Debug: carte OK, zéro spot normalisé.");
}

    // pas de resize au zoom — on laisse les icônes en taille fixe
  } catch (e) {
    console.error("[map] fetchSpots failed:", e);
    alert(`Impossible de charger les spots.\n${e.message || e}`);
  }
})();
