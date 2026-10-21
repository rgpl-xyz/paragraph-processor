const HIGHLIGHT_CLASS = "highlight";

// Text inside these is left alone: existing highlights (so a second run adds nothing) and
// non-rendered text.
const SKIPPED_ANCESTORS = `.${HIGHLIGHT_CLASS}, script, style`;

// Wraps each occurrence of the phrases in `root`'s text in <span class="highlight"> and
// returns how many it added. A longer phrase wins over a phrase it starts with, case is
// ignored, and a phrase only matches as a whole word, judged by Unicode letters, so
// "café" and "C++" match too. Running it twice is harmless.
export function highlightPhrases(root: Node, phrases: readonly string[]): number {
  const pattern = phrasePattern(phrases);
  if (!pattern) return 0;
  return textNodesToSearch(root).reduce((added, node) => added + wrapMatches(node, pattern), 0);
}

function phrasePattern(phrases: readonly string[]): RegExp | null {
  const unique = [...new Set(phrases.map((phrase) => phrase.trim()).filter(Boolean))];
  if (unique.length === 0) return null;

  // Alternation takes the first alternative that matches, so longest goes first
  const alternatives = unique
    .sort((a, b) => b.length - a.length)
    .map((phrase) => escapeRegExp(phrase).replace(/\s+/g, "\\s+"));
  // Lookarounds instead of \b, which is ASCII-only and never fires beside "é" or after "+"
  return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alternatives.join("|")})(?![\\p{L}\\p{N}_])`, "giu");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textNodesToSearch(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest(SKIPPED_ANCESTORS) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push(node as Text);
  }
  return nodes;
}

function wrapMatches(node: Text, pattern: RegExp): number {
  const text = node.data;
  const matches = [...text.matchAll(pattern)];
  if (matches.length === 0) return 0;

  const fragment = document.createDocumentFragment();
  let cursor = 0;
  for (const match of matches) {
    const start = match.index ?? 0;
    if (start > cursor) fragment.append(text.slice(cursor, start));
    const highlight = document.createElement("span");
    highlight.className = HIGHLIGHT_CLASS;
    highlight.textContent = match[0];
    fragment.append(highlight);
    cursor = start + match[0].length;
  }
  if (cursor < text.length) fragment.append(text.slice(cursor));

  node.replaceWith(fragment);
  return matches.length;
}
