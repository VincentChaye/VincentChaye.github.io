// initCommonUI sera disponible globalement via ui.js

// --- Auth guard: redirige vers login si pas de token ---
(function ensureAuth() {
  try {
    const raw = localStorage.getItem("auth");
    if (!raw) throw new Error("no-auth");
    const obj = JSON.parse(raw);
    if (!obj?.token || !obj?.user?._id) throw new Error("bad-auth");
  } catch {
    const next = encodeURIComponent(location.pathname + location.search);
    // redirection relative au dossier courant (ex: /frontend/)
    location.href = `./login.html?next=${next}`;
  }
})();


// === Config API
const API_BASE = (window.APP_CONFIG?.API_URL || "http://localhost:3000") + "/api";
const ENDPOINT = {
  USER_MAT: API_BASE + "/user_materiel",
  SPECS:     API_BASE + "/materiel_specs", // <- fix typo
};

// --- Auth helpers
function getAuth() {
  try {
    const s = localStorage.getItem("auth");
    if (!s) return { userId: null, token: null };
    const obj = JSON.parse(s);
    const userId = obj?.user?._id || obj?._id || obj?.userId || null;
    const token  = obj?.token || obj?.jwt || obj?.accessToken || null;
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
    const text = await res.text().catch(()=> "");
    throw new Error(`HTTP ${res.status} – ${text || res.statusText}`);
  }
  return res.status === 204 ? null : res.json();
}

// ===== UI refs
if (typeof initCommonUI === 'function') {
  initCommonUI();
}
const listEl     = document.getElementById("gearList");
const addBtn     = document.getElementById("addGearBtn");
const modal      = document.getElementById("gearModal");
const form       = document.getElementById("gearForm");
const title      = document.getElementById("gearFormTitle");
const search     = document.getElementById("gearSearch");
const tagFilter  = document.getElementById("gearTagFilter");

let rows = [];           // éléments depuis l’API
let editingId = null;    // _id Mongo string

// ===== Data <-> Form helpers

// mappe les valeurs saisies (FR) vers l'enum Mongo
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
  if (["new","good","worn","retire-soon","retired"].includes(v)) return v;
  return dict[v] || "good";
}

function formToPayload(fd) {
  const tags = (fd.get("tags") || "")
    .split(",").map(s=>s.trim()).filter(Boolean);

  const category = (fd.get("category") || tagFilter.value || "").trim() || "Autre";

  // Schéma backend: { category, specs, purchase, lifecycle } (userId imposé par le token)
  return {
    category,
    specs: {
      name:  fd.get("name")  || null,
      brand: fd.get("brand") || null,
      model: fd.get("model") || null,
      tags,
    },
    purchase: fd.get("purchaseDate")
      ? { date: new Date(fd.get("purchaseDate")).toISOString() }
      : undefined,
    lifecycle: {
      condition: mapStateToEnum(fd.get("state")),
      notes: fd.get("notes") || null,
    },
  };
}

function rowToCard(it) {
  const name  = it?.specs?.name || `${it?.specs?.brand ?? ""} ${it?.specs?.model ?? ""}`.trim() || it?.category || "Équipement sans nom";
  const brand = it?.specs?.brand ?? "";
  const model = it?.specs?.model ?? "";
  const cond  = it?.lifecycle?.condition ?? "good";
  const achat = it?.purchase?.date ? new Date(it.purchase.date).toLocaleDateString() : null;
  const notes = it?.lifecycle?.notes ?? "";
  const tagStr = (it?.specs?.tags || []).map(t => `<span class="chip">${escapeHTML(t)}</span>`).join(" ");

  return `
    <article class="card">
      <h3>${escapeHTML(name)}</h3>
      <p>${escapeHTML(brand)} ${escapeHTML(model)}</p>
      <p>Catégorie : <strong>${escapeHTML(it.category || "")}</strong></p>
      <p>État : <strong>${escapeHTML(cond)}</strong></p>
      ${achat ? `<p>Achat : ${achat}</p>` : ""}
      ${notes ? `<p>${escapeHTML(notes)}</p>` : ""}
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
  form.elements.id.value            = it._id;
  form.elements.name.value          = it?.specs?.name ?? "";
  form.elements.brand.value         = it?.specs?.brand ?? "";
  form.elements.model.value         = it?.specs?.model ?? "";
  form.elements.state.value         = it?.lifecycle?.condition ?? "good";
  form.elements.purchaseDate.value  = it?.purchase?.date ? new Date(it.purchase.date).toISOString().slice(0,10) : "";
  form.elements.tags.value          = (it?.specs?.tags || []).join(", ");
  form.elements.notes.value         = it?.lifecycle?.notes ?? "";
  if (form.elements.category) {
    form.elements.category.value    = it?.category || "";
  }
}

function escapeHTML(s="") {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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

// ===== UI actions

async function refresh() {
  const q = (search.value || "").toLowerCase();
  rows = await apiList();

  const filtered = rows.filter(it => {
    const blob = JSON.stringify(it).toLowerCase();
    const okQ = !q || blob.includes(q);
    return okQ;
  });

  listEl.innerHTML = filtered.length
    ? filtered.map(rowToCard).join("")
    : `<p>Aucun matériel pour le moment.</p>`;

  listEl.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => {
    const it = rows.find(x => String(x._id) === b.dataset.edit);
    editingId = it?._id || null;
    title.textContent = "Modifier l’équipement";
    fillFormFromRow(it);
    modal.showModal();
  }));

  listEl.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("Supprimer cet équipement ?")) return;
    await apiDelete(b.dataset.del);
    await refresh();
  }));
}

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

    if (editingId) {
      await apiPatch(editingId, payload);
    } else {
      await apiCreate(payload);
    }
    modal.close();
    await refresh();
  } catch (err) {
    alert(err.message || String(err));
  }
});

search.addEventListener("input", refresh);
tagFilter.addEventListener("change", refresh);

// Démarrage
refresh().catch(err => {
  console.error(err);
  listEl.innerHTML = `<p class="text-danger">Erreur de chargement : ${escapeHTML(err.message)}</p>`;
});
