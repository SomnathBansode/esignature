// src/utils/copyHtml.js
export async function copyHtml(html) {
  const cleaned = String(html ?? "");

  // 1) Modern rich copy
  try {
    if (window.ClipboardItem && navigator.clipboard?.write) {
      const item = new window.ClipboardItem({
        "text/html": new Blob([cleaned], { type: "text/html" }),
        "text/plain": new Blob([cleaned], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {}

  // 2) Fallback: contenteditable + execCommand
  try {
    const div = document.createElement("div");
    div.style.position = "fixed";
    div.style.left = "-99999px";
    div.style.top = "0";
    div.setAttribute("contenteditable", "true");
    div.innerHTML = cleaned;
    document.body.appendChild(div);

    const range = document.createRange();
    range.selectNodeContents(div);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const ok = document.execCommand("copy");

    sel.removeAllRanges();
    document.body.removeChild(div);

    if (ok) return true;
  } catch {}

  // 3) Last resort: plain text
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(cleaned);
      return true;
    }
  } catch {}

  return false;
}
