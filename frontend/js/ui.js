/**
 * Gestion du thème clair/foncé + burger + UI commune
 */
function initCommonUI() {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // --- Menu hamburger ---
  const hamburger = document.getElementById("hamburger");
  const nav = document.getElementById("nav");

  if (hamburger && nav) {
    const links = Array.from(nav.querySelectorAll("a"));

    const openNav = () => {
      nav.classList.add("nav--open");
      hamburger.classList.add("is-open");              // visuel croix (×)
      hamburger.setAttribute("aria-expanded", "true");
      document.body.setAttribute("data-nav-open", "true");
      (links[0] || nav).focus?.();
    };

    const closeNav = () => {
      nav.classList.remove("nav--open");
      hamburger.classList.remove("is-open");
      hamburger.setAttribute("aria-expanded", "false");
      document.body.setAttribute("data-nav-open", "false");
      hamburger.focus?.();
    };

    const toggle = () => {
      nav.classList.contains("nav--open") ? closeNav() : openNav();
    };

    // Ouvrir/fermer via le bouton
    hamburger.addEventListener("click", (e) => {
      e.stopPropagation(); // évite de compter comme "clic hors menu"
      toggle();
    });

    // Fermer en cliquant *hors* du nav
    document.addEventListener("click", (e) => {
      if (
        nav.classList.contains("nav--open") &&
        !nav.contains(e.target) &&
        !hamburger.contains(e.target)
      ) {
        closeNav();
      }
    });

    // Fermer avec Échap
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("nav--open")) {
        closeNav();
      }
    });

    // Fermer en cliquant un lien du menu
    links.forEach((a) => a.addEventListener("click", () => closeNav()));
  }

  // --- Thème clair / foncé ---
  const themeToggle = document.getElementById("themeToggle");
  const saved = localStorage.getItem("zdg_theme_pref") || "light";
  applyTheme(saved);

  if (themeToggle) {
    themeToggle.textContent = saved === "dark" ? "Clair ☀️" : "Foncé 🌙";
    themeToggle.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      localStorage.setItem("zdg_theme_pref", next);
      applyTheme(next);
      themeToggle.textContent = next === "dark" ? "Clair ☀️" : "Foncé 🌙";
    });
  }
}

function applyTheme(mode) {
  document.documentElement.dataset.theme = mode;
  const isDark = mode === "dark";
  document.body.style.backgroundColor = isDark ? "#101418" : "#EBF2FA";
  document.body.style.color = isDark ? "#E8EEF4" : "#0E1A22";
}

// Export pour les modules ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initCommonUI, applyTheme };
}
