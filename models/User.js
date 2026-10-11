import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, maxlength: 30 },
    usernameKey: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    roles: {
      type: [String],
      enum: ["Employee", "Manager", "Admin"],
      default: ["Employee"],
    },
    active: { type: Boolean, default: true },
    sessionVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);
schema.pre("validate", function () {
  this.usernameKey = this.username?.trim().toLowerCase();
});
export default mongoose.model("User", schema);
