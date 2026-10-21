import { findNounPhrases } from "./noun-phrases";
import { attachOverlay, OverlayDeps } from "./paragraph-overlay";
import { watchParagraphs } from "./watch-paragraphs";

const overlayDeps: OverlayDeps = { findNounPhrases, isNlpEnabled: getUseNLPFlag };

watchParagraphs(document.body, (paragraph) => attachOverlay(paragraph, overlayDeps));

async function getUseNLPFlag(): Promise<boolean> {
  return new Promise((resolve) => {
      chrome.storage.sync.get('useNLP', (data) => {
          resolve(data.useNLP || false);
      });
  });
}
