import { updateMap, getMap, centerOnMe, getCragLayer } from "./leaflet.js";
import { loadCragsFromAPI, SEARCH_CONFIG } from "./falaiseLoc.js";
import { initRoute, drawRouteToTarget, clearRoute } from "./route.js";

const watchPosition = (options) => {
  navigator.geolocation.watchPosition(onSuccess, onError, options);
};

const onSuccess = (position) => {
  const { latitude, longitude, accuracy } = position.coords;
  updateMap(latitude, longitude);
  document.querySelector(".geoloc").innerHTML = `
    <li>Latitude : ${latitude.toFixed(6)}</li>
    <li>Longitude : ${longitude.toFixed(6)}</li>
    <li>Précision : ${Math.round(accuracy ?? 0)} m</li>
  `;
};

const onError = (error) => {
  document.querySelector(".geoloc").innerHTML = `<li>Erreur : ${error.message}</li>`;
};

watchPosition({ enableHighAccuracy: true, maximumAge: 0, timeout: 5000 });

const map = getMap();
initRoute(map);

// --------- Itinéraire ----------
document.getElementById("route-btn")?.addEventListener("click", async () => {
  try {
    const { km, minutes, target } = await drawRouteToTarget();
    document
      .getElementById("crag-info")
      .insertAdjacentHTML(
        "beforeend",
        `<p>Itinéraire vers <strong>${target.name}</strong> : ${km.toFixed(2)} km (~${Math.round(minutes)} min)</p>`
      );
  } catch (e) {
    alert(e.message);
  }
});

document.getElementById("clear-route-btn")?.addEventListener("click", () => {
  clearRoute();
});

document.getElementById("center-btn")?.addEventListener("click", () => {
  centerOnMe();
});

document.getElementById("ajout-falaise-btn").addEventListener("click", () => {
  window.location.href = "html/ajoutFalaise.html";
});

// --------- Recherche externe (Google/Wiki) ----------
SEARCH_CONFIG.googleApiKey = "AIzaSyCRirnB_e4ZLncSXsBCgKGD64LRr5ymVTE"; //  Pense à restreindre la clé côté Google Cloud ( a faire plus tard )
SEARCH_CONFIG.googleCx = "536abfba31bb74c67";

// --------- Chargement des falaises depuis l'API ----------
const cragLayer = getCragLayer();

async function refreshCrags() {
  try {
    await loadCragsFromAPI(map, cragLayer, "#info");
  } catch (e) {
    console.error("Erreur refresh:", e);
  }
}

// Throttle simple pour éviter les multiples appels pendant les déplacements
let refreshTimer = null;
function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshCrags().catch(console.error);
  }, 250); 
}

// 1er chargement quand la carte est prête
map.whenReady(() => {
  scheduleRefresh();
});

// Recharger quand la vue change
map.on("moveend zoomend", scheduleRefresh);
