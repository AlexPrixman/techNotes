import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Note from "../models/Note.js";
import {
  HttpError,
  objectId,
  username,
  password,
  roles,
  boolean,
  publicUser,
} from "../lib/validation.js";
export async function getAllUsers(req, res) {
  res.json((await User.find().sort({ usernameKey: 1 })).map(publicUser));
}
export async function createNewUser(req, res) {
  const body = req.body || {};
  const name = username(body.username);
  const userRoles = roles(body.roles ?? ["Employee"]);
  if (!req.user.roles.includes("Admin") && userRoles.includes("Admin"))
    throw new HttpError(403, "Only an Admin may grant Admin access.");
  const user = await User.create({
    username: name,
    password: await bcrypt.hash(password(body.password), 12),
    roles: userRoles,
  });
  res.status(201).json(publicUser(user));
}
export async function updateUser(req, res) {
  const body = req.body || {};
  const user = await User.findById(objectId(req.params.id || body.id)).select(
    "+password",
  );
  if (!user) throw new HttpError(404, "User not found.");
  const name = username(body.username);
  const userRoles = roles(body.roles);
  const active = boolean(body.active, "Active");
  if (
    !req.user.roles.includes("Admin") &&
    (user.roles.includes("Admin") || userRoles.includes("Admin"))
  )
    throw new HttpError(403, "Only an Admin may change an Admin account.");
  if (
    String(user._id) === String(req.user._id) &&
    (!active ||
      (!userRoles.includes("Admin") && req.user.roles.includes("Admin")))
  )
    throw new HttpError(
      409,
      "You cannot deactivate or remove your own Admin access.",
    );
  if (
    user.active &&
    user.roles.includes("Admin") &&
    (!active || !userRoles.includes("Admin")) &&
    (await User.countDocuments({ active: true, roles: "Admin" })) <= 1
  )
    throw new HttpError(409, "Keep at least one active Admin.");
  if (user.active !== active)
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  user.username = name;
  user.roles = userRoles;
  user.active = active;
  if (body.password !== undefined && body.password !== "") {
    user.password = await bcrypt.hash(password(body.password), 12);
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  }
  await user.save();
  res.json(publicUser(user));
}
export async function deleteUser(req, res) {
  const id = objectId(req.params.id || req.body?.id);
  const user = await User.findById(id);
  if (!user) throw new HttpError(404, "User not found.");
  if (String(req.user._id) === id)
    throw new HttpError(409, "You cannot delete your own account.");
  if (user.roles.includes("Admin") && !req.user.roles.includes("Admin"))
    throw new HttpError(403, "Only an Admin may delete an Admin.");
  if (
    user.active &&
    user.roles.includes("Admin") &&
    (await User.countDocuments({ active: true, roles: "Admin" })) <= 1
  )
    throw new HttpError(409, "Keep at least one active Admin.");
  if (await Note.exists({ user: id }))
    throw new HttpError(
      409,
      "Reassign or delete this user’s notes before deleting the account.",
    );
  await user.deleteOne();
  res.sendStatus(204);
}
export async function getAssignees(req, res) {
  res.json(
    (await User.find({ active: true }).sort({ usernameKey: 1 })).map(
      publicUser,
    ),
  );
}
