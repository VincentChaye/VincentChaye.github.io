import { updateCurrentPosition } from "./route.js";

const map = L.map('map').setView([43.6165182, 7.0721285], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const NICE = [43.7034, 7.2663];
const MARSEILLE = [43.2965, 5.3698];

let currentLL = [43.6165182, 7.0721285];
let PosExact = L.marker(currentLL).addTo(map).bindPopup('Ma position');
L.marker(NICE).addTo(map).bindPopup('Nice');
L.marker(MARSEILLE).addTo(map).bindPopup('Marseille');

export function updateMap(latitude, longitude) {
  currentLL = [latitude, longitude];
  PosExact.setLatLng(currentLL);
  updateCurrentPosition(latitude, longitude);
}

export function centerOnMe() {
  map.setView(currentLL, map.getZoom());
}

export function getMap() { return map; }
