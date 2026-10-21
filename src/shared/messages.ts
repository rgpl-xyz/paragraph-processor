// The one message the content script sends the background worker, typed for both ends.
export const FIND_NOUN_PHRASES = "findNounPhrases";

export interface FindNounPhrasesRequest {
  action: typeof FIND_NOUN_PHRASES;
  text: string;
}

export type FindNounPhrasesResponse =
  | { ok: true; phrases: string[] }
  | { ok: false; error: string };

export function isFindNounPhrasesRequest(message: unknown): message is FindNounPhrasesRequest {
  if (typeof message !== "object" || message === null) return false;
  const { action, text } = message as Partial<FindNounPhrasesRequest>;
  return action === FIND_NOUN_PHRASES && typeof text === "string";
}
