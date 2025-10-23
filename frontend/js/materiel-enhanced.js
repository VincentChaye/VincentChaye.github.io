import { initCommonUI } from "./ui.js";

// --- Auth guard: redirige vers login si pas de token ---
(function ensureAuth() {
  try {
    const raw = localStorage.getItem("auth");
    if (!raw) throw new Error("no-auth");
    const obj = JSON.parse(raw);
    if (!obj?.token || !obj?.user?._id) throw new Error("bad-auth");
  } catch {
    const next = encodeURIComponent(location.pathname + location.search);
    location.href = `./login.html?next=${next}`;
  }
})();

// === Config API
const API_BASE = (window.APP_CONFIG?.API_URL || "http://localhost:3000") + "/api";
const ENDPOINT = {
  USER_MAT: API_BASE + "/user_materiel",
  SPECS: API_BASE + "/materiel_specs",
  ANALYTICS: API_BASE + "/analytics",
  ADVICE: API_BASE + "/advice",
};

// --- Auth helpers
function getAuth() {
  try {
    const s = localStorage.getItem("auth");
    if (!s) return { userId: null, token: null };
    const obj = JSON.parse(s);
    const userId = obj?.user?._id || obj?._id || obj?.userId || null;
    const token = obj?.token || obj?.jwt || obj?.accessToken || null;
    return { userId, token };
  } catch {
    return { userId: null, token: null };
  }
}

async function fetchJSON(url, opts = {}) {
  const { token } = getAuth();
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  
  console.log("Requête:", { url, method: opts.method, body: opts.body }); // Debug
  
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Erreur API:", { status: res.status, text }); // Debug
    throw new Error(`HTTP ${res.status} – ${text || res.statusText}`);
  }
  return res.status === 204 ? null : res.json();
}

// ===== UI refs
initCommonUI();

// Onglets
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

// Inventaire
const listEl = document.getElementById("gearList");
const addBtn = document.getElementById("addGearBtn");
const modal = document.getElementById("gearModal");
const form = document.getElementById("gearForm");
const title = document.getElementById("gearFormTitle");
const search = document.getElementById("gearSearch");
const tagFilter = document.getElementById("gearTagFilter");

// Maintenance
const inspectionDays = document.getElementById("inspectionDays");
const checkInspectionsBtn = document.getElementById("checkInspectionsBtn");
const inspectionsList = document.getElementById("inspectionsList");
const retireThreshold = document.getElementById("retireThreshold");
const checkRetireBtn = document.getElementById("checkRetireBtn");
const retireList = document.getElementById("retireList");

// Conseils
const adviceLat = document.getElementById("adviceLat");
const adviceLng = document.getElementById("adviceLng");
const getLocationBtn = document.getElementById("getLocationBtn");
const getMaterialAdviceBtn = document.getElementById("getMaterialAdviceBtn");
const materialAdvice = document.getElementById("materialAdvice");
const spotsLat = document.getElementById("spotsLat");
const spotsLng = document.getElementById("spotsLng");
const spotsLevel = document.getElementById("spotsLevel");
const spotsExposition = document.getElementById("spotsExposition");
const getSpotsAdviceBtn = document.getElementById("getSpotsAdviceBtn");
const spotsAdvice = document.getElementById("spotsAdvice");

// Statistiques
const inventoryStats = document.getElementById("inventoryStats");
const valueStats = document.getElementById("valueStats");
const conditionStats = document.getElementById("conditionStats");

let rows = [];
let editingId = null;

// ===== Gestion des onglets
tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const targetTab = btn.dataset.tab;
    
    // Mise à jour des boutons
    tabBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    // Mise à jour du contenu
    tabContents.forEach(content => {
      content.classList.remove("active");
      if (content.id === `tab-${targetTab}`) {
        content.classList.add("active");
      }
    });
    
    // Chargement des données selon l'onglet
    if (targetTab === "maintenance") {
      // Pas de chargement automatique, l'utilisateur clique sur les boutons
    } else if (targetTab === "stats") {
      loadStats();
    }
  });
});

// ===== Data <-> Form helpers
function mapStateToEnum(raw) {
  const v = String(raw || "").trim().toLowerCase();
  const dict = {
    "neuf": "new",
    "nouveau": "new",
    "bon": "good",
    "bien": "good",
    "use": "worn",
    "usé": "worn",
    "usee": "worn",
    "usée": "worn",
    "bientot retrait": "retire-soon",
    "bientôt retrait": "retire-soon",
    "retire": "retired",
    "retiré": "retired",
  };
  if (["new", "good", "worn", "retire-soon", "retired"].includes(v)) return v;
  return dict[v] || "good";
}

