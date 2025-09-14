import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import templateRoutes from "./routes/templateRoutes.js";
import signatureRoutes from "./routes/signatureRoutes.js";
import { checkConnection } from "./config/db.js";
import pool from "./config/db.js"; // add this import if not present
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { transporter } from "./utils/mailer.js"; // Impo
const app = express();
app.use(express.json({ limit: "2mb" }));
// --- CORS setup ---
const allowedOrigins = [
  process.env.CLIENT_ORIGIN, // Netlify frontend (production)
  "http://localhost:5173", // Vite local dev
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Health check route (API + DB)
app.get("/health", async (_req, res) => {
  const dbOk = await checkConnection();
  res.json({ status: "ok", db: dbOk ? "connected" : "error" });
});
app.get("/live", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
app.get("/ready", async (_req, res) => {
  const ok = await checkConnection();
  if (ok) return res.status(200).json({ db: "connected" });
  return res.status(503).json({ db: "error" });
});
// In server.js, add under other routes
app.get("/test-smtp", async (_req, res) => {
  try {
    await transporter.verify();
    res.json({ status: "SMTP OK" });
  } catch (error) {
    console.error("SMTP Verify Error:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    res.status(500).json({ error: error.message });
  }
});
app.use("/api/auth", authRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/signatures", signatureRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
// basic error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err.message || "Something went wrong" });
});
app.get("/debug/db", async (_req, res) => {
  const start = process.hrtime.bigint();
  const poolStats = {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };

  try {
    const { rows } = await pool.query(
      "select now() as now, version(), current_user, current_database()"
    );
    const latencyMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
    res.json({
      ok: true,
      latency_ms: latencyMs,
      pool: poolStats,
      db: rows[0],
    });
  } catch (err) {
    const latencyMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
    res.status(500).json({
      ok: false,
      latency_ms: latencyMs,
      pool: poolStats,
      error: err.message,
    });
  }
});
const shutdown = async () => {
  console.log("\nShutting down...");
  try {
    await pool.end();
    server.close(() => process.exit(0));
  } catch {
    process.exit(1);
  }
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start server
const PORT = process.env.PORT || 5050;
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await checkConnection(); // check DB at startup
});
