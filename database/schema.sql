-- ============================================================
-- Smart Campus Lost & Found System - Database Schema
-- Institution: The National Institute of Engineering (NIE), Mysuru
-- Target RDBMS: MySQL 8.0+
-- Database: campus_lost_found
-- ============================================================

CREATE DATABASE IF NOT EXISTS campus_lost_found
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE campus_lost_found;

-- ------------------------------------------------------------
-- 1. Table: users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    role ENUM('STUDENT', 'ADMIN') DEFAULT 'STUDENT',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. Table: lost_items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lost_items (
    lost_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    color VARCHAR(50),
    brand VARCHAR(100),
    lost_location VARCHAR(150),
    lost_date DATE,
    lost_time TIME,
    image_path VARCHAR(255),
    status ENUM('ACTIVE', 'MATCHED', 'RECLAIMED', 'CLOSED') DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. Table: found_items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS found_items (
    found_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    color VARCHAR(50),
    brand VARCHAR(100),
    found_location VARCHAR(150),
    found_date DATE,
    found_time TIME,
    image_path VARCHAR(255),
    status ENUM('AVAILABLE', 'CLAIMED', 'RETURNED', 'CLOSED') DEFAULT 'AVAILABLE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. Table: matches
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
    match_id INT AUTO_INCREMENT PRIMARY KEY,
    lost_id INT NOT NULL,
    found_id INT NOT NULL,
    matching_score DECIMAL(5,2) NOT NULL,
    match_reason TEXT,
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED') DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lost_id) REFERENCES lost_items(lost_id),
    FOREIGN KEY (found_id) REFERENCES found_items(found_id),
    UNIQUE (lost_id, found_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. Table: claims
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claims (
    claim_id INT AUTO_INCREMENT PRIMARY KEY,
    found_id INT NOT NULL,
    claimant_id INT NOT NULL,
    match_id INT,
    claim_description TEXT,
    status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (found_id) REFERENCES found_items(found_id),
    FOREIGN KEY (claimant_id) REFERENCES users(user_id),
    FOREIGN KEY (match_id) REFERENCES matches(match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. Table: ownership_verifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ownership_verifications (
    verification_id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT NOT NULL,
    question TEXT NOT NULL,
    expected_answer TEXT,
    provided_answer TEXT,
    result ENUM('PENDING', 'PASSED', 'FAILED') DEFAULT 'PENDING',
    verified_by INT,
    verified_at DATETIME,
    FOREIGN KEY (claim_id) REFERENCES claims(claim_id),
    FOREIGN KEY (verified_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. Table: messages
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    claim_id INT NOT NULL,
    message TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (sender_id) REFERENCES users(user_id),
    FOREIGN KEY (receiver_id) REFERENCES users(user_id),
    FOREIGN KEY (claim_id) REFERENCES claims(claim_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 8. Table: notifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    reference_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 9. Table: reclaim_records
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reclaim_records (
    reclaim_id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT NOT NULL,
    lost_id INT NOT NULL,
    found_id INT NOT NULL,
    owner_id INT NOT NULL,
    finder_id INT NOT NULL,
    verification_id INT,
    reclaim_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    handover_location VARCHAR(150),
    status ENUM('COMPLETED', 'CANCELLED') DEFAULT 'COMPLETED',
    remarks TEXT,
    FOREIGN KEY (claim_id) REFERENCES claims(claim_id),
    FOREIGN KEY (lost_id) REFERENCES lost_items(lost_id),
    FOREIGN KEY (found_id) REFERENCES found_items(found_id),
    FOREIGN KEY (owner_id) REFERENCES users(user_id),
    FOREIGN KEY (finder_id) REFERENCES users(user_id),
    FOREIGN KEY (verification_id) REFERENCES ownership_verifications(verification_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 10. Table: password_reset_tokens (Approved for Password Recovery)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
