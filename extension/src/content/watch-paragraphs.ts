const BATCH_SIZE = 20;
const IDLE_TIMEOUT_MS = 1000;

// Hands every <p> under `root` to `onParagraph` exactly once: the ones there now and any
// added later. A paragraph is marked when it is queued, so page changes that arrive before
// the next idle pass can't queue it twice. Work runs in idle time, BATCH_SIZE paragraphs
// per pass. Returns a function that stops watching and drops whatever is still queued.
export function watchParagraphs(root: HTMLElement, onParagraph: (paragraph: HTMLElement) => void): () => void {
  const seen = new WeakSet<Element>();
  const queue: HTMLElement[] = [];
  let passScheduled = false;
  let stopped = false;

  const runPass = () => {
    if (stopped) return;
    for (const paragraph of queue.splice(0, BATCH_SIZE)) {
      if (!paragraph.isConnected) {
        // Removed before its turn: forget it so it's queued again if it comes back
        seen.delete(paragraph);
        continue;
      }
      try {
        onParagraph(paragraph);
      } catch (error) {
        console.error("Couldn't attach to a paragraph:", error);
      }
    }
    passScheduled = queue.length > 0;
    if (passScheduled) whenIdle(runPass);
  };

  const collect = (node: Node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    const paragraphs = [...(element.matches("p") ? [element] : []), ...element.querySelectorAll("p")];
    for (const paragraph of paragraphs) {
      if (seen.has(paragraph)) continue;
      seen.add(paragraph);
      queue.push(paragraph as HTMLElement);
    }
    if (queue.length > 0 && !passScheduled) {
      passScheduled = true;
      whenIdle(runPass);
    }
  };

  // Only added nodes are searched, so a burst of changes never re-scans the whole page
  const observer = new MutationObserver((records) => {
    for (const record of records) record.addedNodes.forEach(collect);
  });
  observer.observe(root, { childList: true, subtree: true });
  collect(root);

  return () => {
    stopped = true;
    observer.disconnect();
    queue.length = 0;
  };
}

function whenIdle(task: () => void) {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(task, { timeout: IDLE_TIMEOUT_MS });
  } else {
    setTimeout(task, 0);
  }
}
