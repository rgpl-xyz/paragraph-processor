import { describe, expect, it } from "vitest";
import { FIND_NOUN_PHRASES, isFindNounPhrasesRequest } from "./messages";

describe("isFindNounPhrasesRequest", () => {
  it("accepts a noun phrase request with text", () => {
    expect(isFindNounPhrasesRequest({ action: FIND_NOUN_PHRASES, text: "Some text." })).toBe(true);
  });

  it.each([
    ["another action", { action: "somethingElse", text: "Some text." }],
    ["missing text", { action: FIND_NOUN_PHRASES }],
    ["non-string text", { action: FIND_NOUN_PHRASES, text: 42 }],
    ["null", null],
    ["a string", FIND_NOUN_PHRASES],
  ])("rejects %s", (_label, message) => {
    expect(isFindNounPhrasesRequest(message)).toBe(false);
  });
});
