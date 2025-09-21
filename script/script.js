import { updateMap, getMap, centerOnMe, getCragLayer } from "./leaflet.js";
import { loadCragsFromGeoJSON, SEARCH_CONFIG } from "./falaiseLoc.js";
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

SEARCH_CONFIG.googleApiKey = "AIzaSyCRirnB_e4ZLncSXsBCgKGD64LRr5ymVTE";
SEARCH_CONFIG.googleCx = "536abfba31bb74c67";

// ⬇️ Charge les crags dans le layer de clustering plutôt que directement sur la map
const cragLayer = getCragLayer();
loadCragsFromGeoJSON(cragLayer, "#crag-info", "./data/falaise.geojson");
