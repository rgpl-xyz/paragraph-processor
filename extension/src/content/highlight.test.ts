import { describe, expect, it } from "vitest";
import { highlightPhrases } from "./highlight";

function render(html: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
}

const highlighted = (root: Element) => [...root.querySelectorAll(".highlight")].map((span) => span.textContent);

describe("highlightPhrases", () => {
  it("prefers a longer phrase over a shorter one it starts with", () => {
    const root = render("Our mobile application syncs to the data center.");

    highlightPhrases(root, ["data", "mobile", "data center", "mobile application"]);

    expect(highlighted(root)).toEqual(["mobile application", "data center"]);
  });

  it("matches phrases with accents and symbols as whole words", () => {
    const root = render("Meet at the café to talk about C++ today.");

    highlightPhrases(root, ["café", "C++"]);

    expect(highlighted(root)).toEqual(["café", "C++"]);
  });

  it("does not match inside a longer word", () => {
    const root = render("The cartographer drew a cart.");

    highlightPhrases(root, ["cart"]);

    expect(highlighted(root)).toEqual(["cart"]);
  });

  it("ignores case and keeps the page's casing", () => {
    const root = render("The Data Center is open.");

    highlightPhrases(root, ["data center"]);

    expect(highlighted(root)).toEqual(["Data Center"]);
  });

  it("matches a phrase broken across lines in the page source", () => {
    const root = render("the data\n    center hums");

    highlightPhrases(root, ["data center"]);

    expect(highlighted(root)).toEqual(["data\n    center"]);
  });

  it("treats regex characters in phrases literally", () => {
    const root = render("Costs (approx.) five, unlike aXbXc or a.b.c here.");

    highlightPhrases(root, ["(approx.)", "a.b.c"]);

    expect(highlighted(root)).toEqual(["(approx.)", "a.b.c"]);
  });

  it("is safe to run twice", () => {
    const root = render("The data center hums.");

    highlightPhrases(root, ["data center"]);
    const addedTheSecondTime = highlightPhrases(root, ["data center"]);

    expect(addedTheSecondTime).toBe(0);
    expect(root.querySelectorAll(".highlight .highlight")).toHaveLength(0);
    expect(highlighted(root)).toEqual(["data center"]);
  });

  it("keeps the surrounding markup", () => {
    const root = render('<b>Bold</b> data center and <a href="#">a link</a>.');

    highlightPhrases(root, ["data center"]);

    expect(root.innerHTML).toBe('<b>Bold</b> <span class="highlight">data center</span> and <a href="#">a link</a>.');
  });

  it("returns how many highlights it added", () => {
    expect(highlightPhrases(render("data and more data"), ["data"])).toBe(2);
    expect(highlightPhrases(render("nothing here"), [])).toBe(0);
    expect(highlightPhrases(render("nothing here"), ["  "])).toBe(0);
  });

  it("leaves the caller's phrase list in its order", () => {
    const phrases = ["mobile", "data"];

    highlightPhrases(render("data"), phrases);

    expect(phrases).toEqual(["mobile", "data"]);
  });
});
