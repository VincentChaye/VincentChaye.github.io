import { initCommonUI } from "./ui.js";
import { CACHE_KEYS } from "./config.js";

initCommonUI();

const form = document.getElementById("settingsForm");
const exportBtn = document.getElementById("exportSettings");
const deleteBtn = document.getElementById("deleteAccount");

const state = load();
hydrate();

form.addEventListener("submit", e => {
  e.preventDefault();
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  save(data);
  alert("Paramètres enregistrés.");
});

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(load(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "zdg_settings.json";
  a.click();
  URL.revokeObjectURL(url);
});

deleteBtn.addEventListener("click", () => {
  if (!confirm("Confirmer la suppression du compte (local uniquement) ?")) return;
  localStorage.removeItem(CACHE_KEYS.SETTINGS);
  alert("Compte supprimé (local).");
  location.reload();
});

function load(){
  try { return JSON.parse(localStorage.getItem(CACHE_KEYS.SETTINGS)) || {}; }
  catch { return {}; }
}
function save(d){
  localStorage.setItem(CACHE_KEYS.SETTINGS, JSON.stringify(d));
}
function hydrate(){
  if (!state) return;
  for (const [k,v] of Object.entries(state)){
    if (form.elements[k]) form.elements[k].value = v;
  }
}
