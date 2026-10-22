# Smart Campus Lost & Found System — Backend API

FastAPI-powered RESTful backend service for The National Institute of Engineering (NIE), Mysuru.

---

## 🛠️ Tech Stack & Key Libraries

- **Framework**: FastAPI (Python 3.10+)
- **ORM & Database Driver**: SQLAlchemy 2.0+ & PyMySQL (MySQL 8.0+)
- **Security & Cryptography**: Bcrypt (salted password hashing), PyJWT (HS256 tokens)
- **Data Validation & Serialization**: Pydantic V2
- **Testing**: Pytest, HTTPX (Async & synchronous test client), SQLite in-memory test isolation

---

## 📁 Architecture Directory Structure

```
backend/
├── app/
│   ├── config.py              # Central environment variables & database configuration
│   ├── database.py            # SQLAlchemy engine, session maker, resilient pool & health check
│   ├── main.py                # FastAPI app factory, CORS, static uploads, health probe
│   ├── models/                # SQLAlchemy declarative ORM models
│   │   ├── user.py            # User credentials, roles (student/staff/admin), status
│   │   ├── lost_item.py       # Lost item reports with masked identifying marks
│   │   ├── found_item.py      # Found item reports with storage location & finder info
│   │   ├── match.py           # Computed match pairings with confidence scores
│   │   ├── claim.py           # Ownership claims, verification answers, admin reviews
│   │   ├── message.py         # Claim-based direct messaging between owner/finder
│   │   └── notification.py    # Targeted user notification records
│   ├── schemas/               # Pydantic validation models (V2 ConfigDict)
│   ├── services/
│   │   ├── auth_service.py    # Password hashing, JWT token generation, auth dependencies
│   │   ├── matching_engine.py # 4-factor scoring: Category, Description, Location, Time
│   │   └── notification_service.py # User-targeted alerts for matches, claims, chat
│   └── routers/               # Modular REST API endpoints
│       ├── auth.py            # /api/auth (register, login, me, recover password)
│       ├── items.py           # /api/items, /api/lost-items, /api/found-items, /api/users/me/reports
│       ├── matches.py         # /api/matches (my-matches, item-specific matches, status updates)
│       ├── claims.py          # /api/claims (create, review, verify, resolve)
│       ├── messages.py        # /api/claims/{id}/messages (in-app messaging)
│       ├── notifications.py   # /api/notifications (read receipts, unread counter)
│       ├── dashboard.py       # /api/dashboard (personalized user statistics)
│       └── admin.py           # /api/admin (campus metrics, all claims, matches, users)
├── uploads/                   # Local storage for uploaded item photographs
├── tests/                     # 20+ automated unit & end-to-end integration test suites
│   ├── conftest.py            # In-memory SQLite fixtures & authenticated mock clients
│   ├── test_system.py         # Comprehensive lifecycle integration test
│   ├── test_auth.py           # Registration, login, JWT token validity
│   ├── test_items.py          # Item reporting, file upload, search & privacy masking
│   ├── test_matching.py       # Multi-factor matching engine logic & thresholds
│   ├── test_claims.py         # Claim lifecycle, ownership verification
│   ├── test_notifications.py  # User-targeted notifications & read status
│   └── test_admin.py          # Admin-only dashboard & claim management
├── requirements.txt           # Python dependency specifications
└── .env                       # Local environment configuration
```

---

## 🚀 Setup & Execution Guide

### 1. Prerequisites & Virtual Environment
Ensure Python 3.10+ is installed:
```powershell
# From project root:
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Configure Environment (`.env`)
Create or edit `backend/.env`:
```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=smart_campus_db
SECRET_KEY=nie-smart-campus-super-secret-jwt-key-2026-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=5
```

### 3. Run the Development Server
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🔍 API Documentation & Endpoints

Once running, visit:
- **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Alternative**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **System Health Status**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 🧪 Running Automated Tests

Run the full automated test suite using pytest:
```powershell
pytest -v
```
All 20 test suites execute using isolated in-memory SQLite fixtures with full coverage across authentication, item reporting, privacy masking, automated matching, claims, messaging, and admin oversight.
