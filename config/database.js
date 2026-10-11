import mongoose from "mongoose";
import User from "../models/User.js";
import Note from "../models/Note.js";
import Counter from "../models/Counter.js";
export default async function connectDB(uri) {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: false,
  });
  // Backfill keys for existing v1 data before building unique indexes. Never erase records.
  for (const user of await User.find({
    usernameKey: { $exists: false },
  }).lean()) {
    await User.updateOne(
      { _id: user._id },
      { $set: { usernameKey: user.username.trim().toLowerCase() } },
    );
  }
  for (const note of await Note.find({ titleKey: { $exists: false } }).lean()) {
    await Note.updateOne(
      { _id: note._id },
      { $set: { titleKey: note.title.trim().toLowerCase() } },
    );
  }
  const last = await Note.findOne()
    .sort({ ticket: -1 })
    .select("ticket")
    .lean();
  await Counter.updateOne(
    { _id: "ticketNumber" },
    { $max: { seq: Math.max(last?.ticket || 0, 999) } },
    { upsert: true },
  );
  await Promise.all([
    User.createIndexes(),
    Note.createIndexes(),
    Counter.createIndexes(),
  ]);
  return mongoose.connection;
}
