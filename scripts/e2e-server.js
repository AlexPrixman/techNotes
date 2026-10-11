// Test-only server: isolated real MongoDB process, never an Atlas or production database.
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import connectDB from "../config/database.js";
import { createApp } from "../app.js";
import { seedDemo } from "./fixtures.js";
const database = await MongoMemoryServer.create({
  binary: { version: "8.0.16" },
  instance: { args: ["--nounixsocket"] },
});
await connectDB(database.getUri());
await seedDemo();
const store = MongoStore.create({
  client: mongoose.connection.getClient(),
  autoRemove: "disabled",
});
const app = createApp({
  sessionStore: store,
  config: {
    port: 4001,
    production: false,
    sessionSecret: "isolated-test-session-secret-32-characters",
    origins: ["http://127.0.0.1:4173"],
    sameSite: "lax",
    trustProxy: false,
  },
});
const server = app.listen(4001, "127.0.0.1", () =>
  console.log("Isolated end-to-end API ready on 4001"),
);
const stop = () =>
  server.close(async () => {
    await store.close();
    await mongoose.disconnect();
    await database.stop();
    process.exit(0);
  });
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
