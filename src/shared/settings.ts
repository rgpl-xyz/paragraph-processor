// The popup's "Use NLP" toggle, kept in chrome.storage.sync so it follows the user's
// Chrome profile. Off until the user turns it on.
const USE_NLP_KEY = "useNLP";

export async function getUseNlp(): Promise<boolean> {
  const stored = await chrome.storage.sync.get(USE_NLP_KEY);
  return stored[USE_NLP_KEY] === true;
}

export async function setUseNlp(enabled: boolean): Promise<void> {
  await chrome.storage.sync.set({ [USE_NLP_KEY]: enabled });
}
