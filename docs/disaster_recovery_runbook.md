# Disaster Recovery and Database Operations Runbook

## Smart Campus Lost & Found System — NIE Mysuru
**Target Database:** `campus_lost_found` (MySQL 8.0)  
**Verification Date:** 2026-10-22  
**Disaster Recovery Status:** VERIFIED & OPERATIONAL  

---

## 1. Recovery Metrics & Objectives

- **Recovery Point Objective (RPO):** 24 hours. (Maximum allowable data age between scheduled backups).
- **Recovery Time Objective (RTO):** < 15 minutes. (Maximum time required to provision a replacement instance, load the SQL dump, and resume service).
- **Integrity Guarantee:** 100% relational fidelity across all 10 application tables with strict foreign key preservation.

---

## 2. Automated Logical Backup Execution

The backup utility `database/backup.py` extracts table schemas via `SHOW CREATE TABLE` and row data using parameterized queries, generating a timestamped, self-contained SQL dump with foreign key safety pragmas.

### Manual Backup Command
```bash
# Windows
.\backend\venv\Scripts\python.exe database\backup.py

# Linux / Container
python database/backup.py
```

### Output File Format
Backups are saved to `database/backups/`:
```
database/backups/backup_campus_lost_found_<YYYYMMDD>_<HHMMSS>.sql
```
*Note: `database/backups/` is strictly ignored by Git in `.gitignore`.*

### Scheduled Automated Backups (Linux Crontab)
To run automated daily backups at 02:00 AM:
```bash
0 2 * * * cd /opt/smart-campus-lost-found && python database/backup.py >> /var/log/campus_backup.log 2>&1
```

---

## 3. Disaster Recovery Restoration Procedure

### Restoration Verification Test
Before applying backups or in quarterly disaster drills, execute the verification tool:
```bash
# Runs full restore into an isolated disposable database and compares row counts
.\backend\venv\Scripts\python.exe database\restore_verification.py
```

### Verified Benchmark Results (2026-10-22)
During validation on the latest production snapshot:
```
[SUCCESS] Restored 10 tables successfully into disposable test database:
    - claims: 11 rows verified
    - found_items: 26 rows verified
    - lost_items: 30 rows verified
    - matches: 74 rows verified
    - messages: 18 rows verified
    - notifications: 138 rows verified
    - ownership_verifications: 0 rows verified
    - password_reset_tokens: 2 rows verified
    - reclaim_records: 9 rows verified
    - users: 23 rows verified
[SUCCESS] Disaster recovery restoration test passed with 100% data fidelity.
```

### Emergency Production Restoration Steps
If the primary database is lost or corrupted:

1. **Stop Application Backend Traffic:**
   ```bash
   docker stop campus_backend
   ```
2. **Locate the Most Recent Verified SQL Backup:**
   ```bash
   ls -lat database/backups/
   ```
3. **Restore into MySQL 8:**
   ```bash
   mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < database/backups/backup_campus_lost_found_20261022_111440.sql
   ```
4. **Run Table Integrity Verification:**
   ```sql
   SELECT table_name, table_rows 
   FROM information_schema.tables 
   WHERE table_schema = 'campus_lost_found';
   ```
5. **Restart Backend Service and Verify Readiness Probe:**
   ```bash
   docker start campus_backend
   curl -I http://localhost:8000/api/health/ready
   ```
   *Expected response:* `HTTP/1.1 200 OK` -> `{"status":"ready","database":"connected"}`
