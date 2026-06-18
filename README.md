# NULL DEVS — Full Stack

## Structure
```
nulldevs/
├── server/
│   ├── index.js              # Express app entry
│   ├── routes/
│   │   └── contact.js        # Contact API — validation, rate limit, spam check
│   ├── middleware/
│   │   └── errors.js         # 404 + global error handler
│   └── utils/
│       ├── email.js          # Nodemailer — notification + auto-reply
│       └── logger.js         # Structured console logger
├── public/
│   ├── index.html            # Full site — all sections
│   ├── css/main.css          # All styles — tokens, layout, components, dark mode
│   └── js/main.js            # All interactions — particles, form, reveal, tabs
├── .env.example              # Copy to .env and fill in
└── package.json
```

## Setup

```bash
cp .env.example .env
# Edit .env — add your SMTP credentials and email addresses
npm install
npm start
```

Server runs on `PORT` (default 3000).

## Environment Variables

| Variable | Purpose |
|---|---|
| `PORT` | Server port (default 3000) |
| `NODE_ENV` | `production` or `development` |
| `SMTP_HOST` | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | Usually 587 (TLS) or 465 (SSL) |
| `SMTP_USER` | Your email username |
| `SMTP_PASS` | App password (not your login password) |
| `CONTACT_TO` | Where contact submissions are sent |
| `CONTACT_FROM` | From address on notification emails |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms (default 15 min) |
| `RATE_LIMIT_MAX` | Max requests per window (default 300) |
| `CONTACT_RATE_LIMIT_MAX` | Max contact submissions per IP per hour (default 5) |

## Security included
- `helmet` — 13 HTTP security headers including CSP, HSTS, X-Frame-Options
- `express-rate-limit` — Global + per-route (contact form: 5/IP/hour)
- `express-validator` — Input sanitization and whitelisting
- Honeypot field — bots fill it, humans don't see it
- Spam pattern detection — keywords + URL detection
- HTML escaping in all email templates
- Body size limit (16kb)
- No stack traces exposed in production

## Email without SMTP
If SMTP is not configured, form submissions are logged to console.
You'll see `📧 [EMAIL LOG]` entries. Useful for development.

## For Gmail SMTP
1. Enable 2FA on your Google account
2. Go to Google Account → Security → App Passwords
3. Generate an app password for "Mail"
4. Use that as `SMTP_PASS` (not your normal password)

## Deploy to Render / Railway / Fly.io
Set all environment variables in the platform dashboard.
The app listens on `0.0.0.0:PORT` — works with any platform.
