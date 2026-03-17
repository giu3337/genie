
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