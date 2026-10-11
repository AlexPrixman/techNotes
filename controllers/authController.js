import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { HttpError, publicUser } from "../lib/validation.js";
const regenerate = (req) =>
  new Promise((resolve, reject) =>
    req.session.regenerate((err) => (err ? reject(err) : resolve())),
  );
const save = (req) =>
  new Promise((resolve, reject) =>
    req.session.save((err) => (err ? reject(err) : resolve())),
  );
export async function login(req, res) {
  const { username, password } = req.body || {};
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !username.trim() ||
    !password
  )
    throw new HttpError(400, "Username and password are required.");
  const user = await User.findOne({
    usernameKey: username.trim().toLowerCase(),
  }).select("+password");
  if (!user?.active || !(await bcrypt.compare(password, user.password)))
    throw new HttpError(401, "Invalid username or password.");
  await regenerate(req);
  req.session.userId = String(user._id);
  req.session.version = user.sessionVersion ?? 0;
  await save(req);
  res.json({ user: publicUser(user) });
}
export function getSession(req, res) {
  res.json({ user: publicUser(req.user) });
}
export async function logout(req, res) {
  await new Promise((resolve, reject) =>
    req.session.destroy((err) => (err ? reject(err) : resolve())),
  );
  res.clearCookie("technotes.sid", {
    path: "/",
    ...req.app.locals.cookieOptions,
  });
  res.sendStatus(204);
}
