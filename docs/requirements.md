# Smart Campus Lost & Found System
## System Requirements Specification (SRS) & Functional Specification

---

## 1. Project Overview
The **Smart Campus Lost & Found System** is a centralized web platform designed for educational institutions to streamline the reporting, tracking, matching, and recovering of lost and found items. Unlike traditional informal channels (notice boards, WhatsApp groups, manual registers), this platform introduces structured data entry, automated similarity matching between lost and found reports, user-targeted notifications, and a secure ownership verification workflow to return items safely to their rightful owners.

---

## 2. Problem Statement
In colleges and universities, students and staff frequently lose personal belongings—such as student ID cards, wallets, keys, electronics, calculators, laboratory coats, and books. Currently, lost-and-found management is hindered by:
- **Scattered Communication**: Lost item posts are dispersed across personal chats, social media, and unofficial groups with limited reach.
- **Lack of Searchability**: No searchable, filterable repository of items currently held or reported.
- **High Inefficiency for Security & Staff**: Campus security and enquiry desks rely on physical logbooks that cannot proactively alert owners.
- **Risk of Fraudulent Claims**: Openly publicizing sensitive item details allows unauthorized individuals to claim items that do not belong to them.

---

## 3. Proposed Solution
A unified, web-based platform with three pillars:
1. **Centralized Digital Repository**: Structured reporting for both LOST and FOUND items with categorized metadata, timestamps, locations, and photos.
2. **Automated Intelligent Matching Engine**: Algorithmic comparison of lost and found listings to compute similarity scores without forcing users to manually scroll through hundreds of records.
3. **Targeted Notifications & Secure Claim Protocol**: Event-driven, user-specific notifications and private verification mechanisms (shielding secret identifying marks) before an item is handed over.

---

## 4. Main Objectives
- Provide a responsive, accessible interface for students, faculty, and campus administrators.
- Accelerate item recovery time via automated matching algorithms.
- Enforce privacy and prevent false claims by concealing private item identifiers from the public feed.
- Provide campus administrators with audit logs, status tracking, and recovery analytics.
- Establish a clean, decoupled 4-module architecture suitable for a 4-member engineering team.

---

## 5. User Roles and Access Control

### 5.1 Regular User (Student / Faculty / Staff)
- Register an account using institutional credentials (college email and ID).
- Log in and manage their profile.
- Report items as **LOST** or **FOUND**.
- Browse and filter public listings (with sensitive verification fields masked).
- Receive private, user-specific notifications for potential matches or claim updates.
- Submit ownership claims for found items with private verification proof.
- Participate in structured private communication with finders or administrators.
- Mark their own reports as resolved/returned.

### 5.2 Administrator (Campus Security / Authority / Department In-charge)
- View system-wide dashboard and analytics (total lost, found, matched, claimed, and returned).
- Moderate reported items (edit, flag, hide, or delete inappropriate/duplicate/spam reports).
- Oversee claims and mediate ownership disputes when needed.
- Verify ownership documents or physically inspect handovers for high-value items.
- Manage user accounts (flag/suspend malicious or spam accounts).

---

## 6. Functional Requirements

To ensure clarity and architectural separation, the functional requirements are divided into three distinct categories:
- **Category A: Standard Application Functionality**
- **Category B: Intelligent Matching Functionality**
- **Category C: Administrative Functionality**

---

### Category A: Standard Application Functionality

#### FR-A1: User Registration & Authentication
- **Registration**: Users must register with Name, College ID / Roll Number, Email Address, Phone Number, and Password.
- **Validation**: System validates password strength and ensures College ID and Email are unique.
- **Authentication**: Secure login issuing JSON Web Tokens (JWT) for stateless API access. Passwords stored using salted hashing (e.g., bcrypt).
- **Session Management**: Secure token expiration and logout handling.

#### FR-A2: Reporting a Lost Item
- Users report an item they have lost by submitting:
  - **Item Name** (e.g., "Black Leather Wallet")
  - **Category** (Electronics, Documents/ID, Accessories, Books/Stationery, Bags, Keys, Clothing, Other)
  - **Primary Location** (Canteen, Central Library, Block A, Sports Complex, Auditorium, Lab, etc.)
  - **Date & Approximate Time Lost**
  - **Public Description** (General appearance visible in public listings)
  - **Private Identifying Marks** (Details hidden from public view, used later for verification, e.g., "Contains driver's license ending in 8921 and Rs. 200")
  - **Optional Image Upload**

#### FR-A3: Reporting a Found Item
- Users report an item they found on campus:
  - **Item Name** (e.g., "Calculators / Scientific Casio")
  - **Category**
  - **Found Location** (Specific campus zone or building)
  - **Date & Time Found**
  - **Storage / Custody Location** (e.g., "Deposited with Library Front Desk" or "In Finder's Possession")
  - **General Description**
  - **Image Upload** (Recommended for found items)
  - **Finder Contact Preference** (Direct contact permitted or Handover via Admin only)

