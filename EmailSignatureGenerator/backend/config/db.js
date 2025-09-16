// import pg from "pg";
// const { Pool } = pg;

// const pool = new Pool({
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT,
//   database: process.env.DB_NAME,
//   ssl: {
//     rejectUnauthorized: true,
//     ca: process.env.DB_CA_CERT, // keep certificate in .env (multiline string)
//   },
// });

// // Ensure every connection sees the signature_app schema
// pool.on("connect", async (client) => {
//   await client.query("SET search_path TO signature_app, public");
// });

// export const query = (text, params) => pool.query(text, params);

// export const checkConnection = async () => {
//   try {
//     const { rows } = await pool.query(
//       "SELECT current_schema() AS schema, version(), now()"
//     );
//     console.log(
//       "✅ Database connected:",
//       `schema=${rows[0].schema}, version=${rows[0].version}, time=${rows[0].now}`
//     );
//     return true;
//   } catch (err) {
//     console.error("❌ Database connection failed:", err.message);
//     return false;
//   }
// };

// export default pool;

import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon needs SSL
});

// Ensure every connection sees the signature_app schema
pool.on("connect", async (client) => {
  await client.query("SET search_path TO signature_app, public");
});

export const query = (text, params) => pool.query(text, params);

export const checkConnection = async () => {
  try {
    const { rows } = await pool.query(
      "SELECT current_schema() AS schema, now()"
    );
    console.log("✅ Database connected. search_path schema:", rows[0].schema);
    return true;
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    return false;
  }
};

export default pool;
