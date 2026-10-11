import mongoose from "mongoose";
const schema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, required: true },
});
export default mongoose.model("Counter", schema);