#### FR-A4: Browsing, Searching & Filtering
- **Public Feed**: Displays active lost and found items.
- **Filters**:
  - Filter by Report Type: `LOST` vs `FOUND`.
  - Filter by Category.
  - Filter by Campus Location.
  - Filter by Date Range.
  - Filter by Status: `Active`, `Potential Match`, `Claimed`, `Resolved`.
- **Keyword Search**: Search across item titles, categories, and public descriptions.

#### FR-A5: Item Claim Submission & Ownership Verification
- When an owner spots their item in the found listings or via match alert:
  - The claimant clicks **"Claim Item"**.
  - Claimant must submit a **Verification Form** detailing proofs that only the real owner would know (e.g., serial number, exact contents, lock screen wallpaper, specific scratches, or receipts).
  - The verification proof is submitted privately to the finder or admin, preventing fraudulent public claims.

#### FR-A6: Private Communication / Chat
- A structured, in-app messaging channel between the item finder (or holding authority) and the claimant.
- **Privacy Enforcement**: Phone numbers and private emails are not exposed by default; communication occurs within the authenticated platform.
- Messages are logged against the specific `claim_id` for accountability.

#### FR-A7: Event-Specific, Targeted Notifications
- **Strict Constraint**: Notifications are **strictly user-specific**. No global broadcasts for individual matches.
- **Notification Triggers**:
  - **Match Triggered**: Only the user who filed the lost report receives: *"A potential match has been detected for your lost [Item Name]."*
  - **Claim Submitted**: The user who filed the found report receives: *"A claim has been submitted for [Item Name] you reported."*
  - **Claim Status Changed**: Claimant receives: *"Your claim for [Item Name] has been Approved / Rejected."*
  - **Item Resolved**: Relevant participants receive confirmation of handover.
- In-app notification center with read/unread tracking and timestamps.

---

### Category B: Intelligent Matching Functionality

*(Note: Designed to run efficiently without requiring heavy, brittle machine-learning models for core functionality, while permitting modular upgrades).*

#### FR-B1: Automated Match Comparison Engine
- Upon the creation of any new Lost report or Found report, the matching engine executes an evaluation against active opposite-type reports (Lost compares to Found; Found compares to Lost).
- The engine processes candidate pairs where the status is currently `Active`.

#### FR-B2: Multi-Factor Weighted Similarity Scoring
The algorithm computes a composite Match Score ($0\%$ to $100\%$) based on weighted heuristic attributes:
1. **Category Filter (Hard Rule / High Weight - 30%)**: Must match exactly or be compatible (e.g., "Electronics").
2. **Text Similarity (35%)**:
   - Compares Item Name and Description strings.
   - Text normalization: Lowercase conversion, punctuation stripping, stop-word removal.
   - Token-based / Cosine / Jaccard / Levenshtein similarity metric calculation.
3. **Location Proximity (20%)**:
   - Location zone matching (exact zone match scores full weight; adjacent zones score partial weight).
4. **Temporal Proximity (15%)**:
   - Compares `Date Lost` vs `Date Found`.
   - Logic: Found date cannot logically precede lost date by an excessive margin. Max score if found on same day or within 48 hours; degrades gracefully as time gap increases.

#### FR-B3: Match Ranking and Threshold Classification
- **High Confidence Match ($\ge 75\%$)**: System automatically generates a `Match` record and sends an immediate high-priority notification to the lost item owner.
- **Moderate Match ($50\% - 74\%$)**: Displayed in the user's dashboard under "Suggested Matches" without sending urgent alerts.
- **Low Confidence ($< 50\%$)**: Discarded to prevent alert fatigue.

#### FR-B4: Match Lifecycle Management
- Stored matches have statuses: `Pending Review`, `Accepted by User`, `Dismissed by User`, `Resolved`.
- If a user dismisses a suggestion, that candidate pair is not re-alerted.

---

### Category C: Administrative Functionality

#### FR-C1: Report Moderation & Oversight
- Admin dashboard displaying all active, claimed, and returned reports.
- Capability to edit incorrect categories, remove spam or offensive posts, and merge duplicate reports.

#### FR-C2: Claim Verification & Dispute Resolution
- Administrators can review claim submissions and submitted verification proofs.
- For high-value items (laptops, gold jewelry, expensive phones), admin can enforce:
  - Required physical verification at Campus Security Desk.
  - In-person identity check before marking as `Returned`.

#### FR-C3: Item Status & Custody Tracking
- Maintain the official item lifecycle:
  - `Lost`: Reported lost by student.
  - `Found`: Reported found, in student or desk custody.
  - `Potential Match`: Linked to candidate report.
  - `Claimed`: Verification submitted.
  - `Returned`: Handover verified and case closed.
- Item cannot be modified or re-claimed once marked `Returned`.

#### FR-C4: Analytics & Reporting
- Summary metrics:
  - Total Lost vs. Found Reports
  - Successful Return Rate ($\%$)
  - Most common loss zones on campus (Hotspot identification)
  - Average time from loss report to item recovery
  - Category breakdown (e.g., percentage of items that are IDs vs. electronics)

---

