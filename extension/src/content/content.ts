import { getUseNlp } from "../shared/settings";
import { findNounPhrases } from "./noun-phrases";
import { attachOverlay, OverlayDeps } from "./paragraph-overlay";
import { watchParagraphs } from "./watch-paragraphs";

const overlayDeps: OverlayDeps = { findNounPhrases, isNlpEnabled: getUseNlp };

watchParagraphs(document.body, (paragraph) => attachOverlay(paragraph, overlayDeps));
