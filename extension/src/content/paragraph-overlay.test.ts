import { afterEach, describe, expect, it, vi } from "vitest";
import { attachOverlay, OverlayDeps } from "./paragraph-overlay";

const TEXT = "Our mobile application syncs to the data center.";

function makeParagraph(html = TEXT): HTMLParagraphElement {
  const paragraph = document.createElement("p");
  paragraph.innerHTML = html;
  document.body.append(paragraph);
  return paragraph;
}

function makeDeps(overrides: Partial<OverlayDeps> = {}): OverlayDeps {
  return {
    findNounPhrases: vi.fn(async () => ["mobile application"]),
    isNlpEnabled: vi.fn(async () => true),
    ...overrides,
  };
}

const overlayOf = (paragraph: HTMLElement) => paragraph.querySelector<HTMLElement>("[data-paragraph-overlay]");
const shadowOf = (paragraph: HTMLElement) => overlayOf(paragraph)!.shadowRoot!;
const pinButtonOf = (paragraph: HTMLElement) => shadowOf(paragraph).querySelector<HTMLButtonElement>("button")!;
const highlightsOf = (paragraph: HTMLElement) =>
  [...shadowOf(paragraph).querySelectorAll(".highlight")].map((span) => span.textContent);
const statusOf = (paragraph: HTMLElement) => shadowOf(paragraph).querySelector<HTMLElement>("[role=status]")!;
// Text nodes joined by spaces, as they read on screen; textContent runs adjacent labels together
const textOf = (paragraph: HTMLElement) => {
  const walker = document.createTreeWalker(shadowOf(paragraph), NodeFilter.SHOW_TEXT);
  const words: string[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement?.tagName !== "STYLE") words.push(node.textContent ?? "");
  }
  return words.join(" ");
};
const isShown = (paragraph: HTMLElement) => overlayOf(paragraph)!.style.display !== "none";
const hover = (paragraph: HTMLElement) => paragraph.dispatchEvent(new MouseEvent("mouseenter"));
const leave = (paragraph: HTMLElement) => paragraph.dispatchEvent(new MouseEvent("mouseleave"));
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("attachOverlay", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("adds nothing to the paragraph until it is first hovered", () => {
    const paragraph = makeParagraph();
    attachOverlay(paragraph, makeDeps());

    expect(overlayOf(paragraph)).toBeNull();
    hover(paragraph);
    expect(overlayOf(paragraph)).not.toBeNull();
  });

  it("shows its tab while hovered and hides it on leave", () => {
    const paragraph = makeParagraph();
    attachOverlay(paragraph, makeDeps());

    hover(paragraph);
    expect(isShown(paragraph)).toBe(true);

    leave(paragraph);
    expect(isShown(paragraph)).toBe(false);
  });

  it("shows the word count as soon as it is hovered", () => {
    const paragraph = makeParagraph();
    attachOverlay(paragraph, makeDeps());

    hover(paragraph);

    expect(textOf(paragraph)).toMatch(/\b8\s*words\b/);
  });

  it("stays open after the pointer leaves once pinned", () => {
    const paragraph = makeParagraph();
    attachOverlay(paragraph, makeDeps());

    hover(paragraph);
    pinButtonOf(paragraph).click();
    leave(paragraph);

    expect(isShown(paragraph)).toBe(true);
    expect(pinButtonOf(paragraph).textContent).toBe("Unpin");
  });

  it("offers to pin again once unpinned", () => {
    const paragraph = makeParagraph();
    attachOverlay(paragraph, makeDeps());

    hover(paragraph);
    expect(pinButtonOf(paragraph).textContent).toBe("Pin");
    pinButtonOf(paragraph).click();
    pinButtonOf(paragraph).click();

    expect(pinButtonOf(paragraph).textContent).toBe("Pin");
  });

  it("highlights the noun phrases in a copy that keeps the markup when pinned with NLP on", async () => {
    const paragraph = makeParagraph("Our <b>mobile application</b> syncs to the data center.");
    const deps = makeDeps({ findNounPhrases: vi.fn(async () => ["mobile application", "data center"]) });
    attachOverlay(paragraph, deps);

    hover(paragraph);
    pinButtonOf(paragraph).click();

    await vi.waitFor(() => expect(highlightsOf(paragraph)).toEqual(["mobile application", "data center"]));
    expect(deps.findNounPhrases).toHaveBeenCalledWith(TEXT);
    expect(shadowOf(paragraph).querySelector("b .highlight")?.textContent).toBe("mobile application");
    expect(statusOf(paragraph).hidden).toBe(true);
  });

  it("counts the distinct noun phrases it found", async () => {
    const paragraph = makeParagraph();
    attachOverlay(paragraph, makeDeps({ findNounPhrases: vi.fn(async () => ["data center", "Data center ", "mobile application"]) }));

    hover(paragraph);
    pinButtonOf(paragraph).click();

    await vi.waitFor(() => expect(textOf(paragraph)).toMatch(/\b2\s*noun phrases\b/));
  });

  it("says so when the paragraph has no noun phrases", async () => {
    const paragraph = makeParagraph();
    attachOverlay(paragraph, makeDeps({ findNounPhrases: vi.fn(async () => []) }));

    hover(paragraph);
    pinButtonOf(paragraph).click();

    await vi.waitFor(() => expect(textOf(paragraph)).toMatch(/\b0\s*noun phrases\b/));
  });

  it("retries with one click after a failed lookup", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const paragraph = makeParagraph();
    const findNounPhrases = vi
      .fn<OverlayDeps["findNounPhrases"]>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(["data center"]);
    attachOverlay(paragraph, makeDeps({ findNounPhrases }));

    hover(paragraph);
    pinButtonOf(paragraph).click();
    const retry = await vi.waitFor(() => {
      const button = [...shadowOf(paragraph).querySelectorAll("button")].find((candidate) => candidate.textContent === "Retry");
      expect(button?.hidden).toBe(false);
      return button!;
    });
    retry.click();

    await vi.waitFor(() => expect(highlightsOf(paragraph)).toEqual(["data center"]));
    expect(retry.hidden).toBe(true);
    expect(findNounPhrases).toHaveBeenCalledTimes(2);
  });

  it("looks the phrases up once however often it is pinned", async () => {
    const paragraph = makeParagraph();
    const deps = makeDeps();
    attachOverlay(paragraph, deps);

    hover(paragraph);
    const pin = pinButtonOf(paragraph);
    pin.click();
    pin.click();
    pin.click();
    await vi.waitFor(() => expect(highlightsOf(paragraph)).toHaveLength(1));
    pin.click();
    pin.click();
    await flush();

    expect(deps.findNounPhrases).toHaveBeenCalledTimes(1);
    expect(highlightsOf(paragraph)).toHaveLength(1);
  });

  it("skips the lookup and says how to turn it on when NLP is off", async () => {
    const paragraph = makeParagraph();
    const deps = makeDeps({ isNlpEnabled: vi.fn(async () => false) });
    attachOverlay(paragraph, deps);

    hover(paragraph);
    pinButtonOf(paragraph).click();
    await flush();

    expect(deps.findNounPhrases).not.toHaveBeenCalled();
    expect(statusOf(paragraph).hidden).toBe(false);
    expect(statusOf(paragraph).textContent).toMatch(/highlighting is off.*toolbar button/i);
  });

  it("looks the phrases up on a later pin once NLP is turned on", async () => {
    const paragraph = makeParagraph();
    const isNlpEnabled = vi.fn<OverlayDeps["isNlpEnabled"]>().mockResolvedValueOnce(false).mockResolvedValue(true);
    const deps = makeDeps({ isNlpEnabled });
    attachOverlay(paragraph, deps);

    hover(paragraph);
    const pin = pinButtonOf(paragraph);
    pin.click();
    await flush();
    pin.click();
    pin.click();

    await vi.waitFor(() => expect(highlightsOf(paragraph)).toEqual(["mobile application"]));
    expect(deps.findNounPhrases).toHaveBeenCalledTimes(1);
  });

  it("shows one error after a failed lookup and retries on the next pin", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const paragraph = makeParagraph();
    const findNounPhrases = vi
      .fn<OverlayDeps["findNounPhrases"]>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(["data center"]);
    attachOverlay(paragraph, makeDeps({ findNounPhrases }));

    hover(paragraph);
    const pin = pinButtonOf(paragraph);
    pin.click();
    await vi.waitFor(() => expect(statusOf(paragraph).hidden).toBe(false));
    expect(shadowOf(paragraph).querySelectorAll("[role=status]")).toHaveLength(1);

    pin.click();
    pin.click();
    await vi.waitFor(() => expect(highlightsOf(paragraph)).toEqual(["data center"]));
    expect(statusOf(paragraph).hidden).toBe(true);
    expect(findNounPhrases).toHaveBeenCalledTimes(2);
  });

  it("keeps the pin click from reaching the page", () => {
    const link = document.createElement("a");
    link.href = "#elsewhere";
    const onPageClick = vi.fn();
    link.addEventListener("click", onPageClick);
    const paragraph = makeParagraph();
    link.append(paragraph);
    document.body.append(link);
    attachOverlay(paragraph, makeDeps());

    hover(paragraph);
    pinButtonOf(paragraph).click();

    expect(onPageClick).not.toHaveBeenCalled();
  });

  it("positions a static paragraph but leaves a positioned one alone", () => {
    const plain = makeParagraph();
    const absolute = makeParagraph();
    absolute.style.position = "absolute";
    attachOverlay(plain, makeDeps());
    attachOverlay(absolute, makeDeps());

    hover(plain);
    hover(absolute);

    expect(plain.style.position).toBe("relative");
    expect(absolute.style.position).toBe("absolute");
  });
});
