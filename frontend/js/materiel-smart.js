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

// === Config API ===
const API_BASE = (window.APP_CONFIG?.API_URL || "http://localhost:3000") + "/api";
const ENDPOINT = {
  USER_MAT: API_BASE + "/user_materiel",
  SPECS: API_BASE + "/materiel_specs",
};

// --- Auth helpers ---
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
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} – ${text || res.statusText}`);
  }
  return res.status === 204 ? null : res.json();
}

// === Configuration du matériel ===
const MATERIAL_CONFIG = {
  // Catégories avec leurs intervalles d'inspection par défaut (en mois)
  categories: {
    "Corde": { 
      inspectionInterval: 6, 
      maxUsage: 500,
      description: "Corde dynamique d'escalade"
    },
    "Dégaines": { 
      inspectionInterval: 12, 
      maxUsage: 1000,
      description: "Dégaines sport ou trad"
    },
    "Casque": { 
      inspectionInterval: 12, 
      maxUsage: null,
      description: "Casque d'escalade"
    },
    "Baudrier": { 
      inspectionInterval: 12, 
      maxUsage: null,
      description: "Baudrier d'escalade"
    },
    "Chaussons": { 
      inspectionInterval: 6, 
      maxUsage: null,
      description: "Chaussons d'escalade"
    },
    "Mousquetons": { 
      inspectionInterval: 12, 
      maxUsage: 2000,
      description: "Mousquetons à vis ou droits"
    },
    "Longe": { 
      inspectionInterval: 6, 
      maxUsage: 200,
      description: "Longe de via ferrata ou d'assurage"
    },
    "Autre": { 
      inspectionInterval: 6, 
      maxUsage: null,
      description: "Autre équipement"
    }
  },

  // États possibles
  states: {
    "new": "Neuf",
    "good": "Bon état",
    "worn": "Usé mais utilisable",
    "retire-soon": "À retirer bientôt",
    "retired": "Retiré du service"
  }
};

// === UI refs ===
initCommonUI();
const listEl = document.getElementById("gearList");
const addBtn = document.getElementById("addGearBtn");
const modal = document.getElementById("gearModal");
const form = document.getElementById("gearForm");
const title = document.getElementById("gearFormTitle");
const search = document.getElementById("gearSearch");
const tagFilter = document.getElementById("gearTagFilter");

let rows = [];
let editingId = null;

// === Helpers ===
function escapeHTML(s = "") {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

// === Formulaire intelligent ===
function createSmartForm() {
  const formHTML = `
    <h2 id="gearFormTitle">Équipement</h2>
    
    <!-- Informations de base -->
    <div class="form-section">
      <h3>Informations générales</h3>
      
      <label>Nom de l'équipement *
        <input name="name" required class="input" placeholder="Ex: Corde principale, Casque rouge..." />
      </label>
      
      <label>Catégorie *
        <select name="category" class="select" required>
          <option value="">Choisir une catégorie...</option>
          ${Object.entries(MATERIAL_CONFIG.categories).map(([key, config]) => 
            `<option value="${key}" title="${config.description}">${key}</option>`
          ).join('')}
        </select>
      </label>
      
      <div class="form-row">
        <label>Marque
          <input name="brand" class="input" placeholder="Ex: Petzl, Black Diamond..." />
        </label>
        <label>Modèle
          <input name="model" class="input" placeholder="Ex: Mambo 10.1mm, Vector..." />
        </label>
      </div>
    </div>

    <!-- État et utilisation -->
    <div class="form-section">
      <h3>État et utilisation</h3>
      
      <label>État actuel
        <select name="state" class="select">
          ${Object.entries(MATERIAL_CONFIG.states).map(([key, label]) => 
            `<option value="${key}">${label}</option>`
          ).join('')}
        </select>
      </label>
      
      <div class="usage-section" id="usageSection">
        <label>Nombre d'utilisations
          <div class="usage-controls">
            <button type="button" class="btn btn--ghost" id="decreaseUsage">-</button>
            <input type="number" name="usageCount" class="input usage-input" min="0" value="0" readonly />
            <button type="button" class="btn btn--ghost" id="increaseUsage">+</button>
          </div>
          <small class="usage-hint" id="usageHint"></small>
        </label>
      </div>
    </div>

    <!-- Achat (optionnel) -->
    <div class="form-section">
      <h3>Informations d'achat (optionnel)</h3>
      
      <div class="form-row">
        <label>Date d'achat
          <input type="date" name="purchaseDate" class="input" />
        </label>
        <label>Prix (€)
          <input type="number" name="price" class="input" step="0.01" min="0" placeholder="0.00" />
        </label>
      </div>
    </div>

    <!-- Inspection intelligente -->
    <div class="form-section">
      <h3>Inspection</h3>
      
      <label>Dernière inspection
        <input type="date" name="lastInspection" class="input" />
      </label>
      
      <div class="inspection-info" id="inspectionInfo">
        <p class="info-text">La prochaine inspection sera calculée automatiquement selon la catégorie.</p>
      </div>
    </div>

    <!-- Notes -->
    <div class="form-section">
      <label>Notes et observations
        <textarea name="notes" class="input" rows="3" placeholder="Défauts observés, historique, particularités..."></textarea>
      </label>
    </div>

    <menu class="modal__actions">
      <button value="cancel" class="btn btn--ghost" type="reset">Annuler</button>
      <button value="submit" class="btn" id="gearSubmitBtn">Enregistrer</button>
    </menu>
    <input type="hidden" name="id" />
  `;
  
  form.innerHTML = formHTML;
  setupFormInteractions();
}

function setupFormInteractions() {
  const categorySelect = form.querySelector('[name="category"]');
  const usageInput = form.querySelector('[name="usageCount"]');
  const decreaseBtn = form.querySelector('#decreaseUsage');
  const increaseBtn = form.querySelector('#increaseUsage');
  const usageHint = form.querySelector('#usageHint');
  const inspectionInfo = form.querySelector('#inspectionInfo');
  const lastInspectionInput = form.querySelector('[name="lastInspection"]');

  // Gestion des boutons +/-
  decreaseBtn.addEventListener('click', () => {
    const current = parseInt(usageInput.value) || 0;
    if (current > 0) {
      usageInput.value = current - 1;
      updateUsageHint();
    }
  });

  increaseBtn.addEventListener('click', () => {
    const current = parseInt(usageInput.value) || 0;
    usageInput.value = current + 1;
    updateUsageHint();
  });

  // Mise à jour des hints selon la catégorie
  categorySelect.addEventListener('change', () => {
    updateUsageHint();
    updateInspectionInfo();
  });

  lastInspectionInput.addEventListener('change', updateInspectionInfo);

  function updateUsageHint() {
    const category = categorySelect.value;
    const usage = parseInt(usageInput.value) || 0;
    
    if (!category || !MATERIAL_CONFIG.categories[category]) {
      usageHint.textContent = '';
      return;
    }

    const config = MATERIAL_CONFIG.categories[category];
    if (config.maxUsage) {
      const percentage = Math.round((usage / config.maxUsage) * 100);
      let message = `${usage}/${config.maxUsage} utilisations (${percentage}%)`;
      
      if (percentage > 90) {
        message += ' ⚠️ À remplacer';
        usageHint.className = 'usage-hint warning';
      } else if (percentage > 70) {
        message += ' ⚡ Surveiller';
        usageHint.className = 'usage-hint caution';
      } else {
        usageHint.className = 'usage-hint';
      }
      
      usageHint.textContent = message;
    } else {
      usageHint.textContent = `${usage} utilisations`;
      usageHint.className = 'usage-hint';
    }
  }

  function updateInspectionInfo() {
    const category = categorySelect.value;
    const lastInspection = lastInspectionInput.value;
    
    if (!category || !MATERIAL_CONFIG.categories[category]) {
      inspectionInfo.innerHTML = '<p class="info-text">Sélectionnez une catégorie pour voir les recommandations d\'inspection.</p>';
      return;
    }

    const config = MATERIAL_CONFIG.categories[category];
    let html = `<p class="info-text">Inspection recommandée tous les <strong>${config.inspectionInterval} mois</strong> pour cette catégorie.</p>`;
    
    if (lastInspection) {
      const nextInspection = addMonths(new Date(lastInspection), config.inspectionInterval);
      const today = new Date();
      const daysUntil = Math.ceil((nextInspection - today) / (1000 * 60 * 60 * 24));
      
      html += `<p class="info-text">Prochaine inspection prévue : <strong>${formatDate(nextInspection)}</strong>`;
      
      if (daysUntil < 0) {
        html += ` ⚠️ <span class="warning">En retard de ${Math.abs(daysUntil)} jours</span>`;
      } else if (daysUntil <= 30) {
        html += ` ⚡ <span class="caution">Dans ${daysUntil} jours</span>`;
      } else {
        html += ` ✅ <span class="ok">Dans ${daysUntil} jours</span>`;
      }
      
      html += '</p>';
    }
    
    inspectionInfo.innerHTML = html;
  }

  // Initialisation
  updateUsageHint();
  updateInspectionInfo();
}

// === Conversion des données ===
function formToPayload(fd) {
  const category = fd.get("category") || "Autre";
  const lastInspection = fd.get("lastInspection");
  
  // Calcul automatique de la prochaine inspection
  let nextInspection = null;
  if (lastInspection && MATERIAL_CONFIG.categories[category]) {
    const config = MATERIAL_CONFIG.categories[category];
    nextInspection = addMonths(new Date(lastInspection), config.inspectionInterval);
  }

  const payload = {
    category,
    specs: {
      name: fd.get("name") || null,
      brand: fd.get("brand") || null,
      model: fd.get("model") || null,
    },
    lifecycle: {
      condition: fd.get("state") || "good",
      notes: fd.get("notes") || null,
      usageCount: parseInt(fd.get("usageCount")) || 0,
    }
  };

  // Ajout des dates d'inspection si disponibles
  if (lastInspection) {
    payload.lifecycle.lastInspectionAt = new Date(lastInspection).toISOString();
  }
  if (nextInspection) {
    payload.lifecycle.nextInspectionAt = nextInspection.toISOString();
  }

  // Ajout des informations d'achat si disponibles
  const purchaseDate = fd.get("purchaseDate");
  const price = fd.get("price");
  
  if (purchaseDate) {
    payload.purchase = { date: new Date(purchaseDate).toISOString() };
  }
  
  if (price) {
    payload.specs.price = parseFloat(price);
  }

  return payload;
}

function fillFormFromRow(item) {
  form.reset();
  
  if (!item) return;
  
  form.elements.id.value = item._id;
  form.elements.name.value = item?.specs?.name || "";
  form.elements.brand.value = item?.specs?.brand || "";
  form.elements.model.value = item?.specs?.model || "";
  form.elements.category.value = item?.category || "";
  form.elements.state.value = item?.lifecycle?.condition || "good";
  form.elements.usageCount.value = item?.lifecycle?.usageCount || 0;
  form.elements.notes.value = item?.lifecycle?.notes || "";
  
  if (item?.purchase?.date) {
    form.elements.purchaseDate.value = formatDate(item.purchase.date);
  }
  
  if (item?.specs?.price) {
    form.elements.price.value = item.specs.price;
  }
  
  if (item?.lifecycle?.lastInspectionAt) {
    form.elements.lastInspection.value = formatDate(item.lifecycle.lastInspectionAt);
  }

  // Déclencher les mises à jour des hints
  setTimeout(() => {
    const categorySelect = form.querySelector('[name="category"]');
    const lastInspectionInput = form.querySelector('[name="lastInspection"]');
    
    categorySelect.dispatchEvent(new Event('change'));
    lastInspectionInput.dispatchEvent(new Event('change'));
  }, 100);
}

// === Affichage des cartes ===
function rowToCard(item) {
  const name = item?.specs?.name || `${item?.specs?.brand || ""} ${item?.specs?.model || ""}`.trim() || item?.category || "Équipement";
  const brand = item?.specs?.brand || "";
  const model = item?.specs?.model || "";
  const condition = item?.lifecycle?.condition || "good";
  const conditionLabel = MATERIAL_CONFIG.states[condition] || condition;
  const usage = item?.lifecycle?.usageCount || 0;
  const purchaseDate = item?.purchase?.date ? new Date(item.purchase.date).toLocaleDateString() : null;
  const notes = item?.lifecycle?.notes || "";
  const price = item?.specs?.price ? `${item.specs.price}€` : null;
  
  // Calcul de l'état d'inspection
  let inspectionStatus = "";
  if (item?.lifecycle?.nextInspectionAt) {
    const nextInspection = new Date(item.lifecycle.nextInspectionAt);
    const today = new Date();
    const daysUntil = Math.ceil((nextInspection - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) {
      inspectionStatus = `<span class="status-warning">⚠️ Inspection en retard</span>`;
    } else if (daysUntil <= 30) {
      inspectionStatus = `<span class="status-caution">⚡ Inspection dans ${daysUntil}j</span>`;
    } else {
      inspectionStatus = `<span class="status-ok">✅ Inspection OK</span>`;
    }
  }

  return `
    <article class="card material-card">
      <div class="card-header">
        <h3>${escapeHTML(name)}</h3>
        <span class="category-badge">${escapeHTML(item.category || "")}</span>
      </div>
      
      <div class="card-content">
        ${brand || model ? `<p class="brand-model">${escapeHTML(brand)} ${escapeHTML(model)}</p>` : ""}
        
        <div class="status-row">
          <span class="condition condition-${condition}">${escapeHTML(conditionLabel)}</span>
          ${usage > 0 ? `<span class="usage">${usage} utilisations</span>` : ""}
        </div>
        
        ${inspectionStatus ? `<div class="inspection-status">${inspectionStatus}</div>` : ""}
        
        <div class="details">
          ${purchaseDate ? `<span class="detail">📅 ${purchaseDate}</span>` : ""}
          ${price ? `<span class="detail">💰 ${price}</span>` : ""}
        </div>
        
        ${notes ? `<p class="notes">${escapeHTML(notes)}</p>` : ""}
      </div>
      
      <div class="card-actions">
        <button class="btn btn--ghost" data-edit="${item._id}">✏️ Modifier</button>
        <button class="btn btn--danger" data-del="${item._id}">🗑️ Supprimer</button>
      </div>
    </article>
  `;
}

// === API calls ===
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

// === UI actions ===
async function refresh() {
  try {
    const q = (search.value || "").toLowerCase();
    rows = await apiList();

    const filtered = rows.filter(item => {
      const searchText = JSON.stringify(item).toLowerCase();
      return !q || searchText.includes(q);
    });

    listEl.innerHTML = filtered.length
      ? filtered.map(rowToCard).join("")
      : `<div class="empty-state">
          <p>📦 Aucun matériel pour le moment</p>
          <p>Cliquez sur "➕ Ajouter" pour commencer votre inventaire</p>
        </div>`;

    // Attacher les événements
    listEl.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => {
        const item = rows.find(x => String(x._id) === btn.dataset.edit);
        editingId = item?._id || null;
        title.textContent = "Modifier l'équipement";
        fillFormFromRow(item);
        modal.showModal();
      });
    });

    listEl.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const item = rows.find(x => String(x._id) === btn.dataset.del);
        const itemName = item?.specs?.name || item?.category || "cet équipement";
        
        if (!confirm(`Êtes-vous sûr de vouloir supprimer "${itemName}" ?`)) return;
        
        try {
          await apiDelete(btn.dataset.del);
          await refresh();
        } catch (err) {
          alert(`Erreur lors de la suppression : ${err.message}`);
        }
      });
    });

  } catch (err) {
    console.error("Erreur lors du chargement:", err);
    listEl.innerHTML = `<div class="error-state">
      <p>❌ Erreur de chargement</p>
      <p>${escapeHTML(err.message)}</p>
      <button class="btn" onclick="refresh()">Réessayer</button>
    </div>`;
  }
}

// === Event listeners ===
addBtn.addEventListener("click", () => {
  editingId = null;
  title.textContent = "Nouvel équipement";
  form.reset();
  
  // Réinitialiser les interactions du formulaire
  setTimeout(() => {
    const categorySelect = form.querySelector('[name="category"]');
    if (categorySelect) {
      categorySelect.dispatchEvent(new Event('change'));
    }
  }, 100);
  
  modal.showModal();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  try {
    const submitBtn = form.querySelector('#gearSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = "Enregistrement...";
    
    const fd = new FormData(form);
    const payload = formToPayload(fd);

    if (editingId) {
      await apiPatch(editingId, payload);
    } else {
      await apiCreate(payload);
    }
    
    modal.close();
    await refresh();
    
  } catch (err) {
    console.error("Erreur lors de l'enregistrement:", err);
    alert(`Erreur : ${err.message}`);
  } finally {
    const submitBtn = form.querySelector('#gearSubmitBtn');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enregistrer";
    }
  }
});

// Fermeture du modal
modal.addEventListener("close", () => {
  editingId = null;
  form.reset();
});

// Recherche et filtres
search.addEventListener("input", refresh);
tagFilter.addEventListener("change", refresh);

// === Initialisation ===
document.addEventListener("DOMContentLoaded", () => {
  createSmartForm();
  refresh();
});

// Export pour les tests
window.MaterialManager = {
  refresh,
  MATERIAL_CONFIG
};