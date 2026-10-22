# Smart Campus Lost & Found System

### The National Institute of Engineering (NIE), Mysuru
An enterprise-grade, full-stack digital platform designed for collegiate campuses to streamline lost item reporting, found item logging, multi-factor automated similarity matching, secure ownership claims, and private in-report messaging between verified finders and owners.

---

## 📌 Project Overview & Objectives

In collegiate environments, personal belongings such as ID cards, keys, calculators, electronics, and lab equipment are frequently misplaced across campus facilities (classrooms, laboratories, libraries, seminar halls, and sports grounds). The **Smart Campus Lost & Found System** eliminates chaotic physical bulletin boards and unverified social media group posts by providing:

1. **Centralized Campus Registry:** Real-time visibility into all lost and found items on campus.
2. **Privacy by Design:** Confidential identifying markings (such as secret engraving, lockscreen wallpaper, or unique scuffs) are hidden from public view to prevent fraudulent claims.
3. **Automated Bidirectional Matching:** A 4-factor scoring algorithm (category, text tokens, campus location, and date proximity) connects compatible reports instantly upon registration.
4. **Item-Anchored Private Messaging:** Direct, confidential coordination between the finder and claimant right inside the specific found-item report.
5. **Verified Chain of Custody:** Strict verification challenge questions, handover logging, and administrative oversight ensuring belongings return safely to their rightful owners.

---

## 👥 User Roles & Access Control

| Role | Permissions & Responsibilities |
| :--- | :--- |
| **Student / Faculty (`STUDENT`)** | • Report lost belongings and specify hidden identifying details.<br>• Log found items and specify physical custody location (e.g. Security Desk, Dept Office).<br>• View potential matches and receive targeted notifications with direct links.<br>• Submit ownership claims and verification proof.<br>• Engage in private, secure chat directly on the found-item report.<br>• Mark items as recovered once returned. |
| **Campus Admin / Security (`ADMIN`)** | • Complete operational oversight across all campus reports.<br>• Review pending ownership claims and inspect submitted evidence.<br>• Execute verified handover handoffs and generate terminal reclaim records.<br>• Manage system-wide categories, location taxonomies, and analytics dashboard.<br>• Enforce 180-day data retention cleanup policies. |

---

## 🏗️ Technology Stack & Architecture

| Layer | Technology | Implementation Details |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite | Component-driven SPA, institutional design tokens, dark/light theme, live FastAPI integration (`VITE_USE_MOCK=false`), real-time form validation, Lucide icons. |
| **Backend** | FastAPI (Python 3.10+) | Asynchronous REST API, Pydantic V2 data contracts, OpenAPI/Swagger interactive documentation, structured CORS middleware. |
| **Database** | MySQL 8.0+ / PyMySQL | Fully normalized relational schema (`campus_lost_found`) with cascading foreign keys, multi-column indexes, and unique constraints. |
| **ORM** | SQLAlchemy 2.0+ | Modern declarative mapping, connection pooling with health diagnostics. |
| **Authentication** | Bcrypt & PyJWT | Salted password hashing, stateless HS256 JWT tokens with role-based authorization (`STUDENT`, `ADMIN`), institutional `@nie.ac.in` domain validation. |
| **Matching Engine** | Multi-Factor Engine | Weighted similarity scoring: Category (30%), Stemmed Text & Synonyms (35%), Campus Location Proximity (20%), Date/Temporal Proximity (15%). |

---

## 📁 Repository Folder Structure

