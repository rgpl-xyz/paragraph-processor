import { findNounPhrases } from "./noun-phrases";

// Function to count words in a given text
function countWords(text: string) {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Function to create and return shadow DOM styles as a string
function createShadowStyles() {
  return `
    .shadow-container {
      position: absolute;
      top: 0;
      left: 0;
      margin-top: 0;
      border: 1px solid #ddd;
      padding: 5px;
      background-color: #f0f0f0;
      border-radius: 5px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      display: none;
      width: 100%;
      box-sizing: border-box;
      z-index: 1000;
    }

    .shadow-host {
      overflow: auto;
    }

    .shadow-content {
      color: #333;
      background-color: #c8c8c8;
      padding: 5px;
    }

    .action-container {
      position: relative;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      font-size: 12px;
      color: #212121;
      background-color: #fff;
    }

    .pushpin-button {
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 15px;
      margin-right: 5px;
      transform: rotate(45deg);
    }

    .word-counter {
      margin-right: 5px;
      display: none;
    }

    .action-title {
       margin-right: auto;
       margin-left: 5px;
    }

    .highlight {
      text-decoration: underline;
      text-decoration-style: wavy;
      text-decoration-color: red;
    }
  `;
}

// Shared styles element - created once and cloned
let sharedStylesElement: HTMLStyleElement | null = null;

function getSharedStylesElement(): HTMLStyleElement {
  if (!sharedStylesElement) {
    sharedStylesElement = document.createElement('style');
    sharedStylesElement.textContent = createShadowStyles();
  }
  return sharedStylesElement.cloneNode(true) as HTMLStyleElement;
}

// Function to process a single paragraph with lazy shadow DOM creation
function processParagraph(paragraph: HTMLElement) {
  // Only add hover listeners initially - create shadow DOM on first hover
  let shadowContainer: HTMLElement | null = null;
  let isPinned = false;
  let isInitialized = false;

  const initializeShadowDOM = () => {
    if (isInitialized) return;
    
    // Create a container for the shadow DOM content
    shadowContainer = createShadowContainer(paragraph);

    // Create a shadow host
    const shadowHost = createShadowHost(paragraph);

    // Append shadowHost to shadowContainer
    shadowContainer.appendChild(shadowHost);

    // Attach shadow DOM to the shadow host
    const shadowRoot = shadowHost.attachShadow({ mode: "open" });

    // Use shared styles instead of creating new ones
    const style = getSharedStylesElement();
    shadowRoot.appendChild(style);

    // Create action title for the action container
    const actionTitle = createActionTitle();

    // Create a container for the action container
    const actionContainer = createActionContainer();

    // Create pushpin button
    const pushpinButton = createPushpinButton();

    // Create word counter element
    const wordCounter = createWordCounter(paragraph);

    // Add the "cloned" paragraph content to the shadow DOM
    const shadowContent = createParagraphShadowContent(paragraph);

    // Toggle pinned state on click
    pushpinButton.addEventListener("click", async () => {
      isPinned = !isPinned;
      
      if (isPinned) {
        shadowContainer!.style.display = "block";
        wordCounter.style.display = "block";
        pushpinButton.style.transform = "rotate(0deg) translate(0, -9%)";

        const useNLP = await getUseNLPFlag();
        if (useNLP) {
          // Send the paragraph content to the background script when pinned
          callNlpApi(paragraph, shadowContent);
        }

      } else {
        shadowContainer!.style.display = "none";
        wordCounter.style.display = "none";
        pushpinButton.style.transform = "rotate(45deg)"; // change "unpinned" icon
      }
    });

    // Append actions to actionContainer
    actionContainer.appendChild(actionTitle);
    actionContainer.appendChild(wordCounter);
    actionContainer.appendChild(pushpinButton);

    // Append actionContainer to shadowRoot
    shadowRoot.appendChild(actionContainer);
    shadowRoot.appendChild(shadowContent);

    // Append shadowContainer to the paragraph
    paragraph.style.position = "relative";
    paragraph.appendChild(shadowContainer);

    isInitialized = true;
  };

  // Show shadowContainer on hover if not pinned
  paragraph.addEventListener("mouseover", () => {
    if (!isPinned) {
      if (!isInitialized) {
        initializeShadowDOM();
      }
      shadowContainer!.style.display = "block";
    }
  });

  // Hide shadowContainer when mouse leaves if not pinned
  paragraph.addEventListener("mouseout", () => {
    if (!isPinned && isInitialized) {
      shadowContainer!.style.display = "none";
    }
  });

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

// Cache for regex patterns to avoid recreating them
const regexCache = new Map<string, RegExp>();

// Function to safely highlight text nodes without breaking HTML structure
function highlightTextNodes(element: HTMLElement, regex: RegExp) {
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

function callNlpApi(paragraph: HTMLElement, shadowContent: HTMLDivElement) {
  const content = paragraph.textContent || "";
  
  // Show loading state with unique ID
  const loadingElement = document.createElement('div');
  loadingElement.id = 'nlp-loading';
  loadingElement.style.color = '#666';
  loadingElement.style.fontStyle = 'italic';
  loadingElement.textContent = 'Processing...';
  shadowContent.appendChild(loadingElement);
  
  findNounPhrases(content)
    .then((noun_phrases) => {
      if (noun_phrases.length === 0) {
        const loadingElement = shadowContent.querySelector('#nlp-loading');
        if (loadingElement) {
          loadingElement.remove();
        }
        return;
      }

      // Create cache key for this set of noun phrases
      const cacheKey = noun_phrases.sort().join('|');
      
      // Get or create regex pattern
      let regex = regexCache.get(cacheKey);
      if (!regex) {
        // Create a regular expression that matches any of the noun phrases
        // (case insensitive). We escape any special characters in the phrase
        // so that it can be used as part of a regex.
        const escapedPhrases = noun_phrases.map(phrase => phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        regex = new RegExp(`\\b(${escapedPhrases.join('|')})\\b`, 'gi');
        regexCache.set(cacheKey, regex);
      }

      // Remove loading state
      const loadingElement = shadowContent.querySelector('#nlp-loading');
      if (loadingElement) {
        loadingElement.remove();
      }

      // Apply highlighting to text nodes only to preserve HTML structure
      highlightTextNodes(shadowContent, regex);
    })
    .catch((error: unknown) => {
      console.error("Noun phrase lookup failed:", error);
      // Remove loading state and show user-friendly error
      const loadingElement = shadowContent.querySelector('#nlp-loading');
      if (loadingElement) {
        loadingElement.remove();
      }
      
      const errorElement = document.createElement('div');
      errorElement.style.color = '#ff6b6b';
      errorElement.style.fontStyle = 'italic';
      errorElement.style.fontSize = '12px';
      errorElement.style.padding = '5px';
      errorElement.style.backgroundColor = '#ffe6e6';
      errorElement.style.borderRadius = '3px';
      errorElement.style.marginTop = '5px';
      errorElement.textContent = 'Unable to process text. Please check your connection or try again.';
      shadowContent.appendChild(errorElement);
    });
}

async function getUseNLPFlag(): Promise<boolean> {
  return new Promise((resolve) => {
      chrome.storage.sync.get('useNLP', (data) => {
          resolve(data.useNLP || false);
      });
  });
}

function createActionContainer() {
  const actionContainer = document.createElement("div");
  actionContainer.classList.add("action-container");
  return actionContainer;
}

function createPushpinButton() {
  const pushpinButton = document.createElement("button");
  pushpinButton.classList.add("pushpin-button");
  pushpinButton.innerHTML = "📌";

  return pushpinButton;
}

function createActionTitle() {
  const actionTitle = document.createElement("span");
  actionTitle.classList.add("action-title");
  actionTitle.textContent = 'Pin to process text';

  return actionTitle;
}

function createWordCounter(paragraph: HTMLElement) {
  const wordCounter = document.createElement("span");
  wordCounter.classList.add("word-counter");

  const wordCount = countWords(paragraph.textContent || "");
  wordCounter.textContent = `Words: ${wordCount}`;

  return wordCounter;
}

function createParagraphShadowContent(paragraph: HTMLElement) {
  const shadowContent = document.createElement("div");
  shadowContent.classList.add("shadow-content");
  shadowContent.style.maxHeight = (paragraph.getClientRects()[0]?.height || 150) + "px";
  shadowContent.style.overflow = "auto";
  shadowContent.innerHTML = paragraph.innerHTML;

  return shadowContent;
}

function createShadowHost(paragraph: HTMLElement) {
  const shadowHost = document.createElement("div");
  shadowHost.classList.add("shadow-host");

  return shadowHost;
}

function createShadowContainer(paragraph: HTMLElement) {
  const shadowContainer = document.createElement("div");
  shadowContainer.classList.add("shadow-container");
  shadowContainer.style.position = "absolute";
  shadowContainer.style.top = "0";
  shadowContainer.style.left = "0";
  shadowContainer.style.marginTop = "0";
  shadowContainer.style.border = "1px solid #ddd";
  shadowContainer.style.padding = "5px";
  shadowContainer.style.backgroundColor = "#f0f0f0";
  shadowContainer.style.borderRadius = "5px";
  shadowContainer.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
  shadowContainer.style.display = "none"; // Hidden by default
  shadowContainer.style.zIndex = paragraph.style.zIndex + 1; // let's not get crazy with z-index
  shadowContainer.style.width = "100%";
  shadowContainer.style.boxSizing = "border-box";

  return shadowContainer;
}