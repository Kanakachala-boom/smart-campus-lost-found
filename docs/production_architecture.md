# Production Architecture

## Smart Campus Lost & Found System
**Institution:** The National Institute of Engineering (NIE), Mysuru  
**System Version:** 1.0.0-prod  
**Classification:** Enterprise Academic Application  

---

## 1. Executive Architecture Overview

The Smart Campus Lost & Found System is architected as a decoupled, multi-tier web application designed for high security, zero-cost-to-low-cost academic sustainability, strict data privacy, and high availability.

```
                     +---------------------------------------+
                     |    NIE Mysuru Campus Network / Internet|
                     +---------------------------------------+
                                        |
                                        v (HTTPS / TLS 1.3)
                     +---------------------------------------+
                     |      Edge CDN & Static Hosting        |
                     | (Cloudflare Pages / Vercel / Netlify) |
                     |      - SPA Fallback Routing           |
                     |      - Brotli/Gzip Edge Caching       |
                     |      - DDoS Protection                |
                     +---------------------------------------+
                                        |
                                        | REST API Calls (HTTPS / JSON)
                                        | (Bearer JWT in Authorization Header)
                                        v
                     +---------------------------------------+
                     |     Application Hosting Service       |
                     |        (Render / Railway / VPS)       |
                     |  Dockerized Python 3.12 + FastAPI     |
                     |  - Uvicorn Multi-Worker ASGI          |
                     |  - SecurityHeadersMiddleware          |
                     |  - RateLimitMiddleware (IP Sliding)   |
                     |  - Structured Logging & Health Probes |
                     +---------------------------------------+
                                        |
                                        | Resilient Connection Pool
                                        | (SSL/TLS, pool_pre_ping=True)
                                        v
                     +---------------------------------------+
                     |        Managed MySQL 8 Database       |
                     |    (Private Network / Restricted IP)  |
                     |  - UTF8mb4 Unicode Collation          |
                     |  - Relational Integrity (10 Tables)   |
                     |  - Automated Daily Backups            |
                     +---------------------------------------+
```

---

## 2. Component Details

### A. Frontend Layer (Single-Page Application)
- **Framework:** React 18 + Vite (SPA)
- **Styling:** Responsive Modern UI (Tailored CSS, accessible cards, modal dialogs)
- **Routing:** React Router v6 with SPA fallback support (`_redirects` and `vercel.json`)
- **Hosting Targets:**
  - **Primary:** Cloudflare Pages (Free, Unlimited Bandwidth, Global Anycast CDN, Automatic SSL).
  - **Alternative:** Vercel / Netlify.
- **Security Posture:**
  - Zero secrets compiled into client bundles.
  - Runtime API URL injected via `VITE_API_BASE_URL`.
  - Content Security Policy (CSP) compliant; assets served with cache-busting hashes.

### B. Backend Application Layer (REST API)
- **Runtime:** Python 3.12 (multi-stage Debian slim container)
- **Framework:** FastAPI with Uvicorn ASGI server
- **Security Middlewares:**
  - `SecurityHeadersMiddleware`: Injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Strict-Transport-Security`, and `Referrer-Policy: strict-origin-when-cross-origin`.
  - `RateLimitMiddleware`: In-memory sliding window IP rate limiter on sensitive authentication endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`).
  - `CORSMiddleware`: Strict origin allowlisting matching production frontend domains.
- **Authentication & Authorization:**
  - Institutional email verification (`@nie.ac.in`).
  - Bcrypt password hashing (salted).
  - Stateles HS256 JWT access tokens with short TTL (60 min).
  - Role-based authorization (`STUDENT`, `STAFF`, `ADMIN`).
- **File Upload Security:**
  - File size restricted (max 5 MB).
  - Magic byte MIME verification (JPEG, PNG, GIF, WebP) to prevent disguised executable uploads.
  - Sanitized filenames generated via cryptographic UUIDs.

### C. Data Persistence Layer
- **Engine:** MySQL 8.0 with InnoDB storage engine.
- **Connection Management:** SQLAlchemy connection pooling (`pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`, `pool_recycle=3600`).
- **Data Protection:**
  - Strict foreign keys and cascade rules preventing orphan records.
  - Automated logical backup pipeline (`database/backup.py`).
  - Disposable database restoration test suite (`database/restore_verification.py`).

---

## 3. Hosting & Infrastructure Provider Comparison

| Provider | Layer | Tier / Features | Estimated Monthly Cost | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **Cloudflare Pages** | Frontend | Free Tier: Unlimited requests, automatic SSL, DDoS protection | **$0.00** | **Recommended (Primary)** |
| **Vercel** | Frontend | Hobby Tier: 100GB bandwidth, instant Git deploys | **$0.00** | High-quality alternative |
| **Render** | Backend | Free Tier: 512MB RAM (spins down after inactivity) / Starter: $7/mo | **$0.00 – $7.00** | **Recommended (Backend)** |
| **Railway** | Backend + DB | Hobby Plan: $5/month usage credit, persistent MySQL 8 service | **$5.00** | **Recommended (Full-Stack)** |
| **Aiven / PlanetScale** | Database | Developer Tier: Managed MySQL with automated backups | **$0.00 – $10.00** | Dedicated DB option |
| **Campus On-Premises** | All | NIE Internal VM (Ubuntu 22.04 LTS + Docker Compose) | **$0.00** | Ideal for official NIE LAN |

### Total Estimated Cost
- **Zero-Cost Tier:** Cloudflare Pages (Frontend) + Render Free (Backend) + Free Managed MySQL (Aiven/Railway trial) = **$0.00/month**.
- **Production Standard Tier:** Cloudflare Pages (Frontend) + Railway Backend + Railway MySQL 8 = **~$5.00 – $7.00/month**.

---

## 4. Disaster Recovery & Availability Targets

- **Recovery Point Objective (RPO):** 24 hours (daily logical SQL snapshots via `database/backup.py`).
- **Recovery Time Objective (RTO):** < 15 minutes (tested and verified restoration into isolated test databases).
- **Service Uptime Objective:** 99.5% during academic semesters.
