# Production Deployment Guide

## Smart Campus Lost & Found System — NIE Mysuru

This guide provides step-by-step instructions for deploying the frontend, backend, and database to production environments.

---

## 1. Prerequisites

Before commencing deployment, ensure you have:
1. Access to GitHub repository: `https://github.com/Kanakachala-boom/smart-campus-lost-found`.
2. An account on **Cloudflare Pages** (or **Vercel**) for frontend hosting.
3. An account on **Render** or **Railway** for backend and database hosting.
4. An institutional or transactional SMTP service (e.g. Google Workspace SMTP relay or Brevo/SendGrid) for email notifications.
5. Domain or subdomains (optional): `lostfound.nie.ac.in` and `api.lostfound.nie.ac.in`.

---

## 2. Database Setup (MySQL 8)

### Option A: Railway Managed MySQL 8
1. Log in to [Railway](https://railway.app/).
2. Create a **New Project** -> Select **Provision MySQL**.
3. Under the database **Variables** tab, note down:
   - `MYSQLHOST`
   - `MYSQLPORT` (default 3306)
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE` (create `campus_lost_found`)
4. Connect via MySQL Workbench or command line:
   ```bash
   mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p <MYSQLDATABASE>
   ```
5. Apply the initial schema:
   Run the statements from `database/schema.sql` or restore the latest verified backup from `database/backups/`.

### Option B: Dedicated Ubuntu VPS / On-Campus Server
1. Install Docker & Docker Compose:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose
   ```
2. Deploy the containerized stack using `docker-compose.prod.yml`:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

---

## 3. Backend Deployment (Render / Railway)

### Using Docker (Recommended)
1. In Render or Railway, choose **Deploy from GitHub repo**.
2. Select repository: `Kanakachala-boom/smart-campus-lost-found`.
3. Set the Root Directory to `backend` (or use the root `Dockerfile`).
4. Select environment: **Docker**.
5. Configure the following Environment Variables in the provider dashboard:
   - `ENVIRONMENT`: `production`
   - `ENABLE_DOCS`: `false`
   - `DB_HOST`: `<your-db-host>`
   - `DB_PORT`: `3306`
   - `DB_USER`: `<your-db-user>`
   - `DB_PASSWORD`: `<your-secure-db-password>`
   - `DB_NAME`: `campus_lost_found`
   - `JWT_SECRET_KEY`: `<generate-a-strong-64-character-random-key>`
   - `CORS_ORIGINS`: `https://lostfound.nie.ac.in,https://smart-campus-lost-found.pages.dev`
   - `SMTP_HOST`: `smtp.gmail.com`
   - `SMTP_PORT`: `587`
   - `SMTP_USERNAME`: `lostandfound@nie.ac.in`
   - `SMTP_PASSWORD`: `<app-password>`
   - `SMTP_FROM_EMAIL`: `lostandfound@nie.ac.in`
6. Deploy the service.
7. Verify health endpoints:
   - `GET https://<your-backend-domain>/api/health` -> `{"status":"ok", ...}`
   - `GET https://<your-backend-domain>/api/health/ready` -> `{"status":"ready", "database":"connected"}`

---

## 4. Frontend Deployment (Cloudflare Pages)

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **Pages** -> **Create a project**.
2. Connect to GitHub repo `Kanakachala-boom/smart-campus-lost-found`.
3. Build Settings:
   - **Framework preset:** `Vite`
   - **Root directory:** `frontend`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Environment Variables:
   - `VITE_API_BASE_URL`: `https://<your-backend-domain>` (e.g., `https://api.lostfound.nie.ac.in`)
5. Deploy Site.
6. Verify SPA Routing:
   - Direct navigation to `/login`, `/dashboard`, `/my-reports` functions without 404 errors (handled by `frontend/public/_redirects`).

---

## 5. Post-Deployment Verification

1. Open `https://<frontend-domain>/login`.
2. Confirm the login page displays:
   - Placeholder: `Enter your email`
   - Label: `College Email ID`
   - Helper text: `Must end with @nie.ac.in`
3. Test registering an institutional test account (`<usn>@nie.ac.in`).
4. Test reporting a lost item, checking matches, and submitting a claim.
5. Confirm that `/docs` and `/redoc` return 404 Not Found when `ENABLE_DOCS=false`.
