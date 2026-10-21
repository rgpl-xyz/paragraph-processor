import { getUseNlp, setUseNlp } from "../shared/settings";

const checkbox = document.getElementById("useNLP") as HTMLInputElement;

// Load the stored value
getUseNlp()
  .then((enabled) => {
    checkbox.checked = enabled;
  })
  .catch((error) => console.error("Error retrieving useNLP:", error));

// Save the value when it changes
checkbox.addEventListener("change", () => {
  setUseNlp(checkbox.checked).catch((error) => console.error("Error saving useNLP:", error));
});
