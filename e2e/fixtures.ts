import { test as base, chromium, expect, type BrowserContext, type Page } from "@playwright/test";
import { EXTENSION_DIR } from "./paths";

interface Fixtures {
  extensionId: string;
  article: Page;
}

// Every test gets a fresh Chrome profile with the built extension loaded, so the
// highlighting setting starts off and the worker's cache starts empty.
export const test = base.extend<Fixtures>({
  context: async ({ headless }, use) => {
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      headless,
      args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    await use(new URL(worker.url()).host);
  },
  article: async ({ context, extensionId }, use) => {
    void extensionId; // the worker must be running before the page loads
    const page = await context.newPage();
    await page.goto(`${process.env.STUB_API_URL}/article`);
    await use(page);
  },
});

export { expect };

export const overlayOf = (page: Page, id: string) => page.locator(`#${id} [data-paragraph-overlay]`);
export const pinOf = (page: Page, id: string) => overlayOf(page, id).locator("button.pin");

export async function openPopup(context: BrowserContext, extensionId: string): Promise<Page> {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  return popup;
}

export async function setHighlighting(context: BrowserContext, extensionId: string, enabled: boolean) {
  const popup = await openPopup(context, extensionId);
  await popup.locator("#useNLP").setChecked(enabled);
  await expect(popup.locator("#useNLPState")).toHaveText(enabled ? "On" : "Off");
  await popup.close();
}

// Hovers until the tab shows: the content script hands paragraphs over in idle time,
// so the first hover can land before a paragraph has its listeners. Then waits out the
// tab's entrance animation so measurements see its resting place.
export async function showTab(page: Page, id: string) {
  const tab = overlayOf(page, id).locator(".tab");
  await expect(async () => {
    await page.mouse.move(1, 1);
    await page.hover(`#${id}`);
    await expect(tab).toBeVisible({ timeout: 500 });
  }).toPass();
  await tab.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
}

export async function pin(page: Page, id: string) {
  await showTab(page, id);
  await pinOf(page, id).click();
}

export async function moveAway(page: Page) {
  await page.mouse.move(1, 1);
}

export async function apiRequests(): Promise<string[]> {
  const response = await fetch(`${process.env.STUB_API_URL}/requests`);
  return response.json();
}

export function boxOf(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => element.getBoundingClientRect().toJSON() as DOMRect);
}
