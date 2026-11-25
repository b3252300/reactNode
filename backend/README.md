# Authentication API

## Setup

1. From this directory, copy `.env.example` to `.env`, then set `MONGODB_URI`, `CLIENT_ORIGIN`, and a unique `JWT_ACCESS_SECRET` (at least 32 characters). For example: `cp .env.example .env`.
2. Start MongoDB, then run `npm install` and `npm run dev` from this directory. `node app.js` is also supported.
3. Run the Vite frontend from `../frontend`; its development proxy forwards `/api` to `http://localhost:4000`.

The production frontend should use the same site as the API (preferably through a reverse proxy). If deploying on different sites, use HTTPS and set `COOKIE_SAME_SITE=none`; browsers then require secure cookies. `CLIENT_ORIGIN` must always be one exact origin, never `*`.

## Register an account

Use the registration page at `/register`, or send a request to the API. A successful registration creates the account and sets the same httpOnly authentication cookies used by login.

```sh
curl -i http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Example User","email":"person@example.com","password":"a-strong-password"}'
```

Registration requires a name, a valid email address, and a password of at least 12 characters. Passwords are bcrypt-hashed before storage; duplicate email addresses receive a `409` response. Registration is limited to five attempts per hour per client IP.

## Endpoints

- `POST /api/auth/login` — validate credentials and set httpOnly cookies.
- `POST /api/auth/register` — create an account and set httpOnly cookies; limited to five requests per hour.
- `POST /api/auth/logout` — revoke the refresh token and clear cookies.
- `POST /api/auth/refresh` — atomically rotate the refresh token.
- `GET /api/auth/me` — return the current user; requires the access-token cookie.

Access tokens last 15 minutes. Refresh tokens last 7 days and are stored only as SHA-256 hashes with MongoDB TTL cleanup.
