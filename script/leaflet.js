import { updateCurrentPosition } from "./route.js";

const map = L.map('map').setView([43.6165182, 7.0721285], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const NICE = [43.7034, 7.2663];
const MARSEILLE = [43.2965, 5.3698];

let PosExact = L.marker([43.6165182, 7.0721285]).addTo(map).bindPopup('Ma position');
L.marker(NICE).addTo(map).bindPopup('Nice');
L.marker(MARSEILLE).addTo(map).bindPopup('Marseille');

export function updateMap(latitude, longitude) {
  PosExact.setLatLng([latitude, longitude]);
  map.setView([latitude, longitude], 13);
  updateCurrentPosition(latitude, longitude);
}

export function getMap() { return map; }
