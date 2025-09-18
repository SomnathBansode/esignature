test("style block: background:url() becomes background:none;", () => {
  const html = `<style>.x{background:url();}</style><div/>`;
  const out = cleanSignatureHtml(html);
  expect(out).toContain("background:none;");
});

test("style block: empty background removed", () => {
  const html = `<style>.y{background: ; color:red;}</style><div/>`;
  const out = cleanSignatureHtml(html);
  expect(out).not.toContain("background:");
  expect(out).toContain("color: red;");
});
