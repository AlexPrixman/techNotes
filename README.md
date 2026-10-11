# techNotes API

A working service-note and staff-management API for a small service team. The companion [React frontend](https://github.com/AlexPrixman/technotes_frontend) provides the complete browser workflow.

## What works

- Staff sign-in, persistent HttpOnly cookie sessions, logout, and password-change session revocation.
- Employees create, view and update their own assignments. Managers and Admins manage all notes and staff.
- Managers cannot grant Admin access or modify Admin accounts. Users cannot delete themselves; Admins cannot remove their own Admin access.
- Create, edit, complete, reassign and delete service notes, with atomic ticket numbering beginning at 1000.
- Case-insensitive unique usernames/titles, active-assignee validation, and protected deletion of users with assigned notes.
- Password hashing, origin allowlists, sign-in rate limiting, bounded JSON payloads, security headers and consistent error responses.

## Stack

Node.js 24, Express 5, Mongoose 9, MongoDB 8, bcryptjs and MongoDB-backed express-session. Tests use the Node test runner, Supertest and an isolated real MongoDB process via mongodb-memory-server.

The v1 API could not start because routers were missing; note creation called `.exec()` on a promise; CORS/middleware ordering was broken; there was no authentication. Those paths are implemented and tested in v2. The unmaintained mongoose-sequence plugin is replaced by an atomic database counter; native bcrypt and obsolete helpers are removed. Unused Atlas application exports are removed from the runtime source.

## Run locally

Requires Node.js 24 and MongoDB 8 (local installation, Docker, or an Atlas URI).

```sh
npm ci
cp .env.example .env
# If you use Docker for the database:
docker compose up -d mongo
npm run seed
npm run dev
```

The API listens on `http://127.0.0.1:4000`. Configure `MONGODB_URI` in `.env` to use another database. Development generates an ephemeral session secret if omitted; set `SESSION_SECRET` to persist sessions across restarts.

The additive seed creates `admin`, `manager`, `employee`, all with development password `TechNotes123!`, and one example note. **It never resets existing accounts or passwords.** Set `SEED_PASSWORD` to customize new account passwords. Production seeding requires a custom password of at least 12 characters.

Run the frontend in a second terminal (see its README). Its `/api` development proxy routes requests to this API.

## Tests

```sh
npm test
npm audit
```

Unit tests cover validation, password byte limits, public-user serialization and environment configuration. Integration tests cover real session persistence, permissions, complete CRUD, concurrency, CORS, duplicate handling, invalid data and account lifecycle. Tests create and delete their own isolated MongoDB instance and never read `MONGODB_URI`.

The first test run downloads the pinned MongoDB 8.0.16 test binary. It requires network access and an OS supported by mongodb-memory-server. For complete browser tests, follow the frontend README; `npm run start:e2e` is a test-only seeded server on port 4001.

## API contract

All private endpoints require a session cookie. Error payloads are `{ "message": "..." }`; empty collections return `[]`, and successful deletes return `204`.

| Method             | Endpoint           | Purpose                               |
| ------------------ | ------------------ | ------------------------------------- |
| GET                | `/health`          | Database-aware readiness              |
| POST               | `/auth/login`      | `{ username, password }` → `{ user }` |
| GET                | `/auth/session`    | Current staff identity                |
| POST               | `/auth/logout`     | Destroy session                       |
| GET                | `/users/assignees` | Active staff available for assignment |
| GET, POST          | `/users`           | List/create staff (Manager/Admin)     |
| PATCH, DELETE      | `/users/:id`       | Update/delete staff (Manager/Admin)   |
| GET, POST          | `/notes`           | List visible notes/create note        |
| GET, PATCH, DELETE | `/notes/:id`       | Read/update/delete note               |

Create user: `{ username, password, roles }`. Update user: `{ username, roles, active, password? }`; an empty password preserves the existing one. Valid roles: `Employee`, `Manager`, `Admin`.

Create/update note: `{ user: "ObjectId", title, text, completed }`. Timestamps/ticket numbers are server-owned. The original `PATCH`/`DELETE /users` and `/notes` routes also accept an `id` in the JSON body for compatibility.

## Deployment

Use `npm start` or the included Dockerfile. MongoDB and frontend hosting are separate services. The frontend also includes a Docker Compose configuration for running the entire stack together.

For HTTPS deployment set `NODE_ENV=production`, a random `SESSION_SECRET` of at least 32 characters, `MONGODB_URI` and the exact `CLIENT_ORIGINS`. Enable `TRUST_PROXY=1` only behind one trusted reverse proxy. Secure cookies require HTTPS in production. The simplest browser deployment serves frontend and API under one origin, with `/api` reverse-proxied to the API. `COOKIE_SAME_SITE=none` is supported only with production HTTPS if separate cross-site origins are required.

Startup fails clearly if the database is unavailable, indexes cannot be built or configuration is invalid. Shutdown closes the HTTP server, session store and database connection.

## Existing data

Startup backfills normalized username/title keys and aligns the counter with existing ticket numbers before explicitly creating indexes. It does not drop collections or reset records. Existing case-insensitive duplicates must be resolved before unique indexes can be created. Sessions from v1 did not exist; passwords created with bcrypt continue to work with bcryptjs.

## Structure

`app.js` builds the testable Express app; `server.js` owns connection/listening/shutdown. Controllers implement workflows; models own persistence; middleware enforces auth; `lib/validation.js` defines boundary validation; `scripts` contains additive seeding and isolated test startup; `tests` contains unit and integration coverage.

GitHub Actions runs the tests and dependency audit for pushes and pull requests.
