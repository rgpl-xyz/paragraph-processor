import { describe, expect, it, vi } from "vitest";
import { FIND_NOUN_PHRASES } from "../shared/messages";
import { findNounPhrases } from "./noun-phrases";

function stubSendMessage(reply: (message: unknown) => unknown) {
  const sendMessage = vi.fn(reply);
  vi.stubGlobal("chrome", { runtime: { sendMessage } });
  return sendMessage;
}

describe("findNounPhrases", () => {
  it("asks the background worker for the text's noun phrases", async () => {
    const sendMessage = stubSendMessage(async () => ({ ok: true, phrases: ["the quick fox"] }));

    await expect(findNounPhrases("The quick fox jumps.")).resolves.toEqual(["the quick fox"]);
    expect(sendMessage).toHaveBeenCalledWith({ action: FIND_NOUN_PHRASES, text: "The quick fox jumps." });
  });

  it("rejects with the worker's error when the lookup fails", async () => {
    stubSendMessage(async () => ({ ok: false, error: "HTTP 503: Service Unavailable" }));

    await expect(findNounPhrases("text")).rejects.toThrow("HTTP 503: Service Unavailable");
  });

  it("rejects when the worker sends no reply", async () => {
    stubSendMessage(async () => undefined);

    await expect(findNounPhrases("text")).rejects.toThrow(/no reply/i);
  });

  it("rejects instead of throwing when the extension was reloaded under the page", async () => {
    stubSendMessage(() => {
      throw new Error("Extension context invalidated.");
    });

    await expect(findNounPhrases("text")).rejects.toThrow("Extension context invalidated.");
  });
});
