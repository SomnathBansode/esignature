import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import templateRoutes from "./routes/templateRoutes.js";
import signatureRoutes from "./routes/signatureRoutes.js";
import { checkConnection } from "./config/db.js";
import pool from "./config/db.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { testEmail } from "./utils/mailer.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

// --- CORS setup ---
const allowedOrigins = [
  process.env.CLIENT_ORIGIN || "https://esignaturewebapp.netlify.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      console.log(`🔎 Request origin: ${origin}`);
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Test email route for debugging email issues
app.get("/test-email", async (req, res) => {
  console.log(`🚀 Test email request, origin=${req.headers.origin}`);
  try {
    await testEmail();
    res.json({ message: "Test email sent successfully" });
  } catch (error) {
    console.error(`❌ Test email failed:`, error);
    res.status(500).json({ error: `Test email failed: ${error.message}` });
  }
});

// Health check routes
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

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/signatures", signatureRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);

// Basic error handler
app.use((err, _req, res, _next) => {
  console.error(`❌ Server error:`, err);
  res.status(400).json({ error: err.message || "Something went wrong" });
});

// Debug database route
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

// Graceful shutdown
const server = app.listen(process.env.PORT || 5050, async () => {
  const PORT = process.env.PORT || 5050;
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Env check:", {
    DATABASE_URL: process.env.DATABASE_URL ? "Set" : "Missing",
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "Missing",
    PORT: process.env.PORT || "Missing",
    JWT_SECRET: process.env.JWT_SECRET ? "Set" : "Missing",
    EMAIL_USER: process.env.EMAIL_USER || "Missing",
    EMAIL_PASS: process.env.EMAIL_PASS ? "Set" : "Missing",
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "Missing",
  });
  await checkConnection();
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
