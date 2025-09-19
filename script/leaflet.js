export function getMap(){ return map; }


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

L.polyline([MARSEILLE, NICE], { color: 'green' }).addTo(map).bindPopup('Segment Marseille–Nice');

let lineToMarseille = L.polyline([PosExact.getLatLng(), MARSEILLE], { color: 'red' }).addTo(map);

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000, toRad = x => x * Math.PI / 180;
    const φ1 = toRad(lat1), φ2 = toRad(lat2), dφ = toRad(lat2 - lat1), dλ = toRad(lon2 - lon1);
    const a = Math.sin(dφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

export function updateMap(latitude, longitude) {
    PosExact.setLatLng([latitude, longitude]).bindPopup('Ma position');
    lineToMarseille.setLatLngs([[latitude, longitude], MARSEILLE]);
    const dKm = haversine(latitude, longitude, MARSEILLE[0], MARSEILLE[1]) / 1000;
    lineToMarseille.bindPopup(`Distance à Marseille : ${dKm.toFixed(2)} km`);
    map.setView([latitude, longitude], 13);
    return dKm;
}
