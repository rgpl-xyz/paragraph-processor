import { highlightPhrases } from "./highlight";

export interface OverlayDeps {
  findNounPhrases(text: string): Promise<string[]>;
  isNlpEnabled(): Promise<boolean>;
}

type OverlayState = "hidden" | "peeking" | "pinned";
type LookupState = "idle" | "loading" | "done" | "failed";

interface Card {
  host: HTMLElement;
  pin: HTMLButtonElement;
  wordCount: HTMLElement;
  content: HTMLElement;
  status: HTMLElement;
}

// Every visual rule lives in the shadow stylesheet; the host only gets placement.
const CARD_CSS = `
  [hidden] {
    display: none !important;
  }

  .card {
    border: 1px solid #ddd;
    padding: 5px;
    background-color: #f0f0f0;
    border-radius: 5px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    font-size: 12px;
    color: #212121;
    background-color: #fff;
  }

  .title {
    margin-right: auto;
    margin-left: 5px;
  }

  .word-count {
    margin-right: 5px;
  }

  .pin {
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 15px;
    margin-right: 5px;
    transform: rotate(45deg);
  }

  .pin[aria-pressed="true"] {
    transform: rotate(0deg) translate(0, -9%);
  }

  .content {
    color: #333;
    background-color: #c8c8c8;
    padding: 5px;
    overflow: auto;
  }

  .status {
    color: #666;
    font-style: italic;
    font-size: 12px;
    padding: 5px;
  }

  .status.error {
    color: #ff6b6b;
    background-color: #ffe6e6;
    border-radius: 3px;
    margin-top: 5px;
  }

  .highlight {
    text-decoration: underline;
    text-decoration-style: wavy;
    text-decoration-color: red;
  }
`;

const OVERLAY_Z_INDEX = "1000";
const POSITIONED = new Set(["relative", "absolute", "fixed", "sticky"]);

// Gives one paragraph its hover card: a copy of the paragraph with a word count and a pin.
// Hovering shows the card; pinning keeps it open and, with NLP on, highlights the noun
// phrases in the copy, looked up once per paragraph. The card is built on first hover.
export function attachOverlay(paragraph: HTMLElement, deps: OverlayDeps): void {
  let card: Card | null = null;
  let state: OverlayState = "hidden";
  let lookup: LookupState = "idle";

  const setState = (next: OverlayState) => {
    state = next;
    card ??= buildCard(paragraph, togglePin);
    card.host.style.display = state === "hidden" ? "none" : "block";
    card.pin.setAttribute("aria-pressed", String(state === "pinned"));
    card.wordCount.hidden = state !== "pinned";
  };

  const togglePin = () => {
    setState(state === "pinned" ? "peeking" : "pinned");
    if (state === "pinned" && card) void highlightNounPhrases(card);
  };

  const highlightNounPhrases = async (current: Card) => {
    if (lookup === "loading" || lookup === "done") return;
    lookup = "loading";
    try {
      if (!(await deps.isNlpEnabled())) {
        lookup = "idle";
        return;
      }
      showStatus(current, "Processing...");
      highlightPhrases(current.content, await deps.findNounPhrases(current.content.textContent ?? ""));
      lookup = "done";
      showStatus(current, null);
    } catch (error) {
      console.error("Noun phrase lookup failed:", error);
      lookup = "failed";
      showStatus(current, "Unable to process text. Pin again to retry.", "error");
    }
  };

  paragraph.addEventListener("mouseenter", () => {
    if (state === "hidden") setState("peeking");
  });
  paragraph.addEventListener("mouseleave", () => {
    if (state === "peeking") setState("hidden");
  });
}

function buildCard(paragraph: HTMLElement, onPin: () => void): Card {
  const host = document.createElement("div");
  host.dataset.paragraphOverlay = "";
  // Inline, so page stylesheets can't move the card
  Object.assign(host.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    boxSizing: "border-box",
    zIndex: OVERLAY_Z_INDEX,
    display: "none",
  });

  const content = createElement("div", "content");
  content.style.maxHeight = `${paragraph.getClientRects()[0]?.height || 150}px`;
  content.innerHTML = paragraph.innerHTML;

  const pin = createElement("button", "pin", "📌");
  pin.type = "button";
  pin.setAttribute("aria-label", "Pin");
  pin.addEventListener("click", (event) => {
    // The paragraph may sit inside a link or a clickable card
    event.preventDefault();
    event.stopPropagation();
    onPin();
  });

  const wordCount = createElement("span", "word-count", `Words: ${countWords(content.textContent ?? "")}`);
  const status = createElement("div", "status");
  status.setAttribute("role", "status");
  status.hidden = true;

  const actions = createElement("div", "actions");
  actions.append(createElement("span", "title", "Pin to process text"), wordCount, pin);
  const card = createElement("div", "card");
  card.append(actions, content, status);
  const style = document.createElement("style");
  style.textContent = CARD_CSS;
  host.attachShadow({ mode: "open" }).append(style, card);

  if (!POSITIONED.has(getComputedStyle(paragraph).position)) {
    paragraph.style.position = "relative";
  }
  paragraph.append(host);
  return { host, pin, wordCount, content, status };
}

function showStatus(card: Card, message: string | null, tone: "info" | "error" = "info") {
  card.status.hidden = message === null;
  card.status.textContent = message ?? "";
  card.status.classList.toggle("error", tone === "error");
}

function createElement<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
}
