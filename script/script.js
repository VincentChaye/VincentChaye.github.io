import { updateMap, getMap } from "./leaflet.js";
import { loadCragsFromGeoJSON, SEARCH_CONFIG } from "./falaiseLoc.js";

const watchPosition = (options) => {
    navigator.geolocation.watchPosition(onSuccess, onError, options);
};

const onSuccess = (position) => {
    const { latitude, longitude, accuracy } = position.coords;
    const dKm = updateMap(latitude, longitude);
    document.querySelector('.geoloc').innerHTML = `
        <li>Latitude : ${latitude}</li>
        <li>Longitude : ${longitude}</li>
        <li>Précision : ${accuracy ?? 'N/A'} m</li>
        <li>Distance à Marseille : ${dKm.toFixed(2)} km</li>
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

SEARCH_CONFIG.googleApiKey = "AIzaSyCRirnB_e4ZLncSXsBCgKGD64LRr5ymVTE"; 
SEARCH_CONFIG.googleCx = "536abfba31bb74c67";  

loadCragsFromGeoJSON(map, "#crag-info", "./data/falaise.geojson");
