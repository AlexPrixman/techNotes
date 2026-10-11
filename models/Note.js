import mongoose from "mongoose";
import Counter from "./Counter.js";
const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    titleKey: { type: String, required: true, unique: true },
    text: { type: String, required: true, trim: true, maxlength: 10000 },
    completed: { type: Boolean, default: false },
    ticket: { type: Number, unique: true, required: true },
  },
  { timestamps: true, optimisticConcurrency: true },
);
schema.pre("validate", async function () {
  this.titleKey = this.title?.trim().toLowerCase();
  if (this.isNew && !this.ticket) {
    const counter = await Counter.findOneAndUpdate(
      { _id: "ticketNumber" },
      [{ $set: { seq: { $add: [{ $ifNull: ["$seq", 999] }, 1] } } }],
      { upsert: true, returnDocument: "after", updatePipeline: true },
    );
    this.ticket = counter.seq;
  }
});
export default mongoose.model("Note", schema);
