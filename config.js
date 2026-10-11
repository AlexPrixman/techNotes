import "dotenv/config";
import { randomBytes } from "node:crypto";

export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === "production";
  const port = Number(env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT must be a valid TCP port.");
  if (production && (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32)) {
    throw new Error(
      "Production requires a SESSION_SECRET of at least 32 characters.",
    );
  }
  const sameSite = env.COOKIE_SAME_SITE || "lax";
  if (!["lax", "strict", "none"].includes(sameSite))
    throw new Error("Invalid COOKIE_SAME_SITE.");
  if (sameSite === "none" && !production)
    throw new Error("Cross-site cookies require production HTTPS.");
  return {
    port,
    production,
    mongoUri: env.MONGODB_URI || "mongodb://127.0.0.1:27017/technotes",
    sessionSecret: env.SESSION_SECRET || randomBytes(32).toString("hex"),
    origins: (
      env.CLIENT_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173"
    )
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
    sameSite,
    trustProxy: env.TRUST_PROXY === "1",
  };
}
