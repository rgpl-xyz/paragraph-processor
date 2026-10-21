import { FindNounPhrasesResponse, isFindNounPhrasesRequest } from "../shared/messages";
import { createNounPhraseClient } from "./noun-phrase-client";

const client = createNounPhraseClient({
  url: `${process.env.API_BASE_URL || 'http://localhost:8080'}${process.env.API_ENDPOINT || '/noun_phrases'}`,
  timeoutMs: Number(process.env.API_TIMEOUT || 10000),
  retryAttempts: Number(process.env.API_RETRY_ATTEMPTS || 3),
  retryDelayMs: Number(process.env.API_RETRY_DELAY || 1000),
  // The cache lives only as long as this service worker, which Chrome stops after ~30 s idle
  cacheTtlMs: Number(process.env.CACHE_DURATION || 300000),
  maxCacheEntries: Number(process.env.MAX_CACHE_SIZE || 1000),
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
