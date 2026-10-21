import { FIND_NOUN_PHRASES, FindNounPhrasesRequest, FindNounPhrasesResponse } from "../shared/messages";

// Asks the background worker for the noun phrases in `text`. Rejects when the lookup fails
// or the worker can't be reached, e.g. after the extension is reloaded under an open tab.
export async function findNounPhrases(text: string): Promise<string[]> {
  const request: FindNounPhrasesRequest = { action: FIND_NOUN_PHRASES, text };
  const response: FindNounPhrasesResponse | undefined = await chrome.runtime.sendMessage(request);

  if (!response) throw new Error("No reply from the background worker");
  if (!response.ok) throw new Error(response.error);
  return response.phrases;
}
