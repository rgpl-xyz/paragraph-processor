import { highlightPhrases } from "./highlight";

export interface OverlayDeps {
  findNounPhrases(text: string): Promise<string[]>;
  isNlpEnabled(): Promise<boolean>;
}

type OverlayState = "hidden" | "peeking" | "pinned";
type LookupState = "idle" | "off" | "loading" | "done" | "failed";

interface Card {
  host: HTMLElement;
  root: HTMLElement;
  tab: HTMLElement;
  pin: HTMLButtonElement;
  sheet: HTMLElement;
  stubCount: HTMLElement;
  stubLabel: HTMLElement;
  message: HTMLElement;
  status: HTMLElement;
  retry: HTMLButtonElement;
  copy: HTMLElement;
}

// What the pinned sheet shows: its stub on the top rule, then a message or the copy
interface SheetView {
  count?: number;
  label: string;
  message?: string;
  failed?: boolean;
}

// Below this much room above the paragraph the tab would cover the previous block's text,
// so it moves inside the paragraph's top-right corner instead.
const MIN_ROOM_ABOVE = 16;

// The tab sits above the paragraph's top-right corner, so hovering never moves the page.
// Pinned, a divider sheet joins the page flow under the text, so it never covers the next
// paragraph. Ink marks what you click; yellow marks what you read. Every visual rule lives
// here; the host element only gets inline resets.
const CARD_CSS = `
  .card {
    --ink: #1a1c23;
    --ink-soft: #5b5d64;
    --paper: #fffdf5;
    --marker: #ffd23f;
    --rule: rgba(26, 28, 35, 0.3);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: var(--ink);
  }

  [hidden] {
    display: none !important;
  }

  .tab,
  .stub {
    display: flex;
    align-items: center;
    white-space: nowrap;
    line-height: 1;
  }

  .tab {
    position: absolute;
    right: 0;
    bottom: 100%;
    z-index: 1000;
    align-items: stretch;
    height: 20px;
    background: var(--ink);
    color: var(--paper);
    /* Keeps the ink tab visible on dark pages */
    box-shadow: 0 0 0 1px rgba(255, 253, 245, 0.85);
    animation: tab-in 120ms ease-out;
  }

  .tab.inside {
    top: 0;
    bottom: auto;
  }

  .count {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 0 8px;
  }

  .mark {
    color: var(--marker);
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    font-size: 13px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .label {
    font-size: 10px;
    font-weight: 400;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  button {
    margin: 0;
    padding: 0 9px;
    border: 0;
    background: var(--ink);
    color: var(--paper);
    font: inherit;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    cursor: pointer;
  }

  button:hover {
    background: #3a3d48;
  }

  button:focus-visible {
    outline: 2px solid var(--marker);
    outline-offset: -2px;
  }

  .pin {
    border-left: 1px solid rgba(255, 253, 245, 0.25);
  }

  .card[data-state="pinned"] .pin {
    border-left-color: transparent;
    background: var(--marker);
    color: var(--ink);
  }

  .card[data-state="pinned"] .pin:hover {
    background: #ffe27a;
  }

  .card[data-state="pinned"] .pin:focus-visible {
    outline-color: var(--ink);
  }

  .body {
    display: grid;
    grid-template-rows: 0fr;
    visibility: hidden;
    transition: grid-template-rows 180ms ease-out, visibility 0s linear 180ms;
  }

  .card[data-state="pinned"] .body {
    grid-template-rows: 1fr;
    visibility: visible;
    transition: grid-template-rows 180ms ease-out;
  }

  .fold {
    min-height: 0;
    overflow: hidden;
  }

  /* A divider sheet: a top rule carrying a stub, a dashed bottom rule. The bottom margin
     keeps the next paragraph's tab clear of it. */
  .sheet {
    position: relative;
    margin: 30px 0 20px;
    border-top: 2px dashed var(--ink);
    border-bottom: 1px dashed var(--rule);
    background: var(--paper);
  }

  .sheet.found {
    border-top-style: solid;
  }

  .stub {
    position: absolute;
    right: 0;
    bottom: 100%;
    gap: 5px;
    height: 20px;
    padding: 0 8px;
    border: 1px solid var(--ink);
    border-bottom: 0;
    background: var(--paper);
  }

  .sheet.found .stub {
    border-color: var(--marker);
    background: var(--marker);
  }

  .message {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 12px;
  }

  .status {
    flex: 1;
    font-size: 12px;
    line-height: 1.45;
    color: var(--ink-soft);
  }

  .status.error {
    color: var(--ink);
  }

  .retry {
    height: 20px;
  }

  .copy {
    padding: 10px 12px 12px;
    color: var(--ink);
  }

  .highlight {
    background: linear-gradient(to top, var(--marker) 0 46%, transparent 46%);
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
    padding: 0 1px;
  }

  @keyframes tab-in {
    from {
      opacity: 0;
      transform: translateY(3px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tab {
      animation: none;
    }

    .body,
    .card[data-state="pinned"] .body {
      transition: none;
    }
  }
`;

