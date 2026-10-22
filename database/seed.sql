-- ============================================================
-- Smart Campus Lost & Found System - Database Initialization
-- Institution: The National Institute of Engineering (NIE), Mysuru
-- ============================================================
-- 
-- The system database is populated exclusively through genuine campus user activity
-- (student registration via the web portal and real lost/found reports).
-- 
-- In accordance with project privacy and authentic data requirements, no fictional
-- student identities, sample accounts, or simulated lost/found reports are seeded by default.
--
-- To initialize the complete relational schema (all 10 tables, indexes, and foreign keys):
--     mysql -u root -p < database/schema.sql
--
-- To provision an authorized campus administrator account securely:
--     cd backend
--     python create_admin.py
-- ============================================================

USE campus_lost_found;

-- Database ready for authentic campus activity.
