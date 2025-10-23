import { initCommonUI } from "./ui.js";
import { fetchSpots } from "./api.js";

initCommonUI();

const map = L.map("map", { zoomControl: true });
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap",
}).addTo(map);

map.setView([46.5, 2.5], 6);

const cluster = L.markerClusterGroup({
  chunkedLoading: true,
  chunkDelay: 50,
  chunkInterval: 200,
});
cluster.addTo(map);

/* ---------- Bottom Sheet ---------- */
const sheet = document.getElementById("bottomSheet");
const sheetContent = document.getElementById("sheetContent");
const sheetClose = document.getElementById("sheetClose");

// S'assure que la fiche n'est pas dans le conteneur Leaflet
if (sheet && sheet.parentElement !== document.body) {
  document.body.appendChild(sheet);
}

// Désactive/active les interactions de la carte quand la fiche est ouverte (confort mobile)
function disableMapInteractions() {
  map.scrollWheelZoom.disable();
  map.dragging.disable();
  map.touchZoom.disable();
  map.doubleClickZoom.disable();
}
function enableMapInteractions() {
  map.scrollWheelZoom.enable();
  map.dragging.enable();
  map.touchZoom.enable();
  map.doubleClickZoom.enable();
}

function openSheet(html) {
  if (!sheet || !sheetContent) return;
  sheetContent.innerHTML = html;
  sheet.setAttribute("aria-hidden", "false");
  document.body.classList.add("sheet-open");
  disableMapInteractions();
}

function closeSheet() {
  sheet?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("sheet-open");
  enableMapInteractions();
}

sheetClose?.addEventListener("click", closeSheet);
// Fermer avec la touche Échap
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sheet?.getAttribute("aria-hidden") === "false") closeSheet();
});

/* ---------- Carte : fiche spot enrichie ---------- */
function spotCardHTML(s) {
  const dir = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
  const url = s.url ? `<a class="btn btn--ghost" href="${s.url}" target="_blank" rel="noopener">📄 Fiche détaillée</a>` : "";
  
  // Type avec icône
  const typeIcons = { 'crag': '🧗', 'boulder': '🪨', 'indoor': '🏢' };
  const typeIcon = typeIcons[s.type] || '📍';
  const typeLabel = s.type || 'inconnu';
  const type = `<div class="spot-info-item"><strong>Type :</strong> ${typeIcon} ${typeLabel}</div>`;
  
  // Sous-type si disponible
  const soustype = s.soustype ? `<div class="spot-info-item"><strong>Sous-type :</strong> ${s.soustype}</div>` : "";
  
  // Orientation
  const orient = s.orientation ? `<div class="spot-info-item"><strong>Orientation :</strong> ${s.orientation}</div>` : "";
  
  // Niveau de difficulté
  const niveau = (s.niveau_min || s.niveau_max) 
    ? `<div class="spot-info-item"><strong>Niveau :</strong> ${s.niveau_min || '?'} à ${s.niveau_max || '?'}</div>` 
    : "";
  
  // Nombre de voies
  const voies = (s.id_voix && Array.isArray(s.id_voix) && s.id_voix.length > 0) 
    ? `<div class="spot-info-item"><strong>Voies :</strong> ${s.id_voix.length}</div>` 
    : "";
  
  // Description
  const desc = s.description ? `<p class="spot-description">${s.description}</p>` : "";
  
  // Infos complémentaires
  const info = s.info_complementaires 
    ? `<p class="spot-info-extra"><em>${s.info_complementaires}</em></p>` 
    : "";
  
  return `
    <div class="spot-card">
      <h3 class="spot-title">${s.name}</h3>
      <div class="spot-info-grid">
        ${type}
        ${soustype}
        ${niveau}
        ${voies}
        ${orient}
      </div>
      ${desc}
      ${info}
      <div class="spot-actions">
        ${url}
        <a class="btn" href="${dir}" target="_blank" rel="noopener">🚗 Itinéraire</a>
        <button class="btn btn--ghost" onclick="window.shareSpot && shareSpot('${s.id}')" title="Partager ce spot">📤</button>
      </div>
    </div>
  `;
}

/* ---------- Localisation utilisateur ("Me localiser") ---------- */
const locateBtn = document.getElementById("locateBtn");
let userMarker = null;
let userAccuracy = null;
let userCentered = false;

function warnIfInsecureContext() {
  // La géoloc ne marche que sur HTTPS ou http://localhost
  const isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (location.protocol !== "https:" && !isLocalhost) {
    alert("La géolocalisation nécessite HTTPS (ou http://localhost en développement).");
    return true;
  }
  return false;
}

function requestLocation() {
  if (warnIfInsecureContext()) return;
  map.locate({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  });
}

