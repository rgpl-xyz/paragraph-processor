import fs from "node:fs";
import path from "node:path";
import { apiRequests, boxOf, expect, moveAway, openPopup, overlayOf, pin, pinOf, setHighlighting, showTab, test } from "./fixtures";
import { EXTENSION_DIR } from "./paths";

// The <all_urls> content script already gives the worker access to every origin, so a wrong
// host permission can't fail a lookup; check what the build wrote instead.
test("the build grants the API origin it was built for", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(EXTENSION_DIR, "manifest.json"), "utf8"));

  expect(manifest.host_permissions).toEqual([`${process.env.STUB_API_URL}/*`]);
  expect(manifest.permissions).toEqual(["storage"]);
});

test.describe("paragraph tab", () => {
  test("shows the word count on hover without moving the page", async ({ article }) => {
    await expect(overlayOf(article, "p1")).toHaveCount(0);
    const before = await boxOf(article, "#p2");

    await showTab(article, "p1");

    await expect(overlayOf(article, "p1").locator(".tab")).toHaveText(/23\s*words\s*Pin/i);
    expect((await boxOf(article, "#p2")).top).toBe(before.top);
  });

  test("sits above a paragraph with room and inside one whose neighbour is too close", async ({ article }) => {
    await showTab(article, "p1");
    const p1 = await boxOf(article, "#p1");
    const p1Tab = (await overlayOf(article, "p1").locator(".tab").boundingBox())!;
    expect(p1Tab.y + p1Tab.height).toBeCloseTo(p1.top, 0);

    await moveAway(article);
    await showTab(article, "t2");
    const t1 = await boxOf(article, "#t1");
    const t2 = await boxOf(article, "#t2");
    const t2Tab = (await overlayOf(article, "t2").locator(".tab").boundingBox())!;
    expect(t2Tab.y).toBeGreaterThanOrEqual(t2.top - 0.5);
    expect(t2Tab.y).toBeGreaterThanOrEqual(t1.bottom);
  });

  test("gives each paragraph one tab on a busy page, including paragraphs added later", async ({ article }) => {
    for (const id of ["p1", "p2", "p4"]) await showTab(article, id);

    for (const id of ["p1", "p2", "p4"]) await expect(overlayOf(article, id)).toHaveCount(1);
  });
});

test.describe("pinned sheet", () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await setHighlighting(context, extensionId, true);
  });

  test("highlights whole noun phrases and leaves the next paragraph visible", async ({ article }) => {
    await pin(article, "p1");

    const overlay = overlayOf(article, "p1");
    await expect(overlay.locator(".highlight")).toHaveText(["mobile application", "data center"]);
    await expect(overlay.locator(".stub")).toHaveText(/2\s*noun phrases/i);
    await expect(pinOf(article, "p1")).toHaveText("Unpin");

    await moveAway(article);
    await article.locator("#p2").scrollIntoViewIfNeeded();
    const p2 = await boxOf(article, "#p2");
    const hit = await article.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest("p")?.id,
      { x: p2.left + 20, y: p2.top + p2.height / 2 },
    );
    expect(hit).toBe("p2");
  });

  test("matches accented and symbol phrases", async ({ article }) => {
    await pin(article, "p2");

    await expect(overlayOf(article, "p2").locator(".highlight")).toHaveText(["café", "C++", "noun phrases"]);
  });

  test("keeps the pin click from following a surrounding link", async ({ article }) => {
    await pin(article, "p3");

    await expect(pinOf(article, "p3")).toHaveText("Unpin");
    expect(article.url()).not.toContain("#navigated");
  });

  test("looks the phrases up once however often it is pinned", async ({ article }) => {
    await pin(article, "p1");
    await expect(overlayOf(article, "p1").locator(".highlight")).toHaveCount(2);
    const before = (await apiRequests()).length;

    await pinOf(article, "p1").click();
    await pinOf(article, "p1").click();
    await expect(pinOf(article, "p1")).toHaveText("Unpin");
    await article.waitForTimeout(300);

    expect((await apiRequests()).length).toBe(before);
    await expect(overlayOf(article, "p1").locator(".highlight .highlight")).toHaveCount(0);
  });

  test("offers a one-click retry after a failed lookup", async ({ article }) => {
    await pin(article, "p5");
    const overlay = overlayOf(article, "p5");
    await expect(overlay.locator("[role=status]")).toHaveText("Couldn’t get noun phrases.", { timeout: 15_000 });
    const before = (await apiRequests()).length;

    await overlay.locator("button.retry").click();

    await expect.poll(async () => (await apiRequests()).length).toBeGreaterThan(before);
  });
});

test("says how to turn highlighting on while it is off", async ({ article }) => {
  await pin(article, "p6");

  await expect(overlayOf(article, "p6").locator("[role=status]")).toHaveText(/highlighting is off.*toolbar button/i);
  expect((await apiRequests()).some((text) => text.includes("With highlighting switched off"))).toBe(false);
});

test("the popup remembers the highlighting switch", async ({ context, extensionId }) => {
  const popup = await openPopup(context, extensionId);
  const toggle = popup.getByRole("switch", { name: "Noun phrase highlighting" });
  await expect(popup.locator("#useNLPState")).toHaveText("Off");

  await toggle.check();
  await expect(popup.locator("#useNLPState")).toHaveText("On");
  await popup.reload();

  await expect(toggle).toBeChecked();
  await expect(popup.locator("#useNLPState")).toHaveText("On");
});
