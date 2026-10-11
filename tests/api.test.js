import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import request from "supertest";
import MongoStore from "connect-mongo";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../app.js";
import connectDB from "../config/database.js";
import User from "../models/User.js";
import Note from "../models/Note.js";
import Counter from "../models/Counter.js";
let database, store, app, staff, hash;
const secret = "test-session-secret-long-enough-for-production";
before(async () => {
  database = await MongoMemoryServer.create({
    binary: { version: "8.0.16" },
    instance: { args: ["--nounixsocket"] },
  });
  await connectDB(database.getUri());
  store = MongoStore.create({
    client: mongoose.connection.getClient(),
    autoRemove: "disabled",
  });
  store.setMaxListeners(50); // Each isolated Express app attaches its own store event listeners.
  hash = await bcrypt.hash("TechNotes123!", 4);
});
after(async () => {
  await store?.close();
  await mongoose.disconnect();
  await database?.stop();
});
beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Note.deleteMany({}),
    Counter.deleteMany({}),
  ]);
  staff = await User.create(
    [
      { username: "admin", roles: ["Admin"] },
      { username: "manager", roles: ["Manager"] },
      { username: "employee", roles: ["Employee"] },
      { username: "other", roles: ["Employee"] },
    ].map((user) => ({ ...user, password: hash })),
  );
  app = createApp({
    sessionStore: store,
    config: {
      production: false,
      sessionSecret: secret,
      origins: ["http://localhost:5173"],
      sameSite: "lax",
      trustProxy: false,
    },
  });
});
async function signIn(username = "admin") {
  const agent = request.agent(app);
  await agent
    .post("/auth/login")
    .send({ username, password: "TechNotes123!" })
    .expect(200);
  return agent;
}
const noteBody = () => ({
  user: String(staff[2]._id),
  title: "Inspect brakes",
  text: "Check front pads.",
  completed: false,
});
test("health, unknown routes and unauthenticated access", async () => {
  await request(app).get("/health").expect(200, { status: "ok" });
  await request(app).get("/missing").expect(404);
  for (const path of ["/users", "/notes", "/auth/session"])
    await request(app).get(path).expect(401);
});
test("sign-in is case-insensitive, session persists, logout revokes it", async () => {
  const agent = await signIn("ADMIN");
  const response = await agent.get("/auth/session").expect(200);
  assert.equal(response.body.user.username, "admin");
  assert.equal(response.body.user.password, undefined);
  await agent.post("/auth/logout").expect(204);
  await agent.get("/auth/session").expect(401);
});
test("bad credentials, missing fields and inactive accounts are rejected", async () => {
  await request(app)
    .post("/auth/login")
    .send({ username: "admin", password: "wrong" })
    .expect(401);
  await request(app)
    .post("/auth/login")
    .send({ username: { $ne: null }, password: "x" })
    .expect(400);
  await User.updateOne({ _id: staff[2]._id }, { active: false });
  await request(app)
    .post("/auth/login")
    .send({ username: "employee", password: "TechNotes123!" })
    .expect(401);
});
test("allowed CORS preflight succeeds and untrusted origins cannot mutate", async () => {
  const preflight = await request(app)
    .options("/notes")
    .set("Origin", "http://localhost:5173")
    .set("Access-Control-Request-Method", "POST")
    .expect(204);
  assert.equal(preflight.headers["access-control-allow-credentials"], "true");
  await request(app)
    .post("/auth/login")
    .set("Origin", "https://evil.example")
    .send({ username: "admin", password: "TechNotes123!" })
    .expect(403);
});
test("staff list is protected; assignees omit hashes and inactive accounts", async () => {
  const employee = await signIn("employee");
  await employee.get("/users").expect(403);
  await employee
    .post("/users")
    .send({ username: "new", password: "TechNotes123!" })
    .expect(403);
  await User.updateOne({ _id: staff[3]._id }, { active: false });
  const result = await employee.get("/users/assignees").expect(200);
  assert.equal(result.body.length, 3);
  assert.equal(JSON.stringify(result.body).includes("password"), false);
});
test("Admin can create, edit, deactivate and delete a user with hashed passwords", async () => {
  const admin = await signIn();
  const created = await admin
    .post("/users")
    .send({
      username: "newstaff",
      password: "TechNotes123!",
      roles: ["Employee"],
    })
    .expect(201);
  assert.equal(created.body.password, undefined);
  assert.ok(
    await bcrypt.compare(
      "TechNotes123!",
      (await User.findById(created.body._id).select("+password")).password,
    ),
  );
  await admin
    .patch(`/users/${created.body._id}`)
    .send({
      username: "updatedstaff",
      password: "Changed123!",
      roles: ["Manager"],
      active: false,
    })
    .expect(200);
  await admin.delete(`/users/${created.body._id}`).expect(204);
  assert.equal(await User.findById(created.body._id), null);
});
test("duplicate usernames are rejected case-insensitively, and bad roles fail", async () => {
  const admin = await signIn();
  await admin
    .post("/users")
    .send({ username: "ADMIN", password: "TechNotes123!", roles: ["Employee"] })
    .expect(409);
  await admin
    .post("/users")
    .send({ username: "newstaff", password: "short", roles: ["Employee"] })
    .expect(400);
  await admin
    .post("/users")
    .send({ username: "newstaff", password: "TechNotes123!", roles: ["Owner"] })
    .expect(400);
});
test("Manager cannot grant, modify or delete Admin accounts", async () => {
  const manager = await signIn("manager");
  await manager
    .post("/users")
    .send({ username: "rogue", password: "TechNotes123!", roles: ["Admin"] })
    .expect(403);
  await manager
    .patch(`/users/${staff[0]._id}`)
    .send({ username: "admin", roles: ["Employee"], active: true })
    .expect(403);
  await manager.delete(`/users/${staff[0]._id}`).expect(403);
});
test("own deletion and self-removal of Admin access are blocked", async () => {
  const admin = await signIn();
  await admin.delete(`/users/${staff[0]._id}`).expect(409);
  await admin
    .patch(`/users/${staff[0]._id}`)
    .send({ username: "admin", roles: ["Employee"], active: true })
    .expect(409);
  await admin
    .patch(`/users/${staff[0]._id}`)
    .send({ username: "admin", roles: ["Admin"], active: false })
    .expect(409);
});
test("notes persist through create, retrieve, edit, complete, reassign and delete", async () => {
  const admin = await signIn();
  const created = await admin.post("/notes").send(noteBody()).expect(201);
  assert.equal(created.body.ticket, 1000);
  assert.ok(created.body.createdAt);
  await admin.get(`/notes/${created.body._id}`).expect(200);
  await admin
    .patch(`/notes/${created.body._id}`)
    .send({
      ...noteBody(),
      title: "Brakes checked",
      completed: true,
      user: String(staff[3]._id),
    })
    .expect(200);
  const listed = await admin.get("/notes").expect(200);
  assert.equal(listed.body[0].completed, true);
  assert.equal(listed.body[0].user, String(staff[3]._id));
  await admin.delete(`/notes/${created.body._id}`).expect(204);
  await admin.get("/notes").expect(200, []);
});
test("employees only see/edit their own notes and cannot delete or reassign", async () => {
  const own = await Note.create(noteBody());
  const other = await Note.create({
    ...noteBody(),
    title: "Other ticket",
    user: staff[3]._id,
  });
  const employee = await signIn("employee");
  const listed = await employee.get("/notes").expect(200);
  assert.equal(listed.body.length, 1);
  await employee.get(`/notes/${other._id}`).expect(403);
  await employee.patch(`/notes/${other._id}`).send(noteBody()).expect(403);
  await employee
    .patch(`/notes/${own._id}`)
    .send({ ...noteBody(), completed: true })
    .expect(200);
  await employee
    .patch(`/notes/${own._id}`)
    .send({ ...noteBody(), user: String(staff[3]._id) })
    .expect(403);
  await employee
    .post("/notes")
    .send({ ...noteBody(), title: "Unauthorised", user: String(staff[3]._id) })
    .expect(403);
  await employee.delete(`/notes/${own._id}`).expect(403);
});
test("note validation catches missing fields, invalid IDs, inactive assignees and duplicates", async () => {
  const admin = await signIn();
  await admin
    .post("/notes")
    .send({ ...noteBody(), title: " " })
    .expect(400);
  await admin
    .post("/notes")
    .send({ ...noteBody(), user: "bad" })
    .expect(400);
  await admin
    .post("/notes")
    .send({ ...noteBody(), completed: "false" })
    .expect(400);
  await admin.post("/notes").send(noteBody()).expect(201);
  await admin
    .post("/notes")
    .send({ ...noteBody(), title: "INSPECT BRAKES" })
    .expect(409);
  await User.updateOne({ _id: staff[3]._id }, { active: false });
  await admin
    .post("/notes")
    .send({ ...noteBody(), title: "New title", user: String(staff[3]._id) })
    .expect(400);
  await admin.get("/notes/bad").expect(400);
  await admin.get("/notes/000000000000000000000000").expect(404);
});
test("assigned notes block user deletion until reassigned, including completed notes", async () => {
  const admin = await signIn();
  const note = await Note.create({ ...noteBody(), completed: true });
  await admin.delete(`/users/${staff[2]._id}`).expect(409);
  await admin
    .patch(`/notes/${note._id}`)
    .send({ ...noteBody(), user: String(staff[3]._id) })
    .expect(200);
  await admin.delete(`/users/${staff[2]._id}`).expect(204);
});
test("password changes revoke existing sessions and old credentials", async () => {
  const employee = await signIn("employee");
  const admin = await signIn();
  await admin
    .patch(`/users/${staff[2]._id}`)
    .send({
      username: "employee",
      roles: ["Employee"],
      active: true,
      password: "Changed123!",
    })
    .expect(200);
  await employee.get("/auth/session").expect(401);
  await request(app)
    .post("/auth/login")
    .send({ username: "employee", password: "TechNotes123!" })
    .expect(401);
  await request(app)
    .post("/auth/login")
    .send({ username: "employee", password: "Changed123!" })
    .expect(200);
});
test("role changes take effect without a new session; inactive users lose access", async () => {
  const manager = await signIn("manager");
  const admin = await signIn();
  await admin
    .patch(`/users/${staff[1]._id}`)
    .send({ username: "manager", roles: ["Employee"], active: true })
    .expect(200);
  await manager.get("/users").expect(403);
  await admin
    .patch(`/users/${staff[1]._id}`)
    .send({ username: "manager", roles: ["Employee"], active: false })
    .expect(200);
  await manager.get("/notes").expect(401);
});
test("concurrent tickets have distinct sequential numbers", async () => {
  const notes = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      Note.create({ ...noteBody(), title: `Ticket ${i}` }),
    ),
  );
  assert.deepEqual(
    notes.map((note) => note.ticket).sort((a, b) => a - b),
    Array.from({ length: 10 }, (_, i) => 1000 + i),
  );
});
test("legacy PATCH/DELETE body IDs are supported and malformed JSON returns 400", async () => {
  const admin = await signIn();
  const note = await Note.create(noteBody());
  await admin
    .patch("/notes")
    .send({ ...noteBody(), id: String(note._id), completed: true })
    .expect(200);
  await admin
    .delete("/notes")
    .send({ id: String(note._id) })
    .expect(204);
  await admin
    .post("/notes")
    .set("Content-Type", "application/json")
    .send("{")
    .expect(400);
});
