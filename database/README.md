# Database — Smart Campus Lost & Found System
Institution: The National Institute of Engineering (NIE), Mysuru

This directory contains the relational database schema, initial seed data, and configuration scripts for **MySQL 8.0+**.

The standardized database name across configuration, schema, and application code is:
```
campus_lost_found
```

---

## Database Architecture & Required Tables

The schema (`database/schema.sql`) initializes the `campus_lost_found` database using `utf8mb4` character set and `InnoDB` engine with the following 10 core tables:

1. **`users`**: Campus student, faculty, and administrative accounts with `@nie.ac.in` domain validation, USN / Staff IDs, bcrypt password hashes, and roles (`STUDENT`, `ADMIN`).
2. **`lost_items`**: Lost item reports with category, description, location, confidential identifying marks, and lifecycle status (`ACTIVE`, `POTENTIAL_MATCH`, `RECLAIMED`, `CLOSED`).
3. **`found_items`**: Found item reports with physical custody location (security desk/department office), handover preferences, and challenge question prompts.
4. **`matches`**: Automated similarity scores computed by the FastAPI matching engine pairing lost and found reports. Enforces unique pair constraint (`uq_matches_pair`).
5. **`claims`**: Ownership verification claims submitted by lost-item owners, tracking verification notes, claimant responses, status (`PENDING`, `VERIFIED`, `REJECTED`), and review notes.
6. **`ownership_verifications`**: Formal audit records of proof inspections and verification outcomes conducted by security or finders.
7. **`messages`**: Private, in-app messaging history between authorized claimants, finders, and administrators linked directly to the specific found-item report and claim.
8. **`notifications`**: Targeted user-specific notifications for potential matches, claim status updates, and private chat messages with direct routing URLs (`/items/found/{id}`).
9. **`reclaim_records`**: Final chain-of-custody handover confirmations recording owner, finder, date, and physical campus handover location.
10. **`password_reset_tokens`**: Secure, single-use, 15-minute expiring SHA-256 tokens for institutional password recovery.

---

## Setup & Initialization Instructions (Windows PowerShell)

Ensure the MySQL 8 service is running. In an Administrator PowerShell terminal:
```powershell
Start-Service MySQL80
# or
net start MySQL80
```

### Step 1: Initialize Schema & Tables
From the project root:
```powershell
mysql -u root -p < database/schema.sql
```
*Creates the `campus_lost_found` database and all 10 required relational tables, foreign key constraints, indexes, and triggers. No sample accounts or demo reports are inserted.*

### Step 2: Provision an Authorized Campus Administrator
To establish the initial administrator account securely with institutional domain validation and salted bcrypt password hashing:
```powershell
cd backend
.\venv\Scripts\python.exe create_admin.py
```
*Follow the interactive prompt to enter your official Administrator Full Name, Staff ID, Institutional Email (`@nie.ac.in`), and Secure Password.*

### Step 3: Verify Database Tables and Structure
```powershell
mysql -u root -p -e "USE campus_lost_found; SHOW TABLES;"
```
Expected output: 10 tables (`claims`, `found_items`, `lost_items`, `matches`, `messages`, `notifications`, `ownership_verifications`, `password_reset_tokens`, `reclaim_records`, `users`).

### Step 4: Authentic Student Registration
Students create their genuine accounts by clicking "Register" on the frontend portal (`http://localhost:5173/register`) with their valid `@nie.ac.in` institutional email. All data is written directly to MySQL.

