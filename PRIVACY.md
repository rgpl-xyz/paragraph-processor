# Privacy Policy for Paragraph Processor

**Last updated**: October 21, 2026

Paragraph Processor is a Chrome extension that counts the words in paragraphs and, if you switch it on, highlights their noun phrases. This policy describes what it reads, stores and sends.

## What it reads

The extension runs on the pages you visit so it can add its tab to paragraphs. When you hover or pin a paragraph, it reads that paragraph's text to count its words and to show it in the pinned sheet. Counting words happens in your browser; nothing is sent anywhere for it.

## What it sends, and where

Nothing, unless you switch on **Noun phrase highlighting** in the extension's toolbar popup. It's off when you install the extension.

With highlighting on, the extension sends the text of each paragraph you **pin**, and nothing else from the page, to an [nlp-spacy-api](https://github.com/rgpl-xyz/nlp-spacy-api) server, which returns the paragraph's noun phrases. Paragraphs you only hover are never sent.

The extension doesn't come with a server of its own. It talks to the address it was built with: by default `http://localhost:8080`, a server running on your own computer. If you use a build that points somewhere else, the text goes to that server and the policy of whoever runs it applies. nlp-spacy-api keeps no copy of the texts it analyzes.

## What it stores

- **Your highlighting setting**, in Chrome's sync storage, so it follows your Chrome profile. Nothing else is stored there.
- **Recent results**, in the extension's memory, so pinning the same text again doesn't send it twice. They're kept for at most five minutes and are gone whenever Chrome stops the extension's background worker, which it does after about 30 seconds idle.

## What it doesn't do

No analytics, telemetry, crash reports, ads or tracking. It doesn't collect your browsing history, and it doesn't share or sell anything to anyone.

## Permissions

- **Storage**: to save your highlighting setting.
- **Access to the sites you visit**: to add the tab and sheet to paragraphs on any page.
- **Access to the nlp-spacy-api address**: to send pinned paragraphs for noun phrase highlighting.

## Your choices

- Leave highlighting off and no text leaves your browser.
- Unpin a paragraph to close its sheet; switching highlighting off stops all sending.
- Removing the extension deletes its stored setting.

## Changes

Changes to this policy are published in this file in the repository, with a new date above.

## Contact

Questions or concerns: open an issue at https://github.com/rgpl-xyz/paragraph-processor-chrome/issues.