const POSITIONED = new Set(["relative", "absolute", "fixed", "sticky"]);
const COPIED_FONT_PROPERTIES = ["fontFamily", "fontSize", "fontStyle", "fontWeight", "lineHeight", "letterSpacing", "wordSpacing"] as const;

// Gives one paragraph its index tab: its word count and a pin. Pinning keeps the tab and
// unfolds a sheet under the paragraph with, when NLP is on, a copy of the paragraph whose
// noun phrases are highlighted, looked up once per paragraph. Built on first hover.
export function attachOverlay(paragraph: HTMLElement, deps: OverlayDeps): void {
  let card: Card | null = null;
  let state: OverlayState = "hidden";
  let lookup: LookupState = "idle";
  let phraseCount = 0;

  const render = () => {
    if (!card) return;
    card.host.style.display = state === "hidden" ? "none" : "block";
    card.root.dataset.state = state;
    card.pin.textContent = state === "pinned" ? "Unpin" : "Pin";
    renderSheet(card, lookup, phraseCount);
  };

  const setState = (next: OverlayState) => {
    const appearing = state === "hidden";
    state = next;
    card ??= buildCard(paragraph, togglePin, () => {
      if (card) void findAndHighlight(card);
    });
    // Measured each time it appears: the page around the paragraph may have changed
    if (appearing) card.tab.classList.toggle("inside", roomAbove(paragraph) < MIN_ROOM_ABOVE);
    render();
  };

  const togglePin = () => {
    setState(state === "pinned" ? "peeking" : "pinned");
    if (state === "pinned" && card) void findAndHighlight(card);
  };

  const findAndHighlight = async (current: Card) => {
    if (lookup === "loading" || lookup === "done") return;
    lookup = "loading";
    try {
      if (!(await deps.isNlpEnabled())) {
        lookup = "off";
        return;
      }
      render();
      const phrases = await deps.findNounPhrases(current.copy.textContent ?? "");
      highlightPhrases(current.copy, phrases);
      phraseCount = new Set(phrases.map((phrase) => phrase.trim().toLowerCase()).filter(Boolean)).size;
      lookup = "done";
    } catch (error) {
      console.error("Noun phrase lookup failed:", error);
      lookup = "failed";
    } finally {
      render();
    }
  };

  paragraph.addEventListener("mouseenter", () => {
    if (state === "hidden") setState("peeking");
  });
  paragraph.addEventListener("mouseleave", () => {
    if (state === "peeking") setState("hidden");
  });
}

