import { updateMap, getMap } from "./leaflet.js";
import { loadCragsFromGeoJSON, SEARCH_CONFIG } from "./falaiseLoc.js";
import { initRoute, drawRouteToTarget } from "./route.js";

const watchPosition = (options) => {
  navigator.geolocation.watchPosition(onSuccess, onError, options);
};

const onSuccess = (position) => {
  const { latitude, longitude, accuracy } = position.coords;
  updateMap(latitude, longitude);
  document.querySelector('.geoloc').innerHTML = `
    <li>Latitude : ${latitude.toFixed(6)}</li>
    <li>Longitude : ${longitude.toFixed(6)}</li>
    <li>Précision : ${Math.round(accuracy ?? 0)} m</li>
  `;
};

const onError = (error) => {
  document.querySelector('.geoloc').innerHTML = `<li>Erreur : ${error.message}</li>`;
};

watchPosition({
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 5000
});

const map = getMap();
initRoute(map);

document.getElementById("route-btn").addEventListener("click", async () => {
  try {
    const { km, minutes, target } = await drawRouteToTarget();
    document.getElementById("crag-info")
      .insertAdjacentHTML("beforeend",
        `<p>Itinéraire vers <strong>${target.name}</strong> : ${km.toFixed(2)} km (~${Math.round(minutes)} min)</p>`);
  } catch (e) {
    alert(e.message);
  }
});

// ⚠️ Si tu utilises l’API JSON Google, garde ces deux lignes et restreins ta clé par référents HTTP.
SEARCH_CONFIG.googleApiKey = "AIzaSyCRirnB_e4ZLncSXsBCgKGD64LRr5ymVTE";
SEARCH_CONFIG.googleCx = "536abfba31bb74c67";

// Charge tes falaises locales (chemin à adapter si besoin)
loadCragsFromGeoJSON(map, "#crag-info", "./data/falaise.geojson");
