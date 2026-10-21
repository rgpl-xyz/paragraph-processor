import { getUseNlp, setUseNlp } from "../shared/settings";

const checkbox = document.getElementById("useNLP") as HTMLInputElement;
const stateWord = document.getElementById("useNLPState") as HTMLElement;

function show(enabled: boolean) {
  checkbox.checked = enabled;
  stateWord.textContent = enabled ? "On" : "Off";
}

// Load the stored value
getUseNlp()
  .then(show)
  .catch((error) => console.error("Error retrieving useNLP:", error));

// Save the value when it changes
checkbox.addEventListener("change", () => {
  show(checkbox.checked);
  setUseNlp(checkbox.checked).catch((error) => console.error("Error saving useNLP:", error));
});
