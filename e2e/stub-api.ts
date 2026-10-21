import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";

// Stands in for nlp-spacy-api and serves the test article. It sends no CORS headers; the
// worker reaches it through the extension's host access (the content script's <all_urls>
// match already grants every origin, so host_permissions is checked separately).
const ARTICLE = fs.readFileSync(path.join(__dirname, "article.html"));
const KNOWN_PHRASES = ["mobile application", "data center", "café", "C++", "noun phrases", "the error state"];
const FAILING_TEXT = "fails on purpose";

export interface StubApi {
  url: string;
  close(): Promise<void>;
}

export async function startStubApi(): Promise<StubApi> {
  const requests: string[] = [];

  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/noun_phrases") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        const [record] = JSON.parse(body).values;
        const text: string = record.data.text;
        requests.push(text);
        if (text.includes(FAILING_TEXT)) {
          res.writeHead(500, { "Content-Type": "application/json" }).end("{}");
          return;
        }
        const phrases = KNOWN_PHRASES.filter((phrase) => text.toLowerCase().includes(phrase.toLowerCase()));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ values: [{ recordId: record.recordId, data: { noun_phrases: phrases }, errors: null, warnings: null }] }));
      });
      return;
    }
    if (req.url === "/requests") {
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(requests));
      return;
    }
    if (req.url === "/article") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(ARTICLE);
      return;
    }
    res.writeHead(404).end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
