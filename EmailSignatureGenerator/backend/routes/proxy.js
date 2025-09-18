import { Router } from "express";

const router = Router();

/**
 * GET /api/proxy/image?url=<absolute-image-url>
 * - Fetches the remote image and returns it with CORS headers
 * - Safe for html2canvas (no tainted canvas)
 */
router.get("/image", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send("Missing url");

    const upstream = await fetch(url);
    if (!upstream.ok) return res.status(upstream.status).send("Upstream error");

    const buf = Buffer.from(await upstream.arrayBuffer());
    const type =
      upstream.headers.get("content-type") || "application/octet-stream";

    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*"); // key for canvas
    res.send(buf);
  } catch (e) {
    res.status(500).send("Proxy error");
  }
});

export default router;
