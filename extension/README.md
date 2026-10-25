# Paragraph Processor extension

A Chrome extension that shows the word count of any paragraph you hover and, when you pin the paragraph, highlights its noun phrases. It's one half of [Paragraph Processor](../README.md); the other half is the spaCy service in [`nlp-api/`](../nlp-api).

Made by [RGPL](https://rgpl.xyz).

![Two pinned paragraphs, each with its word-count tab and a sheet of highlighted noun phrases](images/example.png)

Hover a paragraph and a small tab appears above its top-right corner with the word count and a Pin button. Pin it and a sheet opens under the paragraph: a copy of the text with its noun phrases marked in yellow, and how many there are. Pin as many paragraphs as you like and unpin them when you're done. The tab and sheet live in a shadow DOM, so the page's styles don't reach them and the paragraph's own text is never changed.

## Works with nlp-api

Word counts happen in the browser. Noun phrases come from the service in [`nlp-api/`](../nlp-api), so highlighting needs it running; the [repository README](../README.md) shows how the two fit together. The background worker sends a pinned paragraph as one record in Azure's custom-skill format and gets the record back with its noun phrases. Highlighting is off until you switch it on in the toolbar popup, and only then does any text leave the browser: the text of the paragraphs you pin, sent to the nlp-spacy-api address the extension was built with. [PRIVACY.md](PRIVACY.md) has the details.

## Running it

You need Node 24.22.1 or newer (see `.nvmrc`), Chrome, and the service.

1. Start the service on port 8080, in a container or with Python ([its README](../nlp-api/README.md#running-it) has both):
   ```bash
   cd ../nlp-api
   docker build -t nlp-spacy-api . && docker run -p 8080:8080 nlp-spacy-api
   ```
2. Build the extension, from this folder:
   ```bash
   npm ci
   npm run build    # or `npm run dev` to rebuild on every save
   ```
3. Open `chrome://extensions`, switch on Developer mode, choose Load unpacked and pick the `dist` folder.
4. Click the extension's toolbar button and switch on Noun phrase highlighting. Then hover a paragraph on any page and pin it.

<img src="images/popup-example.png" alt="The toolbar popup with Noun phrase highlighting switched on" width="300">

After a rebuild, press the reload button on the extension's card in `chrome://extensions`.

### Settings

The build reads these from `.env` (copy `.env.example`) or the shell, and bakes them in, so rebuild after changing them. The defaults live in `webpack.config.js`.

| Variable | Default | What it does |
|---|---|---|
| `API_BASE_URL` | `http://localhost:8080` | Where nlp-spacy-api runs; the build also writes this origin into the manifest's `host_permissions` |
| `API_ENDPOINT` | `/noun_phrases` | The route the worker calls |
| `API_TIMEOUT` | `10000` | Milliseconds before a request is abandoned |
| `API_RETRY_ATTEMPTS` | `3` | Retries after a network error, a timeout or a 5xx reply |
| `API_RETRY_DELAY` | `1000` | Milliseconds between retries |
| `CACHE_DURATION` | `300000` | Milliseconds a result stays cached; the cache lives in the background worker, which Chrome stops after about 30 seconds idle |
| `MAX_CACHE_SIZE` | `1000` | How many texts the cache holds |

## Tests

```bash
npm test             # unit tests, Vitest + jsdom
npm run typecheck
npm run e2e          # Playwright; run `npx playwright install chromium` once first
```

The e2e suite builds the extension against a stub of nlp-spacy-api, loads it into Chromium and drives a test article (`e2e/article.html`): the tab, pinning, highlighting, Retry, the popup switch, axe accessibility checks, keyboard use and reduced motion. Neither suite needs the real service.

## How the code is laid out

```
src/
├── content/
│   ├── content.ts             # entry: wires the modules below together
│   ├── watch-paragraphs.ts    # finds each paragraph once, including ones added later
│   ├── paragraph-overlay.ts   # the tab and the pinned sheet
│   ├── highlight.ts           # wraps noun phrases in highlight spans
│   └── noun-phrases.ts        # asks the background worker for a text's noun phrases
├── background/
│   ├── background.ts          # entry: answers the content script's messages
│   └── noun-phrase-client.ts  # calls nlp-spacy-api with caching, retries and timeouts
├── shared/
│   ├── messages.ts            # the message the content script and worker exchange
│   └── settings.ts            # the highlighting switch, in chrome.storage.sync
└── popup/                     # the toolbar popup
e2e/                           # Playwright suite, stub API and test article
```

Each `*.test.ts` file sits next to the module it tests. `findNounPhrases(text)` is the only part of the content script that knows about extension messaging, and it gets back a plain list of phrases; everything about the API, from its record format to retries, stays in the background worker.

`STORE_LISTING.md` holds the draft Chrome Web Store listing.

## License

GPL-3.0-or-later, see [LICENSE](LICENSE).