function getStateLabel(state) {
  const labels = {
    "new": "Neuf",
    "good": "Bon",
    "worn": "Usé",
    "retire-soon": "À retirer",
    "retired": "Retiré"
  };
  return labels[state] || state;
}

function formToPayload(fd) {
  const tags = (fd.get("tags") || "")
    .split(",").map(s => s.trim()).filter(Boolean);

  const category = fd.get("category") || "Autre";

  const payload = {
    category,
    specs: {
      name: fd.get("name") || null,
      brand: fd.get("brand") || null,
      model: fd.get("model") || null,
      tags,
    },
    lifecycle: {
      condition: mapStateToEnum(fd.get("state")),
      notes: fd.get("notes") || null,
      usageCount: fd.get("usageCount") ? parseInt(fd.get("usageCount")) : null,
    },
  };

  // Dates d'achat
  if (fd.get("purchaseDate")) {
    payload.purchase = { 
      date: new Date(fd.get("purchaseDate")).toISOString(),
      price: fd.get("price") ? parseFloat(fd.get("price")) : null
    };
  }

  // Dates d'inspection
  if (fd.get("lastInspection")) {
    payload.lifecycle.lastInspectionAt = new Date(fd.get("lastInspection")).toISOString();
  }
  if (fd.get("nextInspection")) {
    payload.lifecycle.nextInspectionAt = new Date(fd.get("nextInspection")).toISOString();
  }

  return payload;
}

function rowToCard(it) {
  const name = it?.specs?.name || `${it?.specs?.brand ?? ""} ${it?.specs?.model ?? ""}`.trim() || it?.category || "Équipement";
  const brand = it?.specs?.brand ?? "";
  const model = it?.specs?.model ?? "";
  const cond = it?.lifecycle?.condition ?? "good";
  const achat = it?.purchase?.date ? new Date(it.purchase.date).toLocaleDateString() : null;
  const price = it?.purchase?.price || it?.specs?.price;
  const notes = it?.lifecycle?.notes ?? "";
  const usageCount = it?.lifecycle?.usageCount ?? 0;
  const tagStr = (it?.specs?.tags || []).map(t => `<span class="chip">${escapeHTML(t)}</span>`).join(" ");

  // Dates d'inspection
  const lastInspection = it?.lifecycle?.lastInspectionAt ? new Date(it.lifecycle.lastInspectionAt).toLocaleDateString() : null;
  const nextInspection = it?.lifecycle?.nextInspectionAt ? new Date(it.lifecycle.nextInspectionAt).toLocaleDateString() : null;

  return `
    <article class="card gear-card">
      <div class="gear-status ${cond}">${getStateLabel(cond)}</div>
      <h3>${escapeHTML(name)}</h3>
      <p><strong>${escapeHTML(brand)} ${escapeHTML(model)}</strong></p>
      <p>Catégorie : <strong>${escapeHTML(it.category || "")}</strong></p>
      ${usageCount > 0 ? `<p>Utilisations : <strong>${usageCount}</strong></p>` : ""}
      ${achat ? `<p>Achat : ${achat}${price ? ` (${price}€)` : ""}</p>` : ""}
      ${lastInspection ? `<p>Dernière inspection : ${lastInspection}</p>` : ""}
      ${nextInspection ? `<p>Prochaine inspection : ${nextInspection}</p>` : ""}
      ${notes ? `<p class="gear-meta">${escapeHTML(notes)}</p>` : ""}
      <div>${tagStr}</div>
      <div style="display:flex; gap:.5rem; margin-top:.5rem">
        <button class="btn btn--ghost" data-edit="${it._id}">Éditer</button>
        <button class="btn btn--danger" data-del="${it._id}">Supprimer</button>
      </div>
    </article>
  `;
}

function fillFormFromRow(it) {
  form.reset();
  form.elements.id.value = it._id;
  form.elements.name.value = it?.specs?.name ?? "";
  form.elements.brand.value = it?.specs?.brand ?? "";
  form.elements.model.value = it?.specs?.model ?? "";
  form.elements.category.value = it?.category ?? "";
  form.elements.state.value = it?.lifecycle?.condition ?? "good";
  form.elements.purchaseDate.value = it?.purchase?.date ? new Date(it.purchase.date).toISOString().slice(0, 10) : "";
  form.elements.price.value = it?.purchase?.price || it?.specs?.price || "";
  form.elements.lastInspection.value = it?.lifecycle?.lastInspectionAt ? new Date(it.lifecycle.lastInspectionAt).toISOString().slice(0, 10) : "";
  form.elements.nextInspection.value = it?.lifecycle?.nextInspectionAt ? new Date(it.lifecycle.nextInspectionAt).toISOString().slice(0, 10) : "";
  form.elements.usageCount.value = it?.lifecycle?.usageCount ?? "";
  form.elements.tags.value = (it?.specs?.tags || []).join(", ");
  form.elements.notes.value = it?.lifecycle?.notes ?? "";
}

