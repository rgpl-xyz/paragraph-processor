// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createNounPhraseClient, NounPhraseClientOptions } from "./noun-phrase-client";

const API_URL = "http://localhost:8080/noun_phrases";

function envelope(phrases: string[], errors: { message: string }[] | null = null) {
  return { values: [{ recordId: "a1", data: { noun_phrases: phrases }, errors, warnings: null }] };
}

function reply(body: unknown, status = 200, statusText = "OK") {
  return new Response(JSON.stringify(body), { status, statusText, headers: { "Content-Type": "application/json" } });
}

function makeClient(overrides: Partial<NounPhraseClientOptions> = {}) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => reply(envelope(["the quick fox"])));
  const options: NounPhraseClientOptions = {
    url: API_URL,
    timeoutMs: 1000,
    retryAttempts: 2,
    retryDelayMs: 0,
    cacheTtlMs: 60_000,
    maxCacheEntries: 3,
    fetch,
    now: () => 0,
    ...overrides,
  };
  return { client: createNounPhraseClient(options), fetch: options.fetch as typeof fetch };
}

describe("createNounPhraseClient", () => {
  it("posts the text as one record and returns its noun phrases", async () => {
    const { client, fetch } = makeClient();

    await expect(client.find("The quick fox jumps.")).resolves.toEqual(["the quick fox"]);

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(API_URL);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      values: [{ recordId: "a1", data: { text: "The quick fox jumps.", language: "en" } }],
    });
  });

  it("returns no phrases for a record without any", async () => {
    const { client } = makeClient({ fetch: vi.fn(async () => reply(envelope([]))) });

    await expect(client.find("Hmm.")).resolves.toEqual([]);
  });

  it("answers repeat text from the cache, ignoring whitespace differences", async () => {
    const { client, fetch } = makeClient();

    await client.find("The quick fox");
    await client.find("  The quick\n  fox ");

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("asks again once the cached answer expires", async () => {
    let clock = 0;
    const { client, fetch } = makeClient({ cacheTtlMs: 1000, now: () => clock });

    await client.find("The quick fox");
    clock = 999;
    await client.find("The quick fox");
    clock = 1000;
    await client.find("The quick fox");

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("drops the least recently used text when the cache is full", async () => {
    const { client, fetch } = makeClient({ maxCacheEntries: 2 });

    await client.find("a");
    await client.find("b");
    await client.find("a");
    await client.find("c");
    expect(fetch).toHaveBeenCalledTimes(3);

    await client.find("a");
    expect(fetch).toHaveBeenCalledTimes(3);
    await client.find("b");
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("shares one request between concurrent lookups of the same text", async () => {
    const { client, fetch } = makeClient();

    const results = await Promise.all([client.find("The quick fox"), client.find("The quick fox")]);

    expect(results).toEqual([["the quick fox"], ["the quick fox"]]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries a network error, then succeeds", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(reply(envelope(["fox"])));
    const { client } = makeClient({ fetch });

    await expect(client.find("fox")).resolves.toEqual(["fox"]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("retries a 5xx reply but not a 4xx one", async () => {
    const flaky = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(reply({}, 503, "Service Unavailable"))
      .mockResolvedValueOnce(reply(envelope(["fox"])));
    const rejecting = vi.fn<typeof globalThis.fetch>(async () => reply({}, 400, "Bad Request"));

    await expect(makeClient({ fetch: flaky }).client.find("fox")).resolves.toEqual(["fox"]);
    await expect(makeClient({ fetch: rejecting }).client.find("fox")).rejects.toThrow("HTTP 400: Bad Request");
    expect(rejecting).toHaveBeenCalledTimes(1);
  });

  it("gives up after the configured number of retries", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => {
      throw new TypeError("Failed to fetch");
    });
    const { client } = makeClient({ fetch, retryAttempts: 2 });

    await expect(client.find("fox")).rejects.toThrow("Failed to fetch");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("times out a request that takes too long", async () => {
    const hanging = vi.fn<typeof globalThis.fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    const { client } = makeClient({ fetch: hanging, timeoutMs: 10, retryAttempts: 1 });

    await expect(client.find("fox")).rejects.toThrow("NLP API timed out after 10 ms");
    expect(hanging).toHaveBeenCalledTimes(2);
  });

  it("rejects with the record's own errors", async () => {
    const { client } = makeClient({ fetch: vi.fn(async () => reply(envelope([], [{ message: "text too long" }]))) });

    await expect(client.find("fox")).rejects.toThrow("text too long");
  });

  it("does not cache a failure", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(reply({}, 400, "Bad Request"))
      .mockResolvedValueOnce(reply(envelope(["fox"])));
    const { client } = makeClient({ fetch });

    await expect(client.find("fox")).rejects.toThrow("HTTP 400");
    await expect(client.find("fox")).resolves.toEqual(["fox"]);
  });
});
