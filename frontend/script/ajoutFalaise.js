document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("addFalaiseForm");
  const niveauMin = document.getElementById("niveau-min");
  const niveauMax = document.getElementById("niveau-max");

  const chiffres = [3, 4, 5, 6, 7, 8, 9];
  const lettres = ["a", "b", "c"];

  // Remplir automatiquement les listes déroulantes
  function remplirSelect(select) {
    const optionVide = document.createElement("option");
    optionVide.value = "";
    optionVide.textContent = "-- Sélectionnez --";
    select.appendChild(optionVide);

    chiffres.forEach((chiffre) => {
      lettres.forEach((lettre) => {
        const option = document.createElement("option");
        option.value = `${chiffre}${lettre}`;
        option.textContent = `${chiffre}${lettre.toUpperCase()}`;
        select.appendChild(option);
      });
    });
  }

  remplirSelect(niveauMin);
  remplirSelect(niveauMax);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = {
      zone: document.getElementById("zone-name").value,
      latitude: document.getElementById("latitude").value,
      longitude: document.getElementById("longitude").value,
      type: form.querySelector('input[name="type"]:checked')?.value,
      sousType: form.querySelector('input[name="sous-type"]:checked')?.value,
      niveauMin: niveauMin.value,
      niveauMax: niveauMax.value
    };

    console.log("✅ Données à envoyer :", data);
    // TODO: fetch() vers le backend
  });
});
