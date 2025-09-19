const map = L.map('map').setView([43.6165182, 7.0721285], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);



let marker = L.marker([43.6165182, 7.0721285]).addTo(map).bindPopup('Ma position');
let markerNice = L.marker([43.7034, 7.2663]).addTo(map).bindPopup('Nice');
var triangleBermude = L.polygon([
    [25.7617, -80.1918],  // Miami
    [18.4655, -66.1057],  // San Juan 
    [32.2948, -64.7814]   // Hamilton 
], {
    color: 'blue',
    fillColor: 'lightblue',
    fillOpacity: 0.4
}).addTo(map);
export function updateMap(latitude, longitude) {
    map.setView([latitude, longitude], 13);
    marker.setLatLng([latitude, longitude]);
}
