export interface NounPhraseClientOptions {
  url: string;
  timeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
  cacheTtlMs: number;
  maxCacheEntries: number;
  fetch?: typeof fetch;
  now?: () => number;
}

export interface NounPhraseClient {
  find(text: string): Promise<string[]>;
}

// The NLP API speaks the Azure custom-skill record format; we send one record per request
const RECORD_ID = "a1";

interface ResponseRecord {
  recordId: string;
  data?: { noun_phrases?: string[] };
  errors?: { message: string }[] | null;
}

interface ResponseBody {
  values?: ResponseRecord[];
}

class HttpError extends Error {
  constructor(readonly status: number, statusText: string) {
    super(`HTTP ${status}: ${statusText}`);
  }
}

class TimeoutError extends Error {}

// Looks up the noun phrases in a text through the NLP API. Repeat text (whitespace
// differences ignored) is answered from a bounded least-recently-used cache, concurrent
// lookups of the same text share one request, and network errors, timeouts and 5xx
// replies are retried. Failures are never cached.
export function createNounPhraseClient(options: NounPhraseClientOptions): NounPhraseClient {
  const { fetch: fetchImpl = (input, init) => fetch(input, init), now = Date.now } = options;
  const cache = createLruCache<string[]>(options.cacheTtlMs, options.maxCacheEntries, now);
  const inFlight = new Map<string, Promise<string[]>>();

  const requestWithRetries = async (text: string): Promise<string[]> => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await postRecord(fetchImpl, options, text);
      } catch (error) {
        if (attempt >= options.retryAttempts || !isRetryable(error)) throw error;
        await new Promise((resolve) => setTimeout(resolve, options.retryDelayMs));
      }
    }
  };

  return {
    find(text) {
      const key = text.replace(/\s+/g, " ").trim();
      const cached = cache.get(key);
      if (cached) return Promise.resolve(cached);

      const pending = inFlight.get(key);
      if (pending) return pending;

      const lookup = requestWithRetries(key)
        .then((phrases) => {
          cache.set(key, phrases);
          return phrases;
        })
        .finally(() => inFlight.delete(key));
      inFlight.set(key, lookup);
      return lookup;
    },
  };
}

async function postRecord(fetchImpl: typeof fetch, options: NounPhraseClientOptions, text: string): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetchImpl(options.url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ values: [{ recordId: RECORD_ID, data: { text, language: "en" } }] }),
      signal: controller.signal,
    });
    if (!response.ok) throw new HttpError(response.status, response.statusText);
    return nounPhrasesFrom((await response.json()) as ResponseBody);
  } catch (error) {
    if (controller.signal.aborted) throw new TimeoutError(`NLP API timed out after ${options.timeoutMs} ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function nounPhrasesFrom(body: ResponseBody): string[] {
  const record = body.values?.find((value) => value.recordId === RECORD_ID);
  if (!record) throw new Error("NLP API returned no record for the text");
  if (record.errors?.length) throw new Error(record.errors.map((error) => error.message).join("; "));
  return record.data?.noun_phrases ?? [];
}

function isRetryable(error: unknown): boolean {
  // fetch rejects with a TypeError when the network fails
  return error instanceof TypeError || error instanceof TimeoutError || (error instanceof HttpError && error.status >= 500);
}

// A Map keeps insertion order, so re-inserting on every read makes its first key the least
// recently used one.
function createLruCache<T>(ttlMs: number, maxEntries: number, now: () => number) {
  const entries = new Map<string, { value: T; storedAt: number }>();
  return {
    get(key: string): T | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      entries.delete(key);
      if (now() - entry.storedAt >= ttlMs) return undefined;
      entries.set(key, entry);
      return entry.value;
    },
    set(key: string, value: T) {
      entries.delete(key);
      if (entries.size >= maxEntries) {
        const oldest = entries.keys().next();
        if (!oldest.done) entries.delete(oldest.value);
      }
      entries.set(key, { value, storedAt: now() });
    },
  };
}
