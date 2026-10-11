import mongoose from "mongoose";
import { loadConfig } from "../config.js";
import connectDB from "../config/database.js";
import { seedDemo } from "./fixtures.js";
try {
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.SEED_PASSWORD || process.env.SEED_PASSWORD.length < 12)
  )
    throw new Error(
      "Production seeding requires a SEED_PASSWORD of at least 12 characters.",
    );
  await connectDB(loadConfig().mongoUri);
  await seedDemo({ password: process.env.SEED_PASSWORD || "TechNotes123!" });
  console.log(
    "Demo accounts ready: admin, manager, employee. Existing accounts were preserved.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
