export function checkEnvironment() {
  const url = import.meta.env.VITE_AI_URL;
  const model = import.meta.env.VITE_AI_MODEL;
  const key = import.meta.env.VITE_AI_KEY;

  if (!url) {
    throw new Error("Falta VITE_AI_URL en tu archivo .env");
  }

  if (!model) {
    throw new Error("Falta VITE_AI_MODEL en tu archivo .env");
  }

  if (!key) {
    throw new Error("Falta VITE_AI_KEY en tu archivo .env");
  }

  console.log("✅ Conexión establecida con:", url);
  console.log("✅ Modelo listo:", model);
}

export function autoResizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + "px";
}

export function setLoading(isLoading) {
  const lampButton = document.getElementById("lamp-button");
  const outputContainer = document.getElementById("output-container");

  if (isLoading) {
    lampButton.classList.add("loading", "compact");
    lampButton.disabled = true;
    lampButton.querySelector(".lamp-text").textContent = "The Genie is thinking...";
    outputContainer.classList.remove("visible");
  } else {
    lampButton.classList.remove("loading");
    lampButton.disabled = false;
    lampButton.querySelector(".lamp-text").textContent = "Rub the Lamp for another wish";
  }
}