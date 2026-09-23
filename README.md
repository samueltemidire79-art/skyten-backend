# Skyten Backend — Setup Guide

Beginner-friendly, step-by-step. Follow in order.

## 0. Files already provided in this scaffold

```
skyten-backend/
├── .env.example              ← copy to .env and fill in
├── .gitignore
├── package.json               (you'll generate/edit this)
├── prisma/
│   └── schema.prisma          ← Users, Projects, Tasks, LedgerEntry models
└── src/
    ├── app.js                 ← express app + middleware + routes
    ├── server.js               ← entry point (run this to start the server)
    ├── controllers/
    │   └── auth.controller.js  ← register/login logic
    ├── routes/
    │   ├── auth.routes.js
    │   └── health.routes.js
    ├── middleware/
    │   ├── auth.middleware.js  ← verifyToken + requireRole (RBAC)
    │   └── errorHandler.js
    └── utils/
        └── prismaClient.js     ← shared Prisma Client instance
```

## 1. Initialize the project & install packages

Run these in your terminal, inside the folder where you want the project:

```bash
mkdir skyten-backend && cd skyten-backend
npm init -y
git init
```

Install runtime dependencies:

```bash
npm install express @prisma/client dotenv jsonwebtoken bcryptjs cors
```

Install Prisma CLI as a dev dependency:

```bash
npm install prisma --save-dev
```

Initialize Prisma (creates `prisma/schema.prisma` and a starter `.env`):

```bash
npx prisma init
```

> This scaffold already gives you a filled-in `schema.prisma` and `.env.example` — just copy them into the folders `npx prisma init` created (overwrite the empty ones).

## 2. Set up your `.env` file

```bash
cp .env.example .env
```

Then open `.env` and fill in:
- `DATABASE_URL` — from Supabase: **Project Settings → Database → Connection String → URI**
- `JWT_SECRET` — generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

**Never commit `.env`** — it's already in `.gitignore`.

## 3. Push the schema to your Supabase database

```bash
npx prisma migrate dev --name init
```

This creates the `users`, `projects`, `tasks`, and `ledger_entries` tables in your Supabase Postgres database and generates the Prisma Client.

If you ever change `schema.prisma` later, re-run:
```bash
npx prisma migrate dev --name <describe_the_change>
```

## 4. Add a start script

Open `package.json` and add this under `"scripts"`:

```json
"scripts": {
  "start": "node src/server.js",
  "dev": "node --watch src/server.js"
}
```

(If your Node version is older than 18.11, install `nodemon` instead: `npm install --save-dev nodemon` and use `"dev": "nodemon src/server.js"`.)

## 5. Run it locally

```bash
npm run dev
```

You should see:
```
✅ Skyten backend running on http://localhost:5000
   Health check: http://localhost:5000/api/health
```

Visit `http://localhost:5000/api/health` in your browser — it should return `{"status":"ok","database":"connected"}`. If `database` says `unreachable`, double-check your `DATABASE_URL`.

## 6. Test auth endpoints

Register a user (Postman, Insomnia, or curl):
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@skyten.com","password":"secret123","fullName":"Admin User","role":"ADMIN"}'
```

Log in:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@skyten.com","password":"secret123"}'
```
Copy the returned `token` — pass it as `Authorization: Bearer <token>` on any route protected with `verifyToken`.

## 7. Commit to Git

```bash
git add .
git commit -m "Initial Skyten backend scaffold: auth, RBAC, Prisma schema"
```

## 8. Deploying later (Render + Supabase)

- On Render: create a **Web Service**, connect your GitHub repo, set the **Build Command** to `npm install && npx prisma generate` and **Start Command** to `npm start`.
- Add `DATABASE_URL` and `JWT_SECRET` in Render's **Environment** tab (same values as your `.env`, never commit them).
- Use Supabase's **connection pooling** URL (port 6543) for `DATABASE_URL` in production — Render's servers open many short-lived connections, and pooling avoids exhausting Supabase's connection limit.

## What to build next

- `projects.routes.js` / `projects.controller.js` — client submits bids, Admin accepts/rejects (`requireRole("ADMIN")`)
- `tasks.routes.js` / `tasks.controller.js` — Admin assigns a `Task` to a `User` with a matching `TeamSkill`
- `ledger.routes.js` / `ledger.controller.js` — record `MONEY_IN` / `MONEY_OUT`, `requireRole("ADMIN")` only
- Add `validator` or `zod` for request body validation once routes grow
