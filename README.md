# Paragraph Processor Chrome Extension with NLP API Integration

This project is a Chrome extension that processes text from paragraphs on web pages using Natural Language Processing (NLP). It extracts noun phrases from the text and highlights them dynamically using a shadow DOM. The extension provides a user-friendly interface for text analysis and processing, with optional backend API integration for enhanced NLP capabilities.

## Features

- **Word count on hover**: Hovering a paragraph shows a small tab above its top-right corner with the paragraph's word count
- **Pin to process**: Pinning keeps the tab and opens a sheet under the paragraph, without covering the text around it
- **Noun phrase highlighting**: With highlighting on, the sheet shows a copy of the paragraph with its noun phrases marked in highlighter yellow, plus how many it found
- **NLP API Integration**: Fetches the noun phrases from an NLP API through the background worker
- **One setting**: The toolbar popup turns noun phrase highlighting on or off, saved with `chrome.storage.sync`
- **Stays out of the page's way**: The tab and sheet live in a shadow DOM on one added element per paragraph, so page styles don't reach them and the paragraph's own text is never changed

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 22.18.0 as specified in `.nvmrc`) - [Download here](https://nodejs.org/)
- **nvm** (Node Version Manager) - [Installation guide](https://github.com/nvm-sh/nvm#installing-and-updating)
- **npm** (comes with Node.js) or **yarn**
- **Google Chrome** browser
- **Git** for cloning repositories

You can verify your installations by running:
```bash
node --version
npm --version
git --version
nvm --version
```

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/rgpl-xyz/paragraph-processor-chrome.git
cd paragraph-processor-chrome
```

### 2. Install Dependencies

If you're using nvm (Node Version Manager), the project includes a `.nvmrc` file that specifies the required Node.js version:

```bash
# Install and use the correct Node.js version
nvm install
nvm use

# Install dependencies
npm install
```

If you're not using nvm, make sure you have Node.js version 22.18.0 or compatible installed, then run:

```bash
npm install
```

This will install all the required dependencies including:
- TypeScript for type checking
- Webpack for bundling
- Chrome types for development
- Copy webpack plugin for asset management

### 3. Environment Configuration (Optional)

The extension supports environment variables for configuration. This is useful for different environments (development, staging, production).

#### Setup Environment Variables:

1. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file** with your configuration:
   ```bash
   # API Configuration
   API_BASE_URL=http://localhost:8080
   API_ENDPOINT=/noun_phrases
   API_TIMEOUT=10000
   API_RETRY_ATTEMPTS=3
   API_RETRY_DELAY=1000

   # Cache Configuration
   CACHE_DURATION=300000
   MAX_CACHE_SIZE=1000
   ```

3. **Environment Variables Reference**:
   - `API_BASE_URL`: Base URL for the NLP API (default: `http://localhost:8080`). The build also writes its origin into the built manifest's `host_permissions`, so this is the only place the API address is set
   - `API_ENDPOINT`: API endpoint for noun phrase extraction (default: `/noun_phrases`)
   - `API_TIMEOUT`: Request timeout in milliseconds (default: `10000`)
   - `API_RETRY_ATTEMPTS`: Number of retry attempts for failed requests (default: `3`)
   - `API_RETRY_DELAY`: Delay between retries in milliseconds (default: `1000`)
   - `CACHE_DURATION`: Cache entry lifetime in milliseconds (default: `300000` = 5 minutes). The cache lives in the background service worker, which Chrome stops after about 30 seconds idle, so in practice entries rarely last this long
   - `MAX_CACHE_SIZE`: Maximum number of cached entries (default: `1000`)

The defaults live in `webpack.config.js`, and the values are baked in at build time, so rebuild after changing `.env`.

**Note**: The `.env` file is ignored by git to prevent committing sensitive data. Make sure to create your own `.env` file based on `.env.example`.

### 4. Build the Extension

#### For Production Build:
```bash
npm run build
```

#### For Development Build:
```bash
npm run build:dev
```

#### For Development (with watch mode):
```bash
npm run dev
```

### 4. Build Output

After building, you'll find the compiled extension in the `./dist` folder with the following structure:

```
dist/
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── background.js
└── images/
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    └── icon-128.png
```

## How to Use the Extension

### User Interface

1. **Paragraph tab**: Hover any paragraph to see a dark tab above its top-right corner (inside the corner when the paragraph above sits too close) with the word count, for example "¶ 42 WORDS", and a **Pin** button
2. **Pinned sheet**: Pin the paragraph and the button turns yellow and reads **Unpin**. A sheet opens under the paragraph:
   - With highlighting on, it shows how many noun phrases were found and a copy of the paragraph with them marked in yellow
   - With highlighting off, it says so and points to the toolbar button
   - If the lookup fails, it says so and offers **Retry**
3. **Toolbar popup**: One switch, **Noun phrase highlighting**, on or off

### Using the Extension

1. **Install and Load**: Follow the installation instructions below
2. **Turn on highlighting**: Click the extension icon in your Chrome toolbar and switch **Noun phrase highlighting** on
3. **Navigate to a Webpage**: Go to any webpage with text content
4. **Hover a paragraph** to see its word count
5. **Pin it** to open its sheet with the noun phrases highlighted; pin as many paragraphs as you like and unpin them when done

## Chrome Extension Installation

### Method 1: Load Unpacked Extension (Recommended for Development)

1. **Open Chrome Extensions Page**:
   - Open Google Chrome
   - Navigate to `chrome://extensions/` in the address bar
   - Or go to Chrome Menu → More Tools → Extensions

2. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top-right corner
   - This will reveal additional options for loading extensions

3. **Load the Extension**:
   - Click the "Load unpacked" button
   - Navigate to your project directory and select the `./dist` folder
   - Click "Select Folder"

4. **Verify Installation**:
   - The extension should now appear in your extensions list
   - You should see the extension icon in your Chrome toolbar
   - The extension will be listed as "Paragraph Processor - Smart Text Analysis" (the `name` in `manifest.json`)

### Method 2: Load Extension from Source (Alternative)

If you prefer to load directly from the source directory:

1. Follow steps 1-2 from Method 1
2. Click "Load unpacked" and select the root project folder (not `./dist`)
3. Note: This method requires the source files to be properly structured

### Screenshots

#### Extension Popup Interface
![Extension Popup](images/popup-example.png)

*The toolbar popup with noun phrase highlighting switched on.*

#### Text Processing Example
![Text Processing Example](images/example.png)

*Two pinned paragraphs: each keeps its tab with the word count, and its sheet shows the noun phrases found, highlighted in a copy of the paragraph.*

### Troubleshooting Installation

**Extension not appearing**: 
- Make sure you selected the correct folder (`./dist` for built version)
- Check that the `manifest.json` file is in the selected folder
- Verify that Developer mode is enabled

**Extension shows errors**:
- Check the browser console for error messages
- Ensure all files were built correctly in the `./dist` folder
- Verify that the manifest.json is valid

**Extension icon not visible**:
- Click the puzzle piece icon in the toolbar to see all extensions
- Pin the extension to the toolbar for easy access

## Backend Setup (Optional)

The extension can work with an optional NLP backend API. To set it up:

### 1. Clone the Backend Repository

```bash
git clone https://github.com/rgpl-xyz/nlp-spacy-api.git
cd nlp-spacy-api
```

### 2. Follow Backend Setup Instructions

Refer to the [backend repository's README](https://github.com/rgpl-xyz/nlp-spacy-api) for complete setup instructions. The backend provides:

- **Multiple NLP endpoints**: `/entities`, `/noun_phrases`, `/extract_all`
- **Batch processing**: Efficient processing of multiple documents
- **Performance optimizations**: Caching and memory optimization
- **Health monitoring**: Built-in health check endpoint
- **Docker support**: Easy deployment with Docker
- **Azure Search integration**: Ready for Azure Cognitive Skills

### 3. Test Backend Integration

Once the backend is running:

1. **Test the API directly**:
   ```bash
   curl -X POST "http://localhost:8080/noun_phrases" \
        -H "Content-Type: application/json" \
        -d '{"values": [{"recordId": "1", "data": {"text": "The quick brown fox jumps over the lazy dog."}}]}'
   ```

2. **Test with the extension**:
   - Open any webpage with text content
   - Click the extension icon in the toolbar
   - Switch **Noun phrase highlighting** on
   - Hover a paragraph and pin it: its sheet should show the noun phrases highlighted

### 4. API Documentation

Once the backend is running, you can view the interactive API documentation at:
- **Swagger UI**: http://localhost:8080/docs
- **ReDoc**: http://localhost:8080/redoc

## Development Workflow

### Making Changes

1. **Edit Source Files**: Modify files in the `src/` directory
2. **Run the tests**: `npm test` (and `npm run typecheck`)
3. **Rebuild**: Run `npm run build` to compile changes
4. **Reload Extension**: Go to `chrome://extensions/` and click the refresh icon on your extension
5. **Test**: Navigate to a webpage and test your changes

### File Structure

```
paragraph-processor-chrome/
├── src/
│   ├── content/
│   │   ├── content.ts             # Content script entry: wires the modules below together
│   │   ├── watch-paragraphs.ts    # Finds each paragraph on the page once, including ones added later
│   │   ├── paragraph-overlay.ts   # The paragraph tab and pinned sheet: word count, pin, highlighted copy
│   │   ├── highlight.ts           # Wraps noun phrases in highlight spans
│   │   └── noun-phrases.ts        # Asks the background worker for a text's noun phrases
│   ├── background/
│   │   ├── background.ts          # Service worker entry: answers the content script's messages
│   │   └── noun-phrase-client.ts  # Calls the NLP API with caching, retries and timeouts
│   ├── shared/
│   │   ├── messages.ts            # The message the content script and worker exchange
│   │   └── settings.ts            # The noun phrase highlighting setting in chrome.storage.sync
│   ├── popup/
│   │   ├── popup.html             # Extension popup UI
│   │   └── popup.ts               # Popup logic
│   └── images/                    # Extension icons
├── dist/                          # Built extension (generated)
├── .env.example                   # Build-time settings to copy into .env
├── manifest.json                  # Extension manifest (the build adds host_permissions)
├── package.json                   # Dependencies and scripts
├── webpack.config.js              # Build configuration and setting defaults
├── vitest.config.mjs              # Test configuration
└── tsconfig.json                  # TypeScript configuration
```

Each `*.test.ts` file sits next to the module it tests.

### How the Pieces Fit

The content script hands every paragraph to the overlay module once. Nothing is built until a paragraph is first hovered. Pinning a paragraph asks for the paragraph's noun phrases through `findNounPhrases(text)`. That function is the only part of the content script that knows about extension messaging, and it gets back a plain list of phrases. The background worker owns everything about the NLP API: the request and response record format, the cache, retries and timeouts. The popup and the content script read the highlighting setting through the same settings module.

## Testing

### Automated Tests

```bash
npm test            # unit tests (Vitest + jsdom)
npm run typecheck   # TypeScript, including the tests
npm run coverage    # tests with a coverage report
```

The tests cover paragraph discovery, the overlay, highlighting, the messaging between content script and worker, the NLP API client and the setting. They need neither Chrome nor the NLP API.

### Manual Testing

1. **Basic Functionality**:
   - Load the extension in Chrome
   - Navigate to any webpage with text content
   - Verify the extension icon appears in the toolbar

2. **NLP Integration**:
   - Switch noun phrase highlighting on in the popup
   - Pin a paragraph and check that its sheet highlights the noun phrases
   - Switch it off, pin another paragraph and check that its sheet says highlighting is off

3. **Settings Persistence**:
   - Change the NLP setting
   - Reload the page or restart Chrome
   - Verify the setting is remembered

### Debugging

- **View Console Logs**: Right-click the extension icon → "Inspect popup"
- **Check Background Script**: Go to `chrome://extensions/` → Find your extension → Click "service worker"
- **Content Script Debugging**: Use browser dev tools on the webpage

## Building for Distribution

### Create a ZIP File

To distribute the extension:

1. Build the extension: `npm run build`
2. Navigate to the `dist` folder
3. Select all files and create a ZIP archive
4. The ZIP file can be uploaded to the Chrome Web Store or shared directly

### Chrome Web Store

To publish on the Chrome Web Store:
1. Create a developer account at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Upload your ZIP file
3. Fill in the required metadata and descriptions
4. Submit for review

## Contributing

### Development Guidelines

1. **Code Style**: Follow TypeScript best practices
2. **Testing**: Test changes thoroughly before submitting
3. **Documentation**: Update README for any new features
4. **Commits**: Use descriptive commit messages

### How to Contribute

1. **Fork the Repository**: Create your own fork on GitHub
2. **Create a Branch**: Make changes in a feature branch
3. **Make Changes**: Implement your feature or fix
4. **Test**: Ensure everything works correctly
5. **Submit PR**: Create a pull request with detailed description

### Reporting Issues

When reporting issues, please include:
- Chrome version
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)

## License

This project is licensed under the [GNU General Public License v3.0 (GPLv3)](https://www.gnu.org/licenses/gpl-3.0.html).

### License Details

- **Freedom to Use**: You can use this software for any purpose.
- **Freedom to Study and Modify**: You can study how the program works, and change it to make it do what you wish.
- **Freedom to Distribute Copies**: You can redistribute copies of the original program so you can help others.
- **Freedom to Distribute Modified Versions**: You can distribute copies of your modified versions to others. By doing this you can give the whole community a chance to benefit from your changes. Access to the source code is a precondition for this.

### How to Obtain a Copy

You should have received a copy of the GNU General Public License along with this program. If not, you can obtain it from the [Free Software Foundation](https://www.gnu.org/licenses/gpl-3.0.html).

### Further Information

For more details on the GNU General Public License and its terms, visit the [GNU General Public License webpage](https://www.gnu.org/licenses/gpl-3.0.html).

