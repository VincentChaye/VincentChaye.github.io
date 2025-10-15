document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addFalaiseForm");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    console.log("Formulaire envoyé");
    // TODO envoyer au backend
  });

});
