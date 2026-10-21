import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, openPopup, overlayOf, pin, pinOf, setHighlighting, showTab, test } from "./fixtures";

const RULE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];

// One readable line per violation, so a failure names the rule and the elements
async function violationsOf(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).withTags(RULE_TAGS).analyze();
  return violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" > ")).join(", ")}`);
}

test("the popup has no axe violations in light or dark", async ({ context, extensionId }) => {
  const popup = await openPopup(context, extensionId);
  expect(await violationsOf(popup)).toEqual([]);

  await popup.emulateMedia({ colorScheme: "dark" });
  expect(await violationsOf(popup)).toEqual([]);
});

test("pinned and failed sheets have no axe violations", async ({ context, extensionId, article }) => {
  await setHighlighting(context, extensionId, true);
  await pin(article, "p1");
  await expect(overlayOf(article, "p1").locator(".highlight").first()).toBeVisible();
  await pin(article, "p5");
  await expect(overlayOf(article, "p5").locator("button.retry")).toBeVisible({ timeout: 15_000 });

  expect(await violationsOf(article)).toEqual([]);
});

test("the keyboard reaches the popup switch and the pin button", async ({ context, extensionId, article }) => {
  const popup = await openPopup(context, extensionId);
  await popup.keyboard.press("Tab");
  await expect(popup.getByRole("switch")).toBeFocused();
  await popup.keyboard.press("Space");
  await expect(popup.getByRole("switch")).toBeChecked();
  await popup.close();

  await article.bringToFront();
  await showTab(article, "p1");
  await pinOf(article, "p1").focus();
  await article.keyboard.press("Enter");
  await expect(pinOf(article, "p1")).toHaveText("Unpin");
});

test("reduced motion turns off the tab and sheet animations", async ({ article }) => {
  await article.emulateMedia({ reducedMotion: "reduce" });

  await showTab(article, "p1");

  const overlay = overlayOf(article, "p1");
  await expect(overlay.locator(".tab")).toHaveCSS("animation-name", "none");
  await expect(overlay.locator(".body")).toHaveCSS("transition-duration", "0s");
});
