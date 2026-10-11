import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Note from "../models/Note.js";
export async function seedDemo({ password = "TechNotes123!" } = {}) {
  const accounts = [
    { username: "admin", roles: ["Admin"] },
    { username: "manager", roles: ["Manager"] },
    { username: "employee", roles: ["Employee"] },
  ];
  const hash = await bcrypt.hash(password, 12);
  const users = [];
  for (const account of accounts) {
    let user = await User.findOne({ usernameKey: account.username });
    // Seed is additive: never reset existing passwords, roles or staff data.
    if (!user) user = await User.create({ ...account, password: hash });
    users.push(user);
  }
  if (!(await Note.exists({ titleKey: "inspect brake pads" })))
    await Note.create({
      user: users[2]._id,
      title: "Inspect brake pads",
      text: "Inspect the front brake pads and record the recommended repair.",
      completed: false,
    });
  return users;
}
