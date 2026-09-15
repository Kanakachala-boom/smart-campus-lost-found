# Campus Lost & Found System – Database

## Database Technology

* MySQL
* MySQL Workbench

## Database Overview

The database is designed for the On-Campus Personal Items Missing Report and Reclaim System. It stores information related to users, lost and found items, potential matches, claims, ownership verification, private communication, notifications, and successful item reclamation.

## Tables

### 1. Users

Stores student and administrator account information.

**Main information:**

* User ID
* Name
* Email
* Password
* Phone
* Role
* Account status
* Account creation date

### 2. Lost Items

Stores details of items reported as lost by students.

**Main information:**

* Lost item ID
* User ID
* Item title
* Description
* Category
* Color
* Brand
* Lost location
* Lost date and time
* Image
* Status

### 3. Found Items

Stores details of items found on campus.

**Main information:**

* Found item ID
* Finder's user ID
* Item title
* Description
* Category
* Color
* Brand
* Found location
* Found date and time
* Image
* Status

### 4. Matches

Stores potential matches between lost and found items.

**Main information:**

* Match ID
* Lost item ID
* Found item ID
* Matching score
* Match reason
* Match status

The matching score allows multiple possible matches to be ranked.

### 5. Claims

Stores claims made by users for found items.

**Main information:**

* Claim ID
* Found item ID
* Claimant ID
* Match ID
* Claim description
* Claim status
* Created and updated dates

### 6. Ownership Verifications

Stores information used to verify whether a claimant is the actual owner.

**Main information:**

* Verification ID
* Claim ID
* Verification question
* Expected answer
* Provided answer
* Verification result
* Verifier
* Verification date

### 7. Messages

Stores private communication between the finder and claimant.

**Main information:**

* Message ID
* Sender
* Receiver
* Claim ID
* Message
* Sent time
* Read status

### 8. Notifications

Stores targeted notifications for users.

**Examples:**

* Potential match found
* New claim
* New message
* Reclaim update

Only the relevant user receives the notification.

### 9. Reclaim Records

Stores the final record of an item being returned to its owner.

**Main information:**

* Reclaim ID
* Claim ID
* Lost item ID
* Found item ID
* Owner ID
* Finder ID
* Verification ID
* Reclaim date
* Handover location
* Status
* Remarks

## Main Database Flow

User reports an item as lost or found.

```text
User
 ↓
Lost / Found Item
 ↓
Potential Match
 ↓
Claim
 ↓
Ownership Verification
 ↓
Private Communication
 ↓
Reclaim
```

## Relationships

* One user can create multiple lost-item reports.
* One user can create multiple found-item reports.
* A lost item can have potential matches with found items.
* A found item can receive claims.
* A claim can have an ownership verification.
* Messages are associated with a particular claim.
* Notifications are associated with a particular user.
* A successful claim results in a reclaim record.

## Current Progress

* Database structure designed.
* 9 tables created in MySQL Workbench.
* Primary keys defined.
* Foreign key relationships established.
* Item status tracking implemented.
* Matching score storage implemented.
* Database schema prepared for future backend integration.
