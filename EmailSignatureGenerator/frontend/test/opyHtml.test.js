/**
 * @jest-environment jsdom
 */
import { copyHtml } from "./copyHtml";

function mockNavigatorClipboard(obj) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: obj,
  });
}

describe("copyHtml", () => {
  beforeEach(() => {
    mockNavigatorClipboard(undefined);
    document.execCommand = undefined;
  });

  test("uses ClipboardItem when available", async () => {
    const write = jest.fn().mockResolvedValue();
    mockNavigatorClipboard({ write });
    global.ClipboardItem = function ClipboardItem(items) {
      this.items = items;
    };

    const ok = await copyHtml("<b>hello</b>");
    expect(ok).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);

    delete global.ClipboardItem;
  });

  test("falls back to execCommand when ClipboardItem unavailable", async () => {
    delete global.ClipboardItem;
    mockNavigatorClipboard({}); // no write/writeText
    document.execCommand = jest.fn(() => true);

    const ok = await copyHtml("<i>hi</i>");
    expect(ok).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  test("falls back to writeText when execCommand fails", async () => {
    delete global.ClipboardItem;
    document.execCommand = jest.fn(() => false);

    const writeText = jest.fn().mockResolvedValue();
    mockNavigatorClipboard({ writeText });

    const ok = await copyHtml("<u>hey</u>");
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith("<u>hey</u>");
  });

  test("returns false when all strategies unavailable", async () => {
    delete global.ClipboardItem;
    document.execCommand = undefined;
    mockNavigatorClipboard(undefined);

    await expect(copyHtml("<p>nope</p>")).resolves.toBe(false);
  });
});
