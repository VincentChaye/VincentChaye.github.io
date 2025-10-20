import { initCommonUI } from "./ui.js";
import { CACHE_KEYS } from "./config.js";

initCommonUI();

const listEl = document.getElementById("gearList");
const addBtn = document.getElementById("addGearBtn");
const modal = document.getElementById("gearModal");
const form = document.getElementById("gearForm");
const title = document.getElementById("gearFormTitle");
const search = document.getElementById("gearSearch");
const tagFilter = document.getElementById("gearTagFilter");

let items = load();
let editingId = null;

render();

addBtn.addEventListener("click", () => openForm());
form.addEventListener("submit", onSubmit);
search.addEventListener("input", render);
tagFilter.addEventListener("change", render);

function load(){
  try { return JSON.parse(localStorage.getItem(CACHE_KEYS.GEAR)) || []; }
  catch { return []; }
}
function save(){ localStorage.setItem(CACHE_KEYS.GEAR, JSON.stringify(items)); }

function openForm(item){
  editingId = item?.id ?? null;
  title.textContent = editingId ? "Modifier l’équipement" : "Nouvel équipement";
  form.reset();
  if (item){
    form.elements.id.value = item.id;
    form.elements.name.value = item.name ?? "";
    form.elements.brand.value = item.brand ?? "";
    form.elements.model.value = item.model ?? "";
    form.elements.state.value = item.state ?? "bon";
    form.elements.purchaseDate.value = item.purchaseDate ?? "";
    form.elements.tags.value = (item.tags ?? []).join(", ");
    form.elements.notes.value = item.notes ?? "";
  }
  modal.showModal();
}

function onSubmit(e){
  e.preventDefault();
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  const tags = (data.tags || "").split(",").map(t => t.trim()).filter(Boolean);
  const payload = {
    id: data.id || crypto.randomUUID(),
    name: data.name,
    brand: data.brand || null,
    model: data.model || null,
    state: data.state || "bon",
    purchaseDate: data.purchaseDate || null,
    tags,
    notes: data.notes || null
  };
  if (editingId){
    items = items.map(it => it.id === editingId ? payload : it);
  } else {
    items = [payload, ...items];
  }
  save();
  modal.close();
  render();
}

function removeItem(id){
  if (!confirm("Supprimer cet équipement ?")) return;
  items = items.filter(it => it.id !== id);
  save();
  render();
}

function card(it){
  const tagStr = (it.tags||[]).map(t=>`<span class="chip">${t}</span>`).join(" ");
  return `
    <article class="card">
      <h3>${it.name}</h3>
      <p>${it.brand ?? ""} ${it.model ?? ""}</p>
      <p>État : <strong>${it.state ?? "bon"}</strong></p>
      ${it.purchaseDate ? `<p>Achat : ${it.purchaseDate}</p>` : ""}
      ${it.notes ? `<p>${it.notes}</p>` : ""}
      <div>${tagStr}</div>
      <div style="display:flex; gap:.5rem; margin-top:.5rem">
        <button class="btn btn--ghost" data-edit="${it.id}">Éditer</button>
        <button class="btn btn--danger" data-del="${it.id}">Supprimer</button>
      </div>
    </article>
  `;
}

function render(){
  const q = (search.value || "").toLowerCase();
  const tag = tagFilter.value || "";
  const filtered = items.filter(it => {
    const okQ = !q || JSON.stringify(it).toLowerCase().includes(q);
    const okTag = !tag || (it.tags||[]).includes(tag);
    return okQ && okTag;
  });
  listEl.innerHTML = filtered.map(card).join("") || `<p>Aucun matériel pour le moment.</p>`;
  listEl.querySelectorAll("[data-edit]").forEach(b=> b.addEventListener("click", () => {
    const it = items.find(x => x.id === b.dataset.edit);
    openForm(it);
  }));
  listEl.querySelectorAll("[data-del]").forEach(b=> b.addEventListener("click", () => removeItem(b.dataset.del)));
}
