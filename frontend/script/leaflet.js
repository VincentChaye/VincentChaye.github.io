import { updateCurrentPosition } from "./route.js";

const map = L.map('map').setView([43.6165182, 7.0721285], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const NICE = [43.7034, 7.2663];
const MARSEILLE = [43.2965, 5.3698];

// Groupe de clusters pour les zones de grimpe
const cragCluster = L.markerClusterGroup({
  chunkedLoading: true,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  disableClusteringAtZoom: 15, // au-delà, on voit les points individuels
  maxClusterRadius: 60,
  iconCreateFunction: (cluster) => {
    const count = cluster.getChildCount();
    return L.divIcon({
      html: `<div class="cluster-badge">🧗×${count}</div>`,
      className: "climb-cluster",
      iconSize: [44, 44]
    });
  }
});
map.addLayer(cragCluster);


let currentLL = [0.0, 0.0];
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
export function getCragLayer() { return cragCluster; }
