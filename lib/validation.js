import mongoose from "mongoose";
export const ROLES = ["Employee", "Manager", "Admin"];
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function objectId(value) {
  if (typeof value !== "string" || !mongoose.isObjectIdOrHexString(value))
    throw new HttpError(400, "A valid ID is required.");
  return value;
}
export function text(value, label, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new HttpError(
      400,
      `${label} is required and must be at most ${max} characters.`,
    );
  }
  return value.trim();
}
export function username(value) {
  const name = text(value, "Username", 30);
  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(name))
    throw new HttpError(
      400,
      "Username must contain 3–30 letters, numbers, underscores or hyphens.",
    );
  return name;
}
export function password(value) {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    Buffer.byteLength(value) > 72
  ) {
    throw new HttpError(
      400,
      "Password must be at least 8 characters and at most 72 UTF-8 bytes.",
    );
  }
  return value;
}
export function roles(value) {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.some((x) => !ROLES.includes(x))
  )
    throw new HttpError(400, "At least one valid role is required.");
  return [...new Set(value)];
}
export function boolean(value, label) {
  if (typeof value !== "boolean")
    throw new HttpError(400, `${label} must be a boolean.`);
  return value;
}
export const isManager = (user) =>
  user.roles.some((role) => ["Manager", "Admin"].includes(role));
export const publicUser = (user) => ({
  _id: String(user._id),
  username: user.username,
  roles: user.roles,
  active: user.active,
});