function escapeHTML(s = "") {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ===== API calls
async function apiList() {
  const qs = new URLSearchParams();
  if (tagFilter.value) qs.set("category", tagFilter.value);
  const res = await fetchJSON(`${ENDPOINT.USER_MAT}?${qs.toString()}`);
  return res.items || [];
}

async function apiCreate(payload) {
  const res = await fetchJSON(ENDPOINT.USER_MAT, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res?.id;
}

async function apiPatch(id, partial) {
  await fetchJSON(`${ENDPOINT.USER_MAT}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(partial),
  });
}

async function apiDelete(id) {
  await fetchJSON(`${ENDPOINT.USER_MAT}/${id}`, { method: "DELETE" });
}

// ===== Maintenance API calls
async function getInspectionsDue(withinDays) {
  const res = await fetchJSON(`${ENDPOINT.ANALYTICS}/gear/inspections/due?withinDays=${withinDays}`);
  return res;
}

async function getRetireSoon(thresholdPct) {
  const res = await fetchJSON(`${ENDPOINT.ANALYTICS}/gear/retire-soon?thresholdPct=${thresholdPct}`);
  return res;
}

// ===== Conseils API calls
async function getMaterialAdvice(lat, lng, maxKm = 30) {
  const { userId } = getAuth();
  let url = `${ENDPOINT.ADVICE}/material?userId=${userId}`;
  if (lat && lng) {
    url += `&lat=${lat}&lng=${lng}&maxKm=${maxKm}`;
  }
  const res = await fetchJSON(url);
  return res;
}

async function getSpotsAdvice(lat, lng, level, exposition, maxKm = 40) {
  const { userId } = getAuth();
  let url = `${ENDPOINT.ADVICE}/spots?userId=${userId}&lat=${lat}&lng=${lng}&maxKm=${maxKm}`;
  if (level) url += `&niveau_min=${level}`;
  if (exposition) url += `&exposition=${exposition}`;
  const res = await fetchJSON(url);
  return res;
}

// ===== UI actions - Inventaire
async function refresh() {
  const q = (search.value || "").toLowerCase();
  rows = await apiList();

  const filtered = rows.filter(it => {
    const blob = JSON.stringify(it).toLowerCase();
    return !q || blob.includes(q);
  });

  listEl.innerHTML = filtered.length
    ? filtered.map(rowToCard).join("")
    : `<p>Aucun matériel pour le moment.</p>`;

  // Event listeners pour les boutons
  listEl.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => {
    const it = rows.find(x => String(x._id) === b.dataset.edit);
    editingId = it?._id || null;
    title.textContent = "Modifier l'équipement";
    fillFormFromRow(it);
    modal.showModal();
  }));

  listEl.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("Supprimer cet équipement ?")) return;
    await apiDelete(b.dataset.del);
    await refresh();
  }));
}

// ===== UI actions - Maintenance
async function checkInspections() {
  try {
    const days = parseInt(inspectionDays.value);
    const data = await getInspectionsDue(days);
    
    if (!data.items || data.items.length === 0) {
      inspectionsList.innerHTML = `<p class="text-center">✅ Aucune inspection à prévoir dans les ${days} prochains jours</p>`;
      return;
    }

    const html = data.items.map(item => `
      <div class="result-item warning">
        <h4>${escapeHTML(item.specs?.name || item.category || "Équipement")}</h4>
        <p><strong>Prochaine inspection :</strong> ${new Date(item.lifecycle.nextInspectionAt).toLocaleDateString()}</p>
        <p><strong>Utilisations :</strong> ${item.lifecycle.usageCount || 0}</p>
        ${item.lifecycle.lastInspectionAt ? `<p><strong>Dernière inspection :</strong> ${new Date(item.lifecycle.lastInspectionAt).toLocaleDateString()}</p>` : ""}
      </div>
    `).join("");

    inspectionsList.innerHTML = html;
  } catch (err) {
    inspectionsList.innerHTML = `<p class="text-danger">Erreur : ${escapeHTML(err.message)}</p>`;
  }
}

async function checkRetire() {
  try {
    const threshold = parseFloat(retireThreshold.value);
    const data = await getRetireSoon(threshold);
    
    if (!data.items || data.items.length === 0) {
      retireList.innerHTML = `<p class="text-center">✅ Aucun matériel à remplacer (seuil ${Math.round(threshold * 100)}%)</p>`;
      return;
    }

    const html = data.items.map(item => `
      <div class="result-item danger">
        <h4>${escapeHTML(item.specs?.name || item.category || "Équipement")}</h4>
        <p><strong>Usure :</strong> ${Math.round(item.usageRatio * 100)}% (${item.lifecycle.usageCount}/${item.maxUsage} utilisations)</p>
        <p><strong>Recommandation :</strong> Envisager le remplacement</p>
      </div>
    `).join("");

    retireList.innerHTML = html;
  } catch (err) {
    retireList.innerHTML = `<p class="text-danger">Erreur : ${escapeHTML(err.message)}</p>`;
  }
}

// ===== UI actions - Conseils
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Géolocalisation non supportée"));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      position => resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }),
      error => reject(error),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

async function handleGetLocation() {
  try {
    const coords = await getCurrentLocation();
    adviceLat.value = coords.lat.toFixed(6);
    adviceLng.value = coords.lng.toFixed(6);
    spotsLat.value = coords.lat.toFixed(6);
    spotsLng.value = coords.lng.toFixed(6);
  } catch (err) {
    alert(`Erreur de géolocalisation : ${err.message}`);
  }
}

async function handleMaterialAdvice() {
  try {
    const lat = parseFloat(adviceLat.value) || null;
    const lng = parseFloat(adviceLng.value) || null;
    
    const data = await getMaterialAdvice(lat, lng);
    
    let html = `
      <div class="advice-section">
        <h4>📋 Résumé de votre inventaire</h4>
        <div class="recommendation">
          <p><strong>Corde :</strong> ${data.summaryInventaire.rope_m}m</p>
          <p><strong>Dégaines :</strong> ${data.summaryInventaire.qd_count}</p>
          <p><strong>Casque :</strong> ${data.summaryInventaire.hasHelmet ? "✅" : "❌"}</p>
          <p><strong>Longe :</strong> ${data.summaryInventaire.hasAdjustableLanyard ? "✅" : "❌"}</p>
          <p><strong>Mousquetons à vis :</strong> ${data.summaryInventaire.lockingBiners}</p>
        </div>
      </div>
    `;

    if (data.recommandations && data.recommandations.length > 0) {
      html += `
        <div class="advice-section">
          <h4>💡 Recommandations</h4>
          ${data.recommandations.map(rec => `
            <div class="recommendation">
              <h5>${rec.category}</h5>
              <p><strong>Raison :</strong> ${rec.reason}</p>
              <p><strong>Suggestion :</strong> ${rec.suggestion}</p>
            </div>
          `).join("")}
        </div>
      `;
    }

    if (data.besoinsObserves) {
      html += `
        <div class="advice-section">
          <h4>📊 Analyse des besoins (${data.besoinsObserves.totalSpotsAnalyses} spots analysés)</h4>
          <div class="recommendation">
            <p><strong>Corde insuffisante :</strong> ${data.besoinsObserves.insuffisant.rope.pct}% des spots</p>
            <p><strong>Dégaines insuffisantes :</strong> ${data.besoinsObserves.insuffisant.qd.pct}% des spots</p>
          </div>
        </div>
      `;
    }

    materialAdvice.innerHTML = html;
  } catch (err) {
    materialAdvice.innerHTML = `<p class="text-danger">Erreur : ${escapeHTML(err.message)}</p>`;
  }
}

async function handleSpotsAdvice() {
  try {
    const lat = parseFloat(spotsLat.value);
    const lng = parseFloat(spotsLng.value);
    const level = spotsLevel.value;
    const exposition = spotsExposition.value;
    
    if (isNaN(lat) || isNaN(lng)) {
      alert("Veuillez entrer des coordonnées valides");
      return;
    }

    const data = await getSpotsAdvice(lat, lng, level, exposition);
    
    let html = `
      <div class="advice-section">
        <h4>📊 Résultats (${data.counts.compatible + data.counts.challenge + data.counts.gear_blocked} spots trouvés)</h4>
        <div class="recommendation">
          <p><strong>Compatible :</strong> ${data.counts.compatible} spots</p>
          <p><strong>Challenge :</strong> ${data.counts.challenge} spots</p>
          <p><strong>Bloqué par matériel :</strong> ${data.counts.gear_blocked} spots</p>
        </div>
      </div>
    `;

    if (data.compatible && data.compatible.length > 0) {
      html += `
        <div class="advice-section">
          <h4>✅ Spots compatibles</h4>
          ${data.compatible.slice(0, 5).map(spot => `
            <div class="recommendation">
              <h5>${spot.name}</h5>
              <p><strong>Distance :</strong> ${Math.round(spot.dist_m / 1000)}km</p>
              <p><strong>Niveau :</strong> ${spot.grade_mean || "Non spécifié"}</p>
              <p><strong>Orientation :</strong> ${spot.orientation || "Non spécifiée"}</p>
            </div>
          `).join("")}
        </div>
      `;
    }

    if (data.challenge && data.challenge.length > 0) {
      html += `
        <div class="advice-section">
          <h4>🎯 Spots challenge</h4>
          ${data.challenge.slice(0, 3).map(spot => `
            <div class="recommendation">
              <h5>${spot.name}</h5>
              <p><strong>Distance :</strong> ${Math.round(spot.dist_m / 1000)}km</p>
              <p><strong>Niveau :</strong> ${spot.grade_mean || "Non spécifié"}</p>
            </div>
          `).join("")}
        </div>
      `;
    }

    if (data.gear_blocked && data.gear_blocked.length > 0) {
      html += `
        <div class="advice-section">
          <h4>⚠️ Bloqué par matériel</h4>
          ${data.gear_blocked.slice(0, 3).map(spot => `
            <div class="recommendation">
              <h5>${spot.name}</h5>
              <p><strong>Manque :</strong> ${spot.gear.missing.join(", ")}</p>
            </div>
          `).join("")}
        </div>
      `;
    }

    spotsAdvice.innerHTML = html;
  } catch (err) {
    spotsAdvice.innerHTML = `<p class="text-danger">Erreur : ${escapeHTML(err.message)}</p>`;
  }
}

// ===== UI actions - Statistiques
async function loadStats() {
  try {
    const data = await apiList();
    
    // Statistiques inventaire
    const categories = {};
    let totalValue = 0;
    const conditions = { new: 0, good: 0, worn: 0, "retire-soon": 0, retired: 0 };
    
    data.forEach(item => {
      // Catégories
      const cat = item.category || "Autre";
      categories[cat] = (categories[cat] || 0) + 1;
      
      // Valeur
      const price = item.purchase?.price || item.specs?.price || 0;
      totalValue += price;
      
      // États
      const cond = item.lifecycle?.condition || "good";
      conditions[cond] = (conditions[cond] || 0) + 1;
    });

    // Inventaire
    const inventoryHtml = Object.entries(categories)
      .map(([cat, count]) => `
        <div class="stat-list-item">
          <span>${cat}</span>
          <span><strong>${count}</strong></span>
        </div>
      `).join("");
    inventoryStats.innerHTML = `<div class="stat-list">${inventoryHtml}</div>`;

    // Valeur
    valueStats.innerHTML = `
      <div class="stat-value">${totalValue.toFixed(0)}€</div>
      <div class="stat-label">Valeur totale estimée</div>
    `;

    // États
    const conditionsHtml = Object.entries(conditions)
      .filter(([, count]) => count > 0)
      .map(([state, count]) => `
        <div class="stat-list-item">
          <span>${getStateLabel(state)}</span>
          <span><strong>${count}</strong></span>
        </div>
      `).join("");
    conditionStats.innerHTML = `<div class="stat-list">${conditionsHtml}</div>`;

  } catch (err) {
    console.error("Erreur stats:", err);
  }
}

// ===== Event listeners
addBtn.addEventListener("click", () => {
  editingId = null;
  title.textContent = "Nouvel équipement";
  form.reset();
  modal.showModal();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const fd = new FormData(form);
    const payload = formToPayload(fd);

    console.log("Payload envoyé:", payload); // Debug

    if (editingId) {
      await apiPatch(editingId, payload);
    } else {
      await apiCreate(payload);
    }
    modal.close();
    await refresh();
  } catch (err) {
    console.error("Erreur formulaire:", err);
    alert(err.message || String(err));
  }
});

search.addEventListener("input", refresh);
tagFilter.addEventListener("change", refresh);

// Maintenance
checkInspectionsBtn.addEventListener("click", checkInspections);
checkRetireBtn.addEventListener("click", checkRetire);

// Conseils
getLocationBtn.addEventListener("click", handleGetLocation);
getMaterialAdviceBtn.addEventListener("click", handleMaterialAdvice);
getSpotsAdviceBtn.addEventListener("click", handleSpotsAdvice);

// Démarrage
refresh().catch(err => {
  console.error(err);
  listEl.innerHTML = `<p class="text-danger">Erreur de chargement : ${escapeHTML(err.message)}</p>`;
});