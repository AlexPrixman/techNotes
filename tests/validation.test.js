import { test } from "node:test";
import assert from "node:assert/strict";
import {
  username,
  password,
  roles,
  objectId,
  text,
  boolean,
  HttpError,
  publicUser,
} from "../lib/validation.js";
import { loadConfig } from "../config.js";
test("normalizes valid input without coercing objects", () => {
  assert.equal(username("  Alice_1 "), "Alice_1");
  assert.equal(text(" repair ", "Title"), "repair");
  assert.deepEqual(roles(["Employee", "Employee"]), ["Employee"]);
});
test("rejects malformed usernames, roles, IDs, descriptions and booleans", () => {
  for (const value of ["a", "user space", {}, null])
    assert.throws(() => username(value), HttpError);
  for (const value of [[], ["Owner"], "Admin", null])
    assert.throws(() => roles(value), HttpError);
  for (const value of ["bad-id", {}, 123])
    assert.throws(() => objectId(value), HttpError);
  assert.throws(() => text("  ", "Description"), HttpError);
  assert.throws(() => text("long", "Title", 3), HttpError);
  assert.throws(() => boolean("false", "Completed"), HttpError);
});
test("password length uses UTF-8 bytes to avoid bcrypt truncation", () => {
  assert.equal(password("TechNotes123!"), "TechNotes123!");
  for (const value of ["short", "x".repeat(73), "🔑".repeat(19), {}])
    assert.throws(() => password(value), HttpError);
});
test("public users never include credentials or session metadata", () => {
  assert.deepEqual(
    publicUser({
      _id: "123",
      username: "staff",
      roles: ["Employee"],
      active: true,
      password: "hash",
      sessionVersion: 3,
    }),
    { _id: "123", username: "staff", roles: ["Employee"], active: true },
  );
});
test("production configuration requires a secret and validates ports/cookies", () => {
  assert.throws(() => loadConfig({ NODE_ENV: "production" }), /SESSION_SECRET/);
  assert.throws(() => loadConfig({ PORT: "abc" }), /PORT/);
  assert.throws(() => loadConfig({ COOKIE_SAME_SITE: "none" }), /HTTPS/);
  const config = loadConfig({
    NODE_ENV: "production",
    SESSION_SECRET: "x".repeat(32),
    TRUST_PROXY: "1",
    CLIENT_ORIGINS: " https://example.com ",
  });
  assert.equal(config.trustProxy, true);
  assert.deepEqual(config.origins, ["https://example.com"]);
});
