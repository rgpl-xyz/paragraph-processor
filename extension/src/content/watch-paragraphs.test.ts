import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchParagraphs } from "./watch-paragraphs";

const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

function addParagraphs(parent: HTMLElement, count: number): HTMLParagraphElement[] {
  return Array.from({ length: count }, (_, index) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = `Paragraph ${index + 1}`;
    parent.append(paragraph);
    return paragraph;
  });
}

const handedOver = (onParagraph: ReturnType<typeof vi.fn>) => onParagraph.mock.calls.map(([paragraph]) => paragraph);

describe("watchParagraphs", () => {
  let stop = () => {};

  beforeEach(() => {
    // jsdom has no idle callbacks; defer like a browser does so batches really wait
    vi.stubGlobal("requestIdleCallback", (callback: IdleRequestCallback) =>
      setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 5),
    );
  });

  afterEach(() => {
    stop();
    document.body.innerHTML = "";
  });

  it("hands over the paragraphs already on the page", async () => {
    const existing = addParagraphs(document.body, 3);
    const onParagraph = vi.fn();

    stop = watchParagraphs(document.body, onParagraph);

    await vi.waitFor(() => expect(onParagraph).toHaveBeenCalledTimes(3));
    expect(handedOver(onParagraph)).toEqual(existing);
  });

  it("hands over paragraphs added later, including nested ones", async () => {
    const onParagraph = vi.fn();
    stop = watchParagraphs(document.body, onParagraph);

    const section = document.createElement("section");
    const nested = addParagraphs(section, 2);
    document.body.append(section);
    const direct = addParagraphs(document.body, 1);

    await vi.waitFor(() => expect(onParagraph).toHaveBeenCalledTimes(3));
    expect(new Set(handedOver(onParagraph))).toEqual(new Set([...nested, ...direct]));
  });

  it("hands each paragraph over once when the page keeps changing before the idle pass", async () => {
    addParagraphs(document.body, 50);
    const onParagraph = vi.fn();
    stop = watchParagraphs(document.body, onParagraph);

    for (let mutation = 0; mutation < 10; mutation++) {
      document.body.append(document.createElement("div"));
      await Promise.resolve();
    }

    await vi.waitFor(() => expect(onParagraph.mock.calls.length).toBeGreaterThanOrEqual(50));
    await settle();
    expect(onParagraph).toHaveBeenCalledTimes(50);
  });

  it("does not hand over a paragraph again when it moves", async () => {
    const [paragraph] = addParagraphs(document.body, 1);
    const onParagraph = vi.fn();
    stop = watchParagraphs(document.body, onParagraph);
    await vi.waitFor(() => expect(onParagraph).toHaveBeenCalledTimes(1));

    const section = document.createElement("section");
    document.body.append(section);
    section.append(paragraph);
    await settle();

    expect(onParagraph).toHaveBeenCalledTimes(1);
  });

  it("skips a paragraph removed before its turn", async () => {
    const [kept, removed] = addParagraphs(document.body, 2);
    const onParagraph = vi.fn();

    stop = watchParagraphs(document.body, onParagraph);
    removed.remove();
    await settle();

    expect(handedOver(onParagraph)).toEqual([kept]);
  });

  it("hands over a paragraph that was removed before its turn and later put back", async () => {
    const [paragraph] = addParagraphs(document.body, 1);
    const onParagraph = vi.fn();

    stop = watchParagraphs(document.body, onParagraph);
    paragraph.remove();
    await settle();
    document.body.append(paragraph);

    await vi.waitFor(() => expect(handedOver(onParagraph)).toEqual([paragraph]));
  });

  it("keeps going when the handler throws for one paragraph", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const [first, second] = addParagraphs(document.body, 2);
    const onParagraph = vi.fn((paragraph: HTMLElement) => {
      if (paragraph === first) throw new Error("odd page markup");
    });

    stop = watchParagraphs(document.body, onParagraph);
    await vi.waitFor(() => expect(onParagraph).toHaveBeenCalledWith(second));
    const [later] = addParagraphs(document.body, 1);

    await vi.waitFor(() => expect(onParagraph).toHaveBeenCalledWith(later));
  });

  it("hands over nothing more once stopped", async () => {
    addParagraphs(document.body, 2);
    const onParagraph = vi.fn();

    watchParagraphs(document.body, onParagraph)();
    addParagraphs(document.body, 2);
    await settle();

    expect(onParagraph).not.toHaveBeenCalled();
  });
});
