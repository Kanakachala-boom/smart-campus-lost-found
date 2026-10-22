-- ============================================================
-- Smart Campus Lost & Found System - Development Seed Data
-- Institution: The National Institute of Engineering (NIE), Mysuru
-- ============================================================

USE campus_lost_found;

-- ------------------------------------------------------------
-- Users
-- Default test password for all seeded users: Password@123
-- ------------------------------------------------------------
INSERT INTO users (user_id, name, student_staff_id, email, phone, password_hash, role, is_active, created_at)
VALUES
(1, 'Kanakachala A', '4NI21IS045', '2024is_kanakachala_a@nie.ac.in', '9876543210', '$2b$12$DJ8P951bCT55o.jxAz4hz.U4ykkQekk7cj8mS44U7CRTojlyqTb7i', 'STUDENT', TRUE, '2026-08-01 09:00:00'),
(2, 'Ananya Rao', '4NI21IS012', '2024is_ananya_r@nie.ac.in', '9876543211', '$2b$12$DJ8P951bCT55o.jxAz4hz.U4ykkQekk7cj8mS44U7CRTojlyqTb7i', 'STUDENT', TRUE, '2026-08-02 09:14:00'),
(3, 'Prof. S. N. Murthy (Admin)', 'NIE-STAFF-001', 'admin@nie.ac.in', '9876543212', '$2b$12$DJ8P951bCT55o.jxAz4hz.U4ykkQekk7cj8mS44U7CRTojlyqTb7i', 'ADMIN', TRUE, '2026-08-01 08:30:00')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ------------------------------------------------------------
-- Lost Items
-- ------------------------------------------------------------
INSERT INTO lost_items (lost_item_id, user_id, item_name, category, location_lost, specific_location, date_lost, time_lost, description, identifying_marks, notify_on_match, status, created_at)
VALUES
(1, 1, 'Black Wildhorn Leather Wallet', 'Wallets & Purses', 'Campus Canteen', 'Near juice counter seating', '2026-09-12', 'Afternoon (12:00 PM – 4:00 PM)', 'Black Wildhorn bifold wallet with contrast stitching, containing bus pass and student cards.', 'Student ID card ending in 2024 and silver zipper inside coin compartment.', TRUE, 'ACTIVE', '2026-09-12 14:30:00'),
(2, 1, 'Dell 65W USB-C Laptop Charger', 'Electronics & Gadgets', 'Central Library', '1st Floor digital reference room, desk #4', '2026-09-13', 'Morning (9:00 AM – 12:00 PM)', 'Black cylindrical Dell USB-C laptop charger with Velcro cable tie.', 'Small red tape wrapped around adapter pin end.', TRUE, 'ACTIVE', '2026-09-13 11:15:00'),
(3, 2, 'Hero Splendor Bike Key', 'Keys', 'Campus Parking Area', 'Two-wheeler shed near Mechanical Block', '2026-09-14', 'Morning (9:00 AM – 12:00 PM)', 'Single Hero ignition key with blue rubber keychain and small brass ring.', 'Slight bend near the key tip and number 42 stamped.', TRUE, 'ACTIVE', '2026-09-14 09:40:00'),
(4, 1, 'NIE Student Identity Card', 'College ID & Cards', 'Diamond Jubilee Sports Complex', 'Badminton court spectator benches', '2026-09-14', 'Evening (4:00 PM – 7:00 PM)', 'Laminated official NIE Mysuru smart ID card in blue institutional lanyard.', 'Roll number ending in 045, ISE Department.', TRUE, 'ACTIVE', '2026-09-14 18:20:00'),
(5, 1, 'Fastrack Classic Sunglasses', 'Personal Accessories', 'Main Auditorium', 'Row F, center seat', '2026-09-10', 'Afternoon (12:00 PM – 4:00 PM)', 'Matte black aviator sunglasses in a black zippered hard case.', 'Initials KA lightly scratched inside left temple arm.', TRUE, 'POTENTIAL_MATCH', '2026-09-10 15:00:00')
ON DUPLICATE KEY UPDATE item_name=VALUES(item_name);

