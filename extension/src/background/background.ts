import { FindNounPhrasesResponse, isFindNounPhrasesRequest } from "../shared/messages";
import { createNounPhraseClient } from "./noun-phrase-client";

// webpack bakes these in from .env or its defaults (webpack.config.js)
const client = createNounPhraseClient({
  url: `${process.env.API_BASE_URL}${process.env.API_ENDPOINT}`,
  timeoutMs: Number(process.env.API_TIMEOUT),
  retryAttempts: Number(process.env.API_RETRY_ATTEMPTS),
  retryDelayMs: Number(process.env.API_RETRY_DELAY),
  // The cache lives only as long as this service worker, which Chrome stops after ~30 s idle
  cacheTtlMs: Number(process.env.CACHE_DURATION),
  maxCacheEntries: Number(process.env.MAX_CACHE_SIZE),
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse: (response: FindNounPhrasesResponse) => void) => {
  if (!isFindNounPhrasesRequest(message)) return false;

  client.find(message.text)
    .then((phrases) => sendResponse({ ok: true, phrases }))
    .catch((error: unknown) => {
      console.error('Noun phrase lookup failed:', error);
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    });

  // Keep the message channel open for the async reply
  return true;
});
