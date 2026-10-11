import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import { rateLimit } from "express-rate-limit";
import { loadConfig } from "./config.js";
import { HttpError } from "./lib/validation.js";
import { requireAuth } from "./middleware/auth.js";
import { login, logout, getSession } from "./controllers/authController.js";
import users from "./routes/userRoutes.js";
import notes from "./routes/noteRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
export function createApp({ config = loadConfig(), sessionStore } = {}) {
  if (config.production && !sessionStore)
    throw new Error("Production requires a persistent session store.");
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.origins.includes(origin)) callback(null, true);
        else callback(new HttpError(403, "This origin is not allowed."));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  const cookie = {
    httpOnly: true,
    secure: config.production,
    sameSite: config.sameSite,
    maxAge: 8 * 60 * 60 * 1000,
  };
  app.locals.cookieOptions = {
    httpOnly: true,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
  };
  app.use(
    session({
      name: "technotes.sid",
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie,
    }),
  );
  app.get("/", (req, res) =>
    res.json({ service: "techNotes API", version: "2.0.0" }),
  );
  app.get("/health", (req, res) =>
    res
      .status(mongoose.connection.readyState === 1 ? 200 : 503)
      .json({
        status: mongoose.connection.readyState === 1 ? "ok" : "unavailable",
      }),
  );
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many sign-in attempts. Please try again later." },
  });
  app.post("/auth/login", limiter, login);
  app.get("/auth/session", requireAuth, getSession);
  app.post("/auth/logout", logout);
  app.use("/users", users);
  app.use("/notes", notes);
  app.use((req, res) => res.status(404).json({ message: "Route not found." }));
  app.use(errorHandler);
  return app;
}
