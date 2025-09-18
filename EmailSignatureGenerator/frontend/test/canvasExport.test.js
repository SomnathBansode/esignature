/**
 * @jest-environment jsdom
 */
import { shouldIgnoreElementForCanvas } from "../src/utils/canvasExport";

const makeImg = (src) => {
  const img = document.createElement("img");
  if (src !== undefined) img.setAttribute("src", src);
  return img;
};

describe("shouldIgnoreElementForCanvas", () => {
  test("non-IMG elements are never ignored", () => {
    expect(shouldIgnoreElementForCanvas(document.createElement("div"))).toBe(false);
  });

  test("data: URLs are allowed", () => {
    const img = makeImg("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB");
    expect(shouldIgnoreElementForCanvas(img)).toBe(false);
  });

  test("blob: URLs are allowed", () => {
    const img = makeImg("blob:http://localhost:5173/abcd-1234");
    expect(shouldIgnoreElementForCanvas(img)).toBe(false);
  });

  test("same-origin absolute URL is allowed", () => {
    const img = makeImg("http://localhost:5173/assets/logo.png");
    expect(shouldIgnoreElementForCanvas(img)).toBe(false);
  });

  test("relative URL resolves to same-origin and is allowed", () => {
    const img = makeImg("/images/avatar.png");
    expect(shouldIgnoreElementForCanvas(img)).toBe(false);
  });

  test("cross-origin URL is ignored", () => {
    const img = makeImg("https://example.com/logo.png");
    expect(shouldIgnoreElementForCanvas(img)).toBe(true);
  });

  test("protocol-relative cross-origin URL is ignored", () => {
    const img = makeImg("//example.com/logo.png");
    expect(shouldIgnoreElementForCanvas(img)).toBe(true);
  });

  test("malformed src is ignored", () => {
    const
