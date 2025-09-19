import { updateMap } from "./leaflet.js";

const watchPosition = (options) => {
    navigator.geolocation.watchPosition(onSuccess, onError, options);
};

const onSuccess = (position) => {
    const { latitude, longitude, accuracy } = position.coords;
    document.querySelector('.geoloc').innerHTML = `
        <li>Latitude: ${latitude}</li>
        <li>Longitude: ${longitude}</li>
        <li>Précision: ${accuracy} m</li>
    `;
    updateMap(latitude, longitude);
};

const onError = (error) => {
    document.querySelector('.geoloc').innerHTML =
        `<li>Erreur: ${error.message}</li>`;
};

watchPosition({
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 5000
});
