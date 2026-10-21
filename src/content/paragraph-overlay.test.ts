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
const textOf = (paragraph: HTMLElement) =>
  [...shadowOf(paragraph).children]
    .filter((element) => element.tagName !== "STYLE")
    .map((element) => element.textContent)
    .join(" ");
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

  it("shows a copy of the paragraph while hovered and hides it on leave", () => {
    const paragraph = makeParagraph("Some <b>bold</b> words.");
    attachOverlay(paragraph, makeDeps());

    hover(paragraph);
    expect(isShown(paragraph)).toBe(true);
    expect(shadowOf(paragraph).querySelector("b")?.textContent).toBe("bold");

    leave(paragraph);
    expect(isShown(paragraph)).toBe(false);
  });

  it("stays open after the pointer leaves once pinned", () => {
    const paragraph = makeParagraph();
    attachOverlay(paragraph, makeDeps());

    hover(paragraph);
    pinButtonOf(paragraph).click();
    leave(paragraph);

    expect(isShown(paragraph)).toBe(true);
    expect(pinButtonOf(paragraph).getAttribute("aria-pressed")).toBe("true");
  });

  it("shows the word count while pinned", () => {
    const paragraph = makeParagraph();
    attachOverlay(paragraph, makeDeps());

    hover(paragraph);
    pinButtonOf(paragraph).click();

    expect(textOf(paragraph)).toMatch(/\b8\b/);
  });

  it("highlights the noun phrases when pinned with NLP on", async () => {
    const paragraph = makeParagraph();
    const deps = makeDeps();
    attachOverlay(paragraph, deps);

    hover(paragraph);
    pinButtonOf(paragraph).click();

    await vi.waitFor(() => expect(highlightsOf(paragraph)).toEqual(["mobile application"]));
    expect(deps.findNounPhrases).toHaveBeenCalledWith(TEXT);
    expect(statusOf(paragraph).hidden).toBe(true);
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

  it("skips the lookup when NLP is off", async () => {
    const paragraph = makeParagraph();
    const deps = makeDeps({ isNlpEnabled: vi.fn(async () => false) });
    attachOverlay(paragraph, deps);

    hover(paragraph);
    pinButtonOf(paragraph).click();
    await flush();

    expect(deps.findNounPhrases).not.toHaveBeenCalled();
    expect(statusOf(paragraph).hidden).toBe(true);
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
