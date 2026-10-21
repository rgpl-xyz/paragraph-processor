import { findNounPhrases } from "./noun-phrases";
import { attachOverlay, OverlayDeps } from "./paragraph-overlay";

const overlayDeps: OverlayDeps = { findNounPhrases, isNlpEnabled: getUseNLPFlag };

// Function to give a single paragraph its overlay
function processParagraph(paragraph: HTMLElement) {
  attachOverlay(paragraph, overlayDeps);

  // Add attribute to mark paragraph as processed
  paragraph.setAttribute("data-shadow-attached", "true");
}

// Function to create and attach shadow DOM for each paragraph
function attachShadowToParagraphs() {
  const paragraphs = document.querySelectorAll<HTMLElement>("p:not([data-shadow-attached])");

  if (paragraphs.length === 0) return;

  // Process paragraphs in batches to avoid blocking the UI
  const batchSize = 20; // Increased batch size since we're not creating shadow DOM immediately
  const batches: HTMLElement[][] = [];

  for (let i = 0; i < paragraphs.length; i += batchSize) {
    batches.push(Array.from(paragraphs).slice(i, i + batchSize));
  }

  let currentBatch = 0;

  function processNextBatch() {
    if (currentBatch >= batches.length) return;

    const batch = batches[currentBatch];

    if (typeof window.requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        batch.forEach(processParagraph);
        currentBatch++;
        processNextBatch();
      }, { timeout: 1000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      batch.forEach(processParagraph);
      currentBatch++;
      processNextBatch();
    }
  }

  processNextBatch();
}

// Attach shadow DOM to paragraphs immediately
attachShadowToParagraphs();

// Observe changes to attach shadow DOM dynamically
const observer = new MutationObserver(() => {
  // Only attach shadow DOM to new paragraphs (not already processed)
  attachShadowToParagraphs();
});

observer.observe(document.body, { childList: true, subtree: true });

async function getUseNLPFlag(): Promise<boolean> {
  return new Promise((resolve) => {
      chrome.storage.sync.get('useNLP', (data) => {
          resolve(data.useNLP || false);
      });
  });
}