## 7. Non-Functional Requirements

### 7.1 Security & Data Privacy
- **Credential Protection**: Passwords hashed with bcrypt; JWT stored securely on the client.
- **Data Encapsulation**: Private identifying marks and detailed claim verification documents must never appear in public GET endpoints.
- **Role-Based Access Control (RBAC)**: Enforced via FastAPI route dependencies to safeguard admin endpoints from normal users.

### 7.2 Performance & Responsiveness
- **API Response Time**: Standard CRUD queries must return within $< 200\text{ ms}$.
- **Matching Latency**: Algorithmic matching execution for a new report must complete within $< 1.5\text{ seconds}$.
- **Lightweight Client**: React bundle optimized with lazy-loaded routes and efficient re-renders.

### 7.3 Usability & Accessibility
- Intuitive, modern design with clear visual hierarchy, accessible color contrasts, and responsive layout across mobile and desktop browsers.
- Form validations provide inline, user-friendly error messages.

### 7.4 Reliability & Data Integrity
- Relational integrity maintained via MySQL Foreign Key constraints with appropriate cascade/nullify rules.
- Atomic transactions for claim approval and status transitions to prevent race conditions (e.g., two users claiming the same item simultaneously).

---

## 8. Complete End-to-End User Flow

```
   [Student A: Loses Item]               [Student B: Finds Item]
             |                                      |
             v                                      v
  Fills "Lost Item Report"               Fills "Found Item Report"
  - General info (Public)                - General info (Public)
  - Secret identifiers (Private)         - Uploads Image
  - Location & Date                      - Location & Date
             |                                      |
             +------------------+-------------------+
                                |
                                v
               [FastAPI Matching Engine Triggered]
                                |
                   Calculates Similarity Score
            (Category + Text Tokens + Location + Date)
                                |
                   Is Match Score >= Threshold?
                                |
               +----------------+----------------+
               | YES                             | NO
               v                                 v
     [Generate Match Record]              [Listing Stays in Feed]
               |                          (Searchable by users)
               v
  [Send Targeted Notification]
  "Match found for your lost item!"
  (Sent ONLY to Student A)
               |
               v
  [Student A Reviews Suggestion]
               |
          Does it match?
         /              \
     [YES]              [NO] ----> [Dismiss Suggestion]
       |
       v
  [Student A Submits Claim]
  - Provides Secret Verification Details
       |
       v
  [Verification Phase]
  - Handled via Finder or Admin
  - In-App Private Chat for Handover Coordination
       |
       v
  [Handover Complete]
  - Item marked as "Returned"
  - Case Closed in Database
```

---

## 9. Major System Modules (Team Responsibilities)

| Module | Core Responsibility | Primary Technology | Assigned Role |
| :--- | :--- | :--- | :--- |
| **Module 1: Frontend & User Interface** | Layout, responsive navigation, Auth views, Lost/Found forms, Search/Filter UI, Claim UI, Notification panel, Client API integration | React.js, CSS | Member 1 |
| **Module 2: Backend & Core APIs** | FastAPI architecture, JWT Auth, RBAC, User profile endpoints, Lost/Found CRUD endpoints, Request validation (Pydantic), Error handling | FastAPI, Python, Pydantic | Member 2 |
| **Module 3: Smart Matching & Search** | Text tokenization, multi-factor weighting algorithm, scoring service, ranking pipeline, complex search/filter query optimization | Python, FastAPI, NumPy/Scikit-learn (or regex/difflib) | Member 3 |
| **Module 4: Database, Claims & Notifications** | MySQL schema, Foreign keys & migrations, Claim workflow, Verification logic, In-app messaging, Targeted notification dispatcher, Admin queries | MySQL, SQLAlchemy/SQLModel, FastAPI | Member 4 |

---

## 10. Technology Stack Summary

- **Frontend**: React.js (Single Page Application, component-driven, state management, modern CSS design).
- **Backend**: FastAPI (Python 3.10+), asynchronous execution, automated OpenAPI/Swagger documentation, Pydantic data schemas.
- **Database**: MySQL 8.0+ (Relational DBMS, indexing, transactional integrity, foreign key relations).
- **ORM / Query Builder**: SQLAlchemy or SQLModel for clean database interactions.
- **Authentication**: JWT (JSON Web Tokens) with `passlib`/`bcrypt` password hashing.
- **Communication Protocol**: JSON-over-REST via HTTP/HTTPS.

---

## 11. Future / Optional Enhancements
- **Computer Vision Image Similarity**: Cosine similarity on image feature embeddings (e.g., MobileNet/ResNet) to compare item photographs.
- **QR Code Asset Tagging**: Pre-registering student belongings (e.g., laptops) with a unique QR sticker that can be scanned if found.
- **College ERP / Single Sign-On (SSO)**: Direct integration with college LDAP or Google Workspace domain.
- **Automated Push Notifications**: Web Push APIs or SMS/Email alerts for real-time match alerts outside the browser.
- **Campus Geo-Mapping**: Interactive campus map pin-pointing exact loss and discovery locations.