function sheetView(lookup: LookupState, phraseCount: number): SheetView | null {
  switch (lookup) {
    case "idle":
      return null;
    case "loading":
      return { label: "Finding…" };
    case "off":
      return { label: "Off", message: "Highlighting is off. Turn it on from the extension’s toolbar button." };
    case "failed":
      return { label: "Failed", message: "Couldn’t get noun phrases.", failed: true };
    case "done":
      return { count: phraseCount, label: phraseCount === 1 ? "noun phrase" : "noun phrases" };
  }
}

function renderSheet(card: Card, lookup: LookupState, phraseCount: number) {
  const view = sheetView(lookup, phraseCount);
  const found = lookup === "done" && phraseCount > 0;
  card.sheet.hidden = view === null;
  card.sheet.classList.toggle("found", found);
  card.stubCount.hidden = view?.count === undefined;
  card.stubCount.textContent = String(view?.count ?? "");
  card.stubLabel.textContent = view?.label ?? "";
  card.status.textContent = view?.message ?? "";
  card.status.classList.toggle("error", view?.failed === true);
  card.message.hidden = view?.message === undefined;
  card.status.hidden = view?.message === undefined;
  card.retry.hidden = view?.failed !== true;
  card.copy.hidden = !found;
}

function roomAbove(paragraph: HTMLElement): number {
  const previous = paragraph.previousElementSibling;
  if (!previous) return Infinity;
  return paragraph.getBoundingClientRect().top - previous.getBoundingClientRect().bottom;
}

function buildCard(paragraph: HTMLElement, onPin: () => void, onRetry: () => void): Card {
  const host = document.createElement("div");
  host.dataset.paragraphOverlay = "";
  // Inline, so page stylesheets can't restyle the host or leak in through inheritance
  host.style.cssText = "all: initial; display: none; position: static;";

  const copy = createElement("div", "copy");
  copy.innerHTML = paragraph.innerHTML;
  const computed = getComputedStyle(paragraph);
  for (const property of COPIED_FONT_PROPERTIES) copy.style[property] = computed[property];

  const { tab, pin } = buildTab(countWords(copy.textContent ?? ""), onPin);
  const { sheet, stubCount, stubLabel, message, status, retry } = buildSheet(copy, onRetry);
  const fold = createElement("div", "fold");
  fold.append(sheet);
  const body = createElement("div", "body");
  body.append(fold);
  const root = createElement("div", "card");
  root.append(tab, body);
  const style = document.createElement("style");
  style.textContent = CARD_CSS;
  host.attachShadow({ mode: "open" }).append(style, root);

  if (!POSITIONED.has(computed.position)) {
    paragraph.style.position = "relative";
  }
  paragraph.append(host);
  return { host, root, tab, pin, sheet, stubCount, stubLabel, message, status, retry, copy };
}

function buildTab(words: number, onPin: () => void) {
  const mark = createElement("span", "mark", "¶");
  mark.setAttribute("aria-hidden", "true");
  const count = createElement("span", "count");
  count.append(mark, createElement("strong", "", String(words)), createElement("span", "label", words === 1 ? "word" : "words"));

  const pin = createButton("pin", "Pin", onPin);
  const tab = createElement("div", "tab");
  tab.append(count, pin);
  return { tab, pin };
}

function buildSheet(copy: HTMLElement, onRetry: () => void) {
  const stubCount = createElement("strong", "");
  const stubLabel = createElement("span", "label");
  const stub = createElement("div", "stub");
  stub.setAttribute("aria-live", "polite");
  stub.append(stubCount, stubLabel);

  const status = createElement("div", "status");
  status.setAttribute("role", "status");
  const retry = createButton("retry", "Retry", onRetry);
  const message = createElement("div", "message");
  message.append(status, retry);

  const sheet = createElement("div", "sheet");
  sheet.append(stub, message, copy);
  return { sheet, stubCount, stubLabel, message, status, retry };
}

function createButton(className: string, text: string, onClick: () => void) {
  const button = createElement("button", className, text);
  button.type = "button";
  button.addEventListener("click", (event) => {
    // The paragraph may sit inside a link or a clickable card
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
}

function createElement<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
}