```
smart-campus-lost-found/
├── backend/
│   ├── app/
│   │   ├── config.py              # Environment variable management (.env)
│   │   ├── database.py            # SQLAlchemy database engine and connection health check
│   │   ├── main.py                # FastAPI application entry point, CORS, static uploads
│   │   ├── models/                # Database entities: User, LostItem, FoundItem, Match, Claim, Message, Notification
│   │   ├── schemas/               # Pydantic data validation and serialization contracts
│   │   ├── services/
│   │   │   ├── auth_service.py    # Salted bcrypt password hashing & JWT token handling
│   │   │   ├── email_service.py   # Honest SMTP integration for resets, matches, and claim alerts
│   │   │   ├── matching_engine.py # 4-factor automated similarity matching
│   │   │   ├── notification_service.py # Targeted user notification dispatcher
│   │   │   └── sms_service.py     # SMS provider adapter
│   │   └── routers/               # RESTful endpoint handlers (auth, items, matches, claims, messages, notifications, admin)
│   ├── tests/                     # 42 automated unit & integration test suites
│   ├── uploads/                   # Multipart file upload storage directory
│   ├── requirements.txt           # Python backend dependencies
│   ├── .env.example               # Backend configuration template
│   └── README.md                  # Backend service documentation
├── frontend/
│   ├── src/
│   │   ├── components/            # Reusable UI components (Buttons, Cards, Badges, Modals, StateViews)
│   │   ├── context/               # AuthContext (session, login, token refresh), ThemeContext
│   │   ├── pages/                 # Full view pages: Register, Login, Feeds, Reports, ItemDetail, Admin
│   │   ├── services/              # API abstraction layer (api.js, authService.js, itemsService.js, etc.)
│   │   ├── utils/                 # Storage, image URL resolution, status mappings
│   │   └── styles/tokens.css      # Standardized CSS design tokens
│   ├── package.json               # Frontend dependencies & scripts
│   ├── vite.config.js             # Vite build configuration with proxy
│   ├── .env.example               # Frontend configuration template
│   └── README.md                  # Frontend documentation
├── database/
│   ├── schema.sql                 # Complete MySQL 8.0 DDL schema (10 relational tables)
│   ├── seed.sql                   # Realistic NIE campus test dataset (students, items, matches, claims)
│   └── README.md                  # Database execution instructions
├── docs/                          # Architecture guides and specifications
├── .gitignore                     # Git exclusion rules (secrets, build outputs, node_modules, venvs)
└── README.md                      # Project master documentation
```

---

## 💻 Prerequisites & Software Requirements

Before setting up the project locally, install the following required software:

1. **Git:** [Download Git for Windows/macOS/Linux](https://git-scm.com/downloads)
2. **Python (3.10 to 3.12):** [Download Python](https://www.python.org/downloads/) *(Ensure "Add Python to PATH" is checked during installation)*
3. **Node.js (v18.0.0 or higher) & npm:** [Download Node.js LTS](https://nodejs.org/)
4. **MySQL Community Server 8.0+:** [Download MySQL Installer](https://dev.mysql.com/downloads/installer/)

---

## 🚀 Step-by-Step Installation & Setup

### 1. Clone the Repository

Open Windows PowerShell or your preferred terminal:
```powershell
git clone https://github.com/Kanakachala-boom/smart-campus-lost-found.git
cd smart-campus-lost-found
```

---

### 2. Configure Environment Variables

The project uses `.env` files for runtime configuration. Template files with safe default placeholders are provided.

#### A. Backend Configuration
Create `backend/.env` from the template:
```powershell
Copy-Item backend/.env.example backend/.env
```
Open `backend/.env` in your editor and configure your MySQL credentials:
```ini
PORT=8000
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173

# Database Configuration (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=campus_lost_found
DB_USER=root
DB_PASSWORD=your_mysql_root_password

# Authentication / JWT
JWT_SECRET=replace_with_a_secure_random_secret_key_minimum_32_characters
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# File Uploads
UPLOAD_DIR=app/uploads
MAX_UPLOAD_SIZE_MB=5

# SMTP Email Configuration (Optional - for real email dispatch)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@nie.ac.in
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=lostandfound@nie.ac.in
SMTP_USE_TLS=true

FRONTEND_URL=http://localhost:5173
PASSWORD_RESET_EXPIRE_MINUTES=15
```

#### B. Frontend Configuration
Create `frontend/.env` from the template:
```powershell
Copy-Item frontend/.env.example frontend/.env
```
Ensure it contains:
```ini
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCK=false
```

> [!SECURITY]
> Never commit `.env` files containing real passwords, database secrets, or API keys to GitHub. Both `backend/.env` and `frontend/.env` are strictly excluded in `.gitignore`.

---

### 3. Initialize the MySQL Database

Ensure your MySQL service is running. In Windows PowerShell:
```powershell
Get-Service MySQL80
# If stopped, run in an Administrator terminal:
Start-Service MySQL80
```

Initialize the database schema:
```powershell
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS campus_lost_found CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p campus_lost_found < database/schema.sql
```
*Creates the complete relational database with all 10 normalized tables, foreign keys, and indexes. No fictional student identities or fake reports are inserted.*

Verify tables in MySQL:
```powershell
mysql -u root -p -e "USE campus_lost_found; SHOW TABLES;"
```
*Expected: 10 tables (`claims`, `found_items`, `lost_items`, `matches`, `messages`, `notifications`, `ownership_verifications`, `password_reset_tokens`, `reclaim_records`, `users`).*

---

### 4. Setup & Start Backend (FastAPI)

In your first PowerShell terminal, navigate to the `backend` directory:
```powershell
cd "backend"

# Create a Python virtual environment:
python -m venv venv

# Activate virtual environment:
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# (Or in Command Prompt: .\venv\Scripts\activate.bat)

# Upgrade pip and install dependencies:
pip install --upgrade pip
pip install -r requirements.txt

# Create your local environment file:
Copy-Item .env.example .env
# Edit .env and configure your MySQL password (DB_PASSWORD=...)

# Start the FastAPI server:
python -m uvicorn app.main:app --reload --port 8000
```

Verify backend endpoints:
- **API Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Interactive Swagger Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative ReDoc Documentation:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### 5. Setup & Start Frontend (React + Vite)

In a **second** PowerShell terminal, navigate to the `frontend` directory:
```powershell
cd "frontend"

# Install Node dependencies:
npm install

# Create your frontend environment file:
Copy-Item .env.example .env
# (VITE_API_BASE_URL=http://localhost:8000 and VITE_USE_MOCK=false are already configured)

# Start the Vite development server:
npm run dev
```

- **Application URL:** [http://localhost:5173](http://localhost:5173)

---

## 🔐 Real Account Usage & Administrator Provisioning

The application operates exclusively on real user accounts and genuine campus lost/found reports.

### Student & Faculty Registration
Students and faculty register directly via the portal at:
```
http://localhost:5173/register
```
- Requires a valid institutional email ending with `@nie.ac.in`.
- Passwords are salted and hashed with `bcrypt` before storage in MySQL.
- A fresh database starts empty; newly registered users populate the database naturally.

### Administrator Provisioning
Administrator privileges cannot be obtained via the public registration form. To provision an authorized campus administrator for a deployment, execute the provisioning CLI:
```powershell
cd backend
.\venv\Scripts\python.exe create_admin.py
```
This utility prompts for:
1. **Full Name** of the campus administrator
2. **Staff / Employee ID**
3. **Official Campus Email** (must end with `@nie.ac.in`)
4. **Secure Password** (minimum 8 characters)

The script securely hashes the password with bcrypt and establishes the user with `ADMIN` role in MySQL.

---

## 🧪 Validation & Automated Testing

### Running Backend Tests
The backend test suite executes 42 automated tests with full SQLite isolation:
```powershell
cd "backend"
.\venv\Scripts\python.exe -m pytest -v
```
*Coverage includes authentication, password reset, item privacy masking, multi-factor matching, claim verification, item-specific email routing, and found-item report chat authorization.*

### Running Frontend Production Build
Validate that the client application compiles without syntax, bundling, or module resolution errors:
```powershell
cd "frontend"
npm run build
```
*Expected: 1,975+ modules transformed, generating production bundles in `dist/`.*

---

## 🛠️ Common Setup Troubleshooting

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| `Can't connect to MySQL server on 'localhost'` | MySQL service is stopped. | Run `Start-Service MySQL80` or `net start MySQL80` in an Administrator terminal. |
| `Scripts is disabled on this system` (PowerShell error) | PowerShell execution policy restricts script execution. | Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` and re-activate `venv`. |
| `401 Unauthorized` on API requests | Expired or missing JWT token. | Log out and log back in to renew your token. Check that `VITE_API_BASE_URL` in `frontend/.env` matches `http://localhost:8000`. |
| `403 Forbidden` on Item Chat | You are not the finder, claimant, or admin for that found item. | Direct in-report chat is strictly restricted to authorized participants. Log in with the account that reported the item or submitted the claim. |
| `Email delivery skipped (NOT_CONFIGURED)` | SMTP credentials are not set in `backend/.env`. | The system honestly reports unconfigured email states. To enable real email delivery, set valid `SMTP_HOST`, `SMTP_PORT`, and `SMTP_PASSWORD` in `backend/.env`. |

---

## 🔄 Pulling Future Updates (For Teammates)

When team members pull updates from the central repository:
```powershell
# 1. Pull latest commits:
git checkout main
git pull origin main

# 2. Update Python dependencies if requirements.txt changed:
cd backend
.\venv\Scripts\pip.exe install -r requirements.txt

# 3. Update Frontend dependencies if package.json changed:
cd ../frontend
npm install

# 4. Check for database schema updates in database/schema.sql
```

---

## 📄 License & Institutional Credits

Developed for **The National Institute of Engineering (NIE), Mysuru**, Department of Information Science & Engineering.
All rights reserved. Designed for academic and campus utility purposes.
