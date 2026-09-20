# Pottery Logs / Keramický deník

A self-hosted web app for keeping notes on pottery/ceramics production —
firing curves for different kiln controllers, glaze combinations, clay
types, and whatever else comes up. Built to run as a small public service
with account security taken seriously.

- Backend: Node.js + Express + TypeScript, SQLite via Prisma
- Frontend: React + Vite + TypeScript
- Auth: session cookies (DB-backed, so deactivating a user revokes access
  immediately), argon2id password hashing, TOTP two-factor authentication
- i18n: Czech (default) and English, switchable per user

## Features

- Public landing page is the login screen, with self-service account
  creation
- Administrators get a user management screen: list, create, delete, and
  activate/deactivate accounts. Regular users cannot reach admin routes
  (enforced both in the UI and in every admin API endpoint)
- Two-factor authentication (TOTP, e.g. Google Authenticator/Aegis) is
  **mandatory for admin accounts** — enforced server-side, not just in the
  UI — and optional (togglable) for regular users, with one-time backup
  codes
- User section: **Firing curves** (vypalovací křivky) per kiln
  controller, and **Glaze combinations** (kombinace glazur) with clay
  body, firing temperature/cone, and layered glaze notes
- CSRF protection, per-endpoint rate limiting, account lockout after
  repeated failed logins, and a security-conscious Content-Security-Policy

## Repository layout

```
backend/    Express API + Prisma/SQLite
frontend/   React SPA (built and served by the backend in production)
docs/       Deployment guide
```

## Local development

Requires Node.js 20+.

```bash
# Backend
cd backend
npm install
cp .env.example .env      # edit as needed; defaults are fine for local dev
npx prisma migrate dev    # creates backend/data/pottery.db
npm run seed:admin        # creates the first admin from INITIAL_ADMIN_* in .env
npm run dev                # http://localhost:3000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173, proxies /api to :3000
```

Open http://localhost:5173, register a regular account, or sign in with
the admin account you seeded (you'll be required to set up 2FA on first
admin login).

## Production build

```bash
cd backend && npm run build       # prisma generate + tsc -> backend/dist
cd ../frontend && npm run build   # -> frontend/dist
cd ../backend && npm start        # serves the API and the built frontend
                                   # from a single origin/port
```

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for a full walkthrough of
running this in an LXC container on Proxmox (with systemd + a TLS reverse
proxy), which also works unmodified on a Raspberry Pi.

## Security notes

- Session cookies are httpOnly + `Secure` (in production) + `SameSite=Lax`;
  sessions are stored server-side so an admin can revoke a user's access
  immediately by deactivating the account
- CSRF is enforced via a double-submit cookie/header token on every
  state-changing request
- Passwords are hashed with argon2id; accounts lock out for 15 minutes
  after 5 failed login attempts
- Admin accounts cannot disable 2FA once enabled, and cannot use any admin
  or data API until 2FA setup is complete
- Set `COOKIE_SECURE=true` and put the app behind HTTPS in any
  non-local deployment — the auth cookies depend on it