map.on("locationfound", (e) => {
  const latlng = e.latlng;
  const zoomClose = 15; 

  if (!userMarker) {
    userMarker = L.circleMarker(latlng, {
      radius: 8,
      weight: 2,
      fillOpacity: 0.8,
    })
      .addTo(map)
      .bindTooltip("Vous êtes ici", { permanent: false });
  } else {
    userMarker.setLatLng(latlng);
  }

  if (!userAccuracy) {
    userAccuracy = L.circle(latlng, {
      radius: e.accuracy,
      weight: 1,
      opacity: 0.6,
      fillOpacity: 0.1,
    }).addTo(map);
  } else {
    userAccuracy.setLatLng(latlng).setRadius(e.accuracy);
  }

  map.setView(latlng, zoomClose, { animate: true });
  userCentered = true; //signale qu'on a centré sur l'user
});

map.on("locationerror", (err) => {
  console.error("[map] locationerror:", err);
  alert("Impossible de récupérer votre position.\n" + (err.message || ""));
});

locateBtn?.addEventListener("click", requestLocation);

/* ---------- Icônes des spots selon le type ---------- */
function makeCliffIcon(spot, size = 38) {
  const s = size;
  // Icônes différentes selon le type
  const icons = {
    'crag': '🧗',
    'boulder': '🪨',
    'indoor': '🏢',
    'default': '📍'
  };
  
  const icon = icons[spot.type] || icons.default;
  
  // Couleur selon le niveau (optionnel, pour différenciation visuelle)
  let shadowColor = '#3388ff';
  if (spot.niveau_max) {
    const maxGrade = parseGradeToNumber(spot.niveau_max);
    if (maxGrade >= 7.5) shadowColor = '#ff3333'; // Rouge pour difficile
    else if (maxGrade >= 6.5) shadowColor = '#ff9900'; // Orange
    else if (maxGrade >= 5) shadowColor = '#ffcc00'; // Jaune
    else shadowColor = '#00cc66'; // Vert pour facile
  }
  
  return L.divIcon({
    className: "climber-icon",
    html: `<span style="display:block; line-height:1; font-size:${s}px; filter: drop-shadow(0 2px 4px ${shadowColor});">${icon}</span>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
  });
}

// Fonction utilitaire pour parser les cotations
function parseGradeToNumber(grade) {
  if (!grade) return 0;
  const match = String(grade).match(/(\d+)([a-c]?\+?)/i);
  if (!match) return 0;
  const base = parseInt(match[1], 10);
  const letter = match[2] ? match[2].toLowerCase() : '';
  let offset = 0;
  if (letter.includes('a')) offset = 0;
  else if (letter.includes('b')) offset = 0.33;
  else if (letter.includes('c')) offset = 0.66;
  if (letter.includes('+')) offset += 0.16;
  return base + offset;
}


requestLocation();


/* ---------- Variables globales pour filtrage et recherche ---------- */
let allSpots = [];
let allMarkers = [];
let currentFilters = {
  type: '',
  niveauMin: '',
  searchQuery: ''
};

/* ---------- Fonction de partage ---------- */
window.shareSpot = function(spotId) {
  const spot = allSpots.find(s => s.id === spotId);
  if (!spot) return;
  
  const url = `${window.location.origin}${window.location.pathname}?spot=${spotId}`;
  
  if (navigator.share) {
    navigator.share({
      title: spot.name,
      text: `Découvre ce spot de grimpe : ${spot.name}`,
      url: url
    }).catch(err => console.log('Partage annulé', err));
  } else {
    navigator.clipboard.writeText(url).then(() => {
      alert('Lien copié dans le presse-papier !');
    }).catch(() => {
      alert(`Lien du spot : ${url}`);
    });
  }
};

/* ---------- Filtrage des spots ---------- */
function filterSpots() {
  let filtered = [...allSpots];
  
  // Filtre par type
  if (currentFilters.type) {
    filtered = filtered.filter(s => s.type === currentFilters.type);
  }
  
  // Filtre par niveau minimum
  if (currentFilters.niveauMin) {
    const minGrade = parseInt(currentFilters.niveauMin, 10);
    filtered = filtered.filter(s => {
      if (!s.niveau_min) return false;
      const spotMin = parseGradeToNumber(s.niveau_min);
      return spotMin >= minGrade;
    });
  }
  
  // Filtre par recherche textuelle
  if (currentFilters.searchQuery) {
    const query = currentFilters.searchQuery.toLowerCase();
    filtered = filtered.filter(s => 
      s.name.toLowerCase().includes(query)
    );
  }
  
  updateMapMarkers(filtered);
  
  // Affiche/cache le bouton reset
  const hasActiveFilters = currentFilters.type || currentFilters.niveauMin || currentFilters.searchQuery;
  document.getElementById('resetFilters').style.display = hasActiveFilters ? 'block' : 'none';
}

/* ---------- Mise à jour des markers sur la carte ---------- */
function updateMapMarkers(spotsToShow) {
  cluster.clearLayers();
  
  spotsToShow.forEach((s) => {
    const marker = allMarkers.find(m => m.spotId === s.id);
    if (marker) {
      cluster.addLayer(marker);
    }
  });
  
  console.log(`[map] Affichage de ${spotsToShow.length} / ${allSpots.length} spots`);
}

/* ---------- Recherche ---------- */
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
let searchTimeout;

searchInput?.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim();
  
  if (query.length < 2) {
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
    currentFilters.searchQuery = '';
    filterSpots();
    return;
  }
  
  searchTimeout = setTimeout(() => {
    currentFilters.searchQuery = query;
    const results = allSpots.filter(s => 
      s.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
    
    displaySearchResults(results);
    filterSpots();
  }, 300);
});

function displaySearchResults(results) {
  if (!results.length) {
    searchResults.innerHTML = '<div class="search-no-result">Aucun spot trouvé</div>';
    searchResults.style.display = 'block';
    return;
  }
  
  searchResults.innerHTML = results.map(s => {
    const typeIcons = { 'crag': '🧗', 'boulder': '🪨', 'indoor': '🏢' };
    const icon = typeIcons[s.type] || '📍';
    return `
      <div class="search-result" data-spot-id="${s.id}">
        <span class="search-result-icon">${icon}</span>
        <span class="search-result-name">${s.name}</span>
        <span class="search-result-type">${s.type || ''}</span>
      </div>
    `;
  }).join('');
  searchResults.style.display = 'block';
  
  // Ajout des listeners sur les résultats
  searchResults.querySelectorAll('.search-result').forEach(el => {
    el.addEventListener('click', () => {
      const spotId = el.dataset.spotId;
      focusSpot(spotId);
      searchResults.style.display = 'none';
      searchInput.value = '';
      currentFilters.searchQuery = '';
    });
  });
}

function focusSpot(spotId) {
  const spot = allSpots.find(s => s.id === spotId);
  if (!spot) return;
  
  map.setView([spot.lat, spot.lng], 14, { animate: true });
  openSheet(spotCardHTML(spot));
}

// Fermer les résultats de recherche si on clique ailleurs
document.addEventListener('click', (e) => {
  if (!searchInput?.contains(e.target) && !searchResults?.contains(e.target)) {
    searchResults.style.display = 'none';
  }
});

/* ---------- Gestion des filtres ---------- */
const filterType = document.getElementById('filterType');
const filterNiveauMin = document.getElementById('filterNiveauMin');
const toggleFilters = document.getElementById('toggleFilters');
const advancedFilters = document.getElementById('advancedFilters');
const resetFilters = document.getElementById('resetFilters');

filterType?.addEventListener('change', (e) => {
  currentFilters.type = e.target.value;
  filterSpots();
});

filterNiveauMin?.addEventListener('change', (e) => {
  currentFilters.niveauMin = e.target.value;
  filterSpots();
});

toggleFilters?.addEventListener('click', () => {
  const isVisible = advancedFilters.style.display === 'block';
  advancedFilters.style.display = isVisible ? 'none' : 'block';
});

resetFilters?.addEventListener('click', () => {
  currentFilters = { type: '', niveauMin: '', searchQuery: '' };
  filterType.value = '';
  filterNiveauMin.value = '';
  searchInput.value = '';
  searchResults.style.display = 'none';
  filterSpots();
});

/* ---------- Chargement et affichage des spots ---------- */
(async () => {
  try {
    allSpots = await fetchSpots({
      useCache: false,
      pageSize: 10000,
      extraParams: { format: "flat" },
    });
    console.log(`[map] Spots normalisés reçus: ${allSpots.length}`, allSpots[0]);

    if (!allSpots.length) {
      console.warn("[map] 0 spot après normalisation. Regarde le log ci-dessus (spots[0]).");
      return;
    }

    // Création de tous les markers
    allSpots.forEach((s) => {
      const m = L.marker([s.lat, s.lng], {
        icon: makeCliffIcon(s, 38), // Passe le spot complet pour l'icône
        title: s.name,
      });
      m.spotId = s.id;
      m.on("click", () => openSheet(spotCardHTML(s)));
      allMarkers.push(m);
      cluster.addLayer(m);
    });

    // Zoom initial sur tous les spots
    if (allSpots.length) {
      const bounds = L.latLngBounds(allSpots.map((s) => [s.lat, s.lng]));
      if (!userCentered) {
        map.fitBounds(bounds.pad(0.2));
      }
    } else {
      L.marker([46.5, 2.5]).addTo(map).bindPopup("Debug: carte OK, zéro spot normalisé.");
    }

    // Gestion du spot dans l'URL (partage)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('spot')) {
      const spotId = urlParams.get('spot');
      setTimeout(() => focusSpot(spotId), 1000);
    }
  } catch (e) {
    console.error("[map] fetchSpots failed:", e);
    alert(`Impossible de charger les spots.\n${e.message || e}`);
  }
})();