-- ------------------------------------------------------------
-- Found Items
-- ------------------------------------------------------------
INSERT INTO found_items (found_item_id, user_id, item_name, category, location_found, specific_location, date_found, time_found, description, custody_location, contact_preference, notify_on_match, status, created_at)
VALUES
(1, 2, 'Casio FX-991CW Scientific Calculator', 'Electronics & Gadgets', 'Central Library', 'Reading Hall Table 12', '2026-09-13', 'Morning (9:00 AM – 12:00 PM)', 'Black Casio scientific calculator with protective sliding hard case.', 'Central Library Enquiry Counter', 'In-App Direct Chat', TRUE, 'AVAILABLE', '2026-09-13 10:45:00'),
(2, 1, 'Blue Milton Stainless Steel Water Bottle', 'Personal Accessories', 'Campus Canteen', 'Left corner dining table', '2026-09-14', 'Afternoon (12:00 PM – 4:00 PM)', '750ml insulated dark blue bottle with metallic cap and loop handle.', 'Finder''s Possession (Available for direct handover)', 'In-App Direct Chat', TRUE, 'AVAILABLE', '2026-09-14 13:30:00'),
(3, 2, 'Boat Rockerz 255 Wireless Earphones', 'Electronics & Gadgets', 'ECE/ISE Block', '3rd Floor corridor near Seminar Hall', '2026-09-14', 'Morning (9:00 AM – 12:00 PM)', 'Teal and black neckband style Bluetooth earphones, clean condition.', 'Department Office', 'Coordinate Handover via Campus Security / Admin', TRUE, 'AVAILABLE', '2026-09-14 11:00:00'),
(4, 2, 'Godrej Brass Keys on Metal Ring', 'Keys', 'Main Gate & Security Post', 'Found on the pathway near security boom barrier', '2026-09-15', 'Early Morning (6:00 AM – 9:00 AM)', 'Three brass cabinet keys on a circular stainless steel keyring.', 'Campus Security Desk — Main Gate', 'Coordinate Handover via Campus Security / Admin', TRUE, 'AVAILABLE', '2026-09-15 08:15:00'),
(5, 1, 'Black Skybags Campus Backpack', 'Bags & Backpacks', 'Civil & Electrical Block', 'Classroom 204 second bench', '2026-09-11', 'Evening (4:00 PM – 7:00 PM)', '3-compartment black water-resistant college backpack with orange accents.', 'Staff Room / Faculty In-Charge', 'Coordinate Handover via Campus Security / Admin', TRUE, 'POTENTIAL_MATCH', '2026-09-11 17:45:00')
ON DUPLICATE KEY UPDATE item_name=VALUES(item_name);

-- ------------------------------------------------------------
-- Matches
-- ------------------------------------------------------------
INSERT INTO matches (match_id, lost_item_id, found_item_id, score, confidence_level, match_reason, status, created_at)
VALUES
(1, 2, 1, 65, 'Medium', 'Electronics accessory / gadget located within Central Library within 24 hours.', 'PENDING', '2026-09-13 12:00:00'),
(2, 3, 4, 82, 'High', 'Compatible key category with matching metallic components near campus entrance.', 'PENDING', '2026-09-15 09:00:00')
ON DUPLICATE KEY UPDATE score=VALUES(score);

-- ------------------------------------------------------------
-- Claims
-- ------------------------------------------------------------
INSERT INTO claims (claim_id, found_item_id, claimant_user_id, verification_details, lost_date, lost_location, claimant_answer, status, handover_instructions, rejection_reason, reviewed_at, created_at)
VALUES
(1001, 4, 1, 'The set contains 3 keys on an NIE metallic ring. One key is a Hero Splendor bike key with a tiny scratch near the plastic top.', '2026-09-13', 'Mechanical Block — Two Wheeler Parking', 'Hero Splendor key with blue ring', 'PENDING', NULL, NULL, NULL, '2026-09-14 11:20:00'),
(1002, 1, 1, 'Has initials KA written in silver permanent marker on the underside of the sliding case.', '2026-09-11', 'Dr. S. Radhakrishnan Block — Room 204', 'KA in silver marker inside cover', 'VERIFIED', 'Please collect your item from South Campus Security Office during working hours (9:00 AM – 5:00 PM). Carry your physical NIE Student ID Card for verification.', NULL, '2026-09-13 10:15:00', '2026-09-12 15:40:00')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- ------------------------------------------------------------
-- Claim Messages
-- ------------------------------------------------------------
INSERT INTO claim_messages (message_id, claim_id, sender_id, text, created_at)
VALUES
(1, 1002, 3, 'Hello Kanakachala, your claim verification for the calculator has been approved. The item is safely stored at South Security Office.', '2026-09-13 10:20:00'),
(2, 1002, 1, 'Thank you Sir! What documents do I need to present for physical handover?', '2026-09-13 10:25:00'),
(3, 1002, 3, 'Please bring your original physical NIE Student ID card and sign the campus recovery register at the desk.', '2026-09-13 10:28:00'),
(4, 1001, 1, 'I have submitted the proof description for the keys. Let me know if you need any additional details.', '2026-09-14 11:22:00')
ON DUPLICATE KEY UPDATE text=VALUES(text);

-- ------------------------------------------------------------
-- User-Specific Notifications
-- ------------------------------------------------------------
INSERT INTO notifications (notification_id, user_id, type, title, message, item_id, item_type, target_url, is_read, created_at)
VALUES
(1, 1, 'POTENTIAL_MATCH', 'Potential Match Found', 'A report for ''Godrej Brass Keys'' closely matches your lost report ''Hero Splendor Bike Key''.', 4, 'found', '/items/found/4', FALSE, '2026-09-15 10:30:00'),
(2, 1, 'CLAIM_VERIFIED', 'Ownership Claim Verified', 'Your claim #CLM-1002 has been approved by campus authorities. Please collect your item from South Campus Security Office.', 1, 'found', '/claims/1002', FALSE, '2026-09-14 14:15:00'),
(3, 1, 'CLAIM_SUBMITTED', 'Claim Submitted on Found Item', 'A student has submitted an ownership claim for an item you reported. Authorities are evaluating verification marks.', 2, 'found', '/my-reports', TRUE, '2026-09-13 11:35:00')
ON DUPLICATE KEY UPDATE title=VALUES(title);
