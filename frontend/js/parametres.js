import { initCommonUI } from "./ui.js";
initCommonUI();

/* ====== Sélecteurs ====== */
const authGate = document.getElementById("authGate");
const accountView = document.getElementById("accountView");

const vDisplayName = document.getElementById("vDisplayName");
const vEmail = document.getElementById("vEmail");
const vPhone = document.getElementById("vPhone");
const vStatus = document.getElementById("vStatus");
const vVerified = document.getElementById("vVerified");
const vRoles = document.getElementById("vRoles");

const btnLogout = document.getElementById("btnLogout");
const form = document.getElementById("profileForm");
const fDisplayName = document.getElementById("fDisplayName");
const fAvatarUrl = document.getElementById("fAvatarUrl");
const fPhone = document.getElementById("fPhone");
const avatarPreview = document.getElementById("avatarPreview");
const saveMsg = document.getElementById("saveMsg");

/* ====== Config API ====== */
const API_BASE = "http://localhost:3000/api";

/* ====== Storage unifié ====== */
const AUTH_KEY = "auth";

function getAuth() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; }
}
function setAuth(a) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(a));
}
function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

/* ====== UI state ====== */
function show(el) { el && (el.style.display = ""); }
function hide(el) { el && (el.style.display = "none"); }

/* Remplit la vue avec un user (objet issu du backend) */
function fillUser(u) {
  vDisplayName.textContent = u.displayName || "—";
  vEmail.textContent = u.email || "—";
  vPhone.textContent = u.phone || "—";
  vStatus.textContent = u.status || "—";
  vVerified.textContent = u.emailVerified ? "Oui" : "Non";
  vRoles.textContent = Array.isArray(u.roles) ? u.roles.join(", ") : (u.roles || "—");

  fDisplayName.value = u.displayName || "";
  fAvatarUrl.value = u.avatarUrl || "";
  fPhone.value = u.phone || "";

  if (u.avatarUrl) {
    avatarPreview.src = u.avatarUrl;
    avatarPreview.style.display = "inline-block";
  } else {
    avatarPreview.removeAttribute("src");
    avatarPreview.style.display = "none";
  }
}

/* ====== Appel backend protégé ====== */
async function fetchMe() {
  const auth = getAuth();
  if (!auth?.token) return null;

  const res = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${auth.token}` }
  });

  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  return json?.user || null;
}

async function patchMe(payload) {
  const auth = getAuth();
  if (!auth?.token) throw new Error("no_token");

  const res = await fetch(`${API_BASE}/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`
    },
    body: JSON.stringify(payload)
  });

  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  return json?.user || null;
}

/* ====== Flux principal ====== */
async function boot() {
  const auth = getAuth();

  // Pas d’auth → gate
  if (!auth?.token) {
    show(authGate);
    hide(accountView);
    return;
  }

  try {
    const user = await fetchMe();
    if (!user) {
      // Token invalide/expiré → on reset l’auth et on montre le gate
      clearAuth();
      show(authGate);
      hide(accountView);
      return;
    }

    // Maj storage: on garde token, on remplace user par la version fraiche du backend
    setAuth({ token: auth.token, user });

    hide(authGate);
    show(accountView);
    fillUser(user);

  } catch (e) {
    console.error("Erreur lors du chargement du profil:", e);
    // Sécurité: on affiche quand même le gate si le backend échoue
    show(authGate);
    hide(accountView);
  }
}

/* ====== Events ====== */
btnLogout?.addEventListener("click", () => {
  clearAuth();
  show(authGate);
  hide(accountView);
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    displayName: fDisplayName.value.trim(),
    avatarUrl: fAvatarUrl.value.trim() || null,
    phone: fPhone.value.trim() || null,
  };

  try {
    const updatedUser = await patchMe(payload);
    if (!updatedUser) {
      // probable 401
      clearAuth();
      show(authGate);
      hide(accountView);
      return;
    }
    const auth = getAuth();
    setAuth({ token: auth.token, user: updatedUser });

    fillUser(updatedUser);
    flashSaved();
  } catch (e2) {
    console.error("Erreur de sauvegarde profil:", e2);
    flashSaved("Erreur de sauvegarde");
  }
});

/* Prévisualisation avatar en live */
let avatarDebounce;
fAvatarUrl?.addEventListener("input", () => {
  clearTimeout(avatarDebounce);
  avatarDebounce = setTimeout(() => {
    const url = fAvatarUrl.value.trim();
    if (url) {
      avatarPreview.src = url;
      avatarPreview.style.display = "inline-block";
    } else {
      avatarPreview.removeAttribute("src");
      avatarPreview.style.display = "none";
    }
  }, 200);
});

/* ====== UX ====== */
function flashSaved(msg = "Sauvegardé ✓") {
  if (!saveMsg) return;
  saveMsg.style.display = "inline";
  saveMsg.textContent = msg;
  setTimeout(() => { saveMsg.style.display = "none"; }, 1500);
}

/* ====== Start ====== */
boot();