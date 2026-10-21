// Cache for regex patterns to avoid recreating them
const regexCache = new Map<string, RegExp>();

// Wraps each occurrence of the phrases in `root`'s text in <span class="highlight">
export function highlightPhrases(root: Node, phrases: string[]): void {
  if (phrases.length === 0) return;

  // Create cache key for this set of noun phrases
  const cacheKey = phrases.sort().join('|');

  // Get or create regex pattern
  let regex = regexCache.get(cacheKey);
  if (!regex) {
    // Create a regular expression that matches any of the noun phrases
    // (case insensitive). We escape any special characters in the phrase
    // so that it can be used as part of a regex.
    const escapedPhrases = phrases.map(phrase => phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    regex = new RegExp(`\\b(${escapedPhrases.join('|')})\\b`, 'gi');
    regexCache.set(cacheKey, regex);
  }

  highlightTextNodes(root, regex);
}

// Function to safely highlight text nodes without breaking HTML structure
function highlightTextNodes(element: Node, regex: RegExp) {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes: Text[] = [];
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node as Text);
  }

  textNodes.forEach(textNode => {
    const text = textNode.textContent || '';
    const matches = [...text.matchAll(regex)];

    if (matches.length > 0) {
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      matches.forEach(match => {
        const matchStart = match.index!;
        const matchEnd = matchStart + match[0].length;

        if (matchStart > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, matchStart)));
        }

        const highlight = document.createElement('span');
        highlight.className = 'highlight';
        highlight.textContent = match[0];
        fragment.appendChild(highlight);

        lastIndex = matchEnd;
      });

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      textNode.parentNode?.replaceChild(fragment, textNode);
    }
  });
}
