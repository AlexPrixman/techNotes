import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import { loadConfig } from "./config.js";
import connectDB from "./config/database.js";
import { createApp } from "./app.js";
const config = loadConfig();
try {
  await connectDB(config.mongoUri);
  const store = MongoStore.create({
    client: mongoose.connection.getClient(),
    autoRemove: "native",
  });
  const app = createApp({ config, sessionStore: store });
  const server = app.listen(config.port, () =>
    console.log(`techNotes API listening on ${config.port}`),
  );
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    server.close(async () => {
      await store.close();
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
} catch (error) {
  console.error(`Startup failed: ${error.message}`);
  await mongoose.disconnect();
  process.exitCode = 1;
}
