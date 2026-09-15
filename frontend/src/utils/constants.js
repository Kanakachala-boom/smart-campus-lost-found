/**
 * Constants mirrored from the project's MySQL database.
 *
 * The database is authoritative. These values are taken from what the team
 * has confirmed and must not be extended with invented fields or statuses.
 */

/* ---------- UI theme values (not a database concern) ---------- */
export const THEMES = {
  LIGHT: "light",
  DARK: "dark",
};

/* ---------- users.role ---------- */
export const ROLES = {
  STUDENT: "STUDENT",
  ADMIN: "ADMIN",
};

/* ---------- claims.status ----------
 * Confirmed by the team: exactly these three values.
 */
export const CLAIM_STATUS = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
};

/* ---------- matches.status ----------
 * Confirmed by the team: PENDING, ACCEPTED, REJECTED.
 */
export const MATCH_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
};

/* ---------- lost_items.status & found_items.status ---------- */
export const LOST_ITEM_STATUS = {
  ACTIVE: "ACTIVE",
  MATCHED: "MATCHED",
  RECLAIMED: "RECLAIMED",
  CLOSED: "CLOSED",
};

export const FOUND_ITEM_STATUS = {
  AVAILABLE: "AVAILABLE",
  CLAIMED: "CLAIMED",
  RETURNED: "RETURNED",
  CLOSED: "CLOSED",
};

/* ---------- Report type discriminator ----------
 * Not a database column. lost_items and found_items are separate tables;
 * this flag exists only so the frontend knows which one a record came from.
 */
export const ITEM_TYPES = {
  LOST: "LOST",
  FOUND: "FOUND",
};

/* ---------- Table names, for reference in comments and future services ---------- */
export const TABLES = {
  USERS: "users",
  LOST_ITEMS: "lost_items",
  FOUND_ITEMS: "found_items",
  MATCHES: "matches",
  CLAIMS: "claims",
  OWNERSHIP_VERIFICATIONS: "ownership_verifications",
  MESSAGES: "messages",
  NOTIFICATIONS: "notifications",
  RECLAIM_RECORDS: "reclaim_records",
};
