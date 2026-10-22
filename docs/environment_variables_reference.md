# Environment Variables Reference

## Smart Campus Lost & Found System — NIE Mysuru

This document provides a comprehensive inventory of all configuration variables for the frontend and backend services. **Never place real credentials, keys, or secrets into source control or documentation.**

---

## 1. Backend Environment Variables (`backend/.env`)

| Variable Name | Required | Default Value | Example / Format | Purpose & Description |
| :--- | :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | Yes | `production` | `production`, `development`, `testing` | Application operating mode. Disables test bypasses and enables security headers. |
| `ENABLE_DOCS` | No | `false` | `true`, `false` | Controls whether OpenAPI `/docs` and `/redoc` endpoints are exposed publicly. |
| `DB_HOST` | Yes | `localhost` | `mysql.railway.internal` or IP | Hostname or IP address of the MySQL 8 database server. |
| `DB_PORT` | No | `3306` | `3306` | Port number of the MySQL 8 database service. |
| `DB_USER` | Yes | `lostfound_app` | `lostfound_user` | Application-specific database user with restricted DML privileges. |
| `DB_PASSWORD` | Yes | *None* | `<alphanumeric-password>` | Secure password for the MySQL database user. |
| `DB_NAME` | Yes | `campus_lost_found` | `campus_lost_found` | Name of the active database instance. |
| `DB_POOL_SIZE` | No | `10` | `10` to `20` | Base number of persistent connections in the SQLAlchemy connection pool. |
| `DB_MAX_OVERFLOW` | No | `20` | `10` to `30` | Maximum surge connections allowed above `DB_POOL_SIZE` under traffic spikes. |
| `JWT_SECRET_KEY` | Yes | *None* | `64-character-hex-string` | Secret key used to sign and verify HMAC-SHA256 access tokens. |
| `JWT_ALGORITHM` | No | `HS256` | `HS256` | Cryptographic algorithm for JWT generation. |
| `JWT_EXPIRE_MINUTES` | No | `60` | `15` to `120` | Token validity lifetime in minutes before session re-authentication. |
| `CORS_ORIGINS` | Yes | `http://localhost:5173` | Comma-separated URLs | Whitelist of frontend origins permitted to make cross-origin requests. |
| `SMTP_HOST` | No | `smtp.gmail.com` | `smtp.gmail.com` | Hostname of the outgoing SMTP relay server. |
| `SMTP_PORT` | No | `587` | `587` (TLS) or `465` (SSL) | Port used for secure SMTP communication. |
| `SMTP_USERNAME` | No | *None* | `lostfound@nie.ac.in` | Authenticated username/account for sending notification emails. |
| `SMTP_PASSWORD` | No | *None* | `<app-password>` | App-specific password or API token for SMTP authentication. |
| `SMTP_FROM_EMAIL` | No | *None* | `lostfound@nie.ac.in` | Sender email address displayed in institutional notification emails. |
| `UPLOAD_DIR` | No | `uploads` | `/var/data/uploads` | Path to persistent storage directory for user-uploaded item photos. |
| `TESTING` | No | `false` | `true`, `false` | When `true`, switches to SQLite test database and disables rate limiters. |

---

## 2. Frontend Environment Variables (`frontend/.env`)

| Variable Name | Required | Default Value | Example / Format | Purpose & Description |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Yes | `http://localhost:8000` | `https://api.lostfound.nie.ac.in` | Target backend REST API base URL used by Axios/Fetch client. |

> **Security Note:** Vite exposes variables prefixed with `VITE_` to the browser bundle. Never define secrets, tokens, or database connection strings with the `VITE_` prefix.
