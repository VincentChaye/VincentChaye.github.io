// frontend/js/register.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("regForm");
  const err = document.getElementById("regErr");

  if (!form) {
    console.error(" Formulaire #regForm introuvable dans la page !");
    return;
  }

  function getNext() {
    const p = new URLSearchParams(location.search);
    const next = p.get("next");
    // Sécurise: doit être un chemin absolu de ton site
    return next && next.startsWith("/") ? decodeURIComponent(next) : "/frontend/materiel.html";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.style.display = "none";

    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "");
    const displayName = String(fd.get("displayName") || "").trim();

    try {
      const res = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 409) {
        err.textContent = "Cet email est déjà utilisé. Essayez de vous connecter.";
        err.style.display = "";
        return;
      }
      if (res.status === 400) {
        err.textContent = json?.error || "Vérifiez les champs (email/mot de passe).";
        err.style.display = "";
        return;
      }
      if (!res.ok) {
        err.textContent = json?.error || `Erreur ${res.status}`;
        err.style.display = "";
        return;
      }

      //  Unifier avec login.js : { token, user } dans localStorage.auth
      if (!json?.token || !json?.user?._id) {
        err.textContent = "Réponse d'inscription invalide (token ou user manquant).";
        err.style.display = "";
        return;
      }

      localStorage.setItem("auth", JSON.stringify({ token: json.token, user: json.user }));

      //  Redirige vers la page d'origine (ou vers le matériel par défaut)
      location.replace(getNext());
    } catch (e2) {
      console.error(e2);
      err.textContent = "Erreur serveur. Réessayez dans un instant.";
      err.style.display = "";
    }
  });
});
