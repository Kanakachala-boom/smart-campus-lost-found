/**
 * Single source of truth for backend endpoint paths.
 *
 * PROPOSED — BACKEND NOT IMPLEMENTED. None of these routes exist yet.
 * When the backend team finalises real routes, this is the only file
 * that needs to change.
 */

export const ENDPOINTS = {
  /* ---- Proposed Authentication ---- */
  LOGIN: "/api/auth/login",
  FORGOT_PASSWORD: "/api/auth/forgot-password",
  RESET_PASSWORD: "/api/auth/reset-password",
  ME: "/api/auth/me",

  /* ---- Proposed Item Reporting & Browsing ---- */
  ITEMS: "/api/items",
  LOST_ITEMS: "/api/lost-items",
  FOUND_ITEMS: "/api/found-items",
  ITEM_DETAIL: (type, id) => `/api/${type}-items/${id}`,
  MY_REPORTS: "/api/users/me/reports",

  /* ---- Proposed Claims & Ownership Verification (Stage 5) ---- */
  CLAIMS: "/api/claims",
  MY_CLAIMS: "/api/claims/my-claims",
  CLAIM_DETAIL: (id) => `/api/claims/${id}`,
  VERIFICATION_CHALLENGE: (foundItemId) => `/api/found-items/${foundItemId}/verification-challenge`,
  VERIFY_CLAIM: (claimId) => `/api/claims/${claimId}/verify`,

  /* ---- Proposed Automated Matching (Stage 6) ---- */
  MY_MATCHES: "/api/matches/my-matches",
  LOST_MATCHES: (id) => `/api/lost-items/${id}/matches`,
  FOUND_MATCHES: (id) => `/api/found-items/${id}/matches`,
  UPDATE_MATCH_STATUS: (id) => `/api/matches/${id}/status`,

  /* ---- Proposed Targeted Notifications ---- */
  NOTIFICATIONS: "/api/notifications",
  NOTIFICATION_READ: (id) => `/api/notifications/${id}/read`,
  NOTIFICATIONS_READ_ALL: "/api/notifications/read-all",

  /* ---- Proposed In-App Claim-Based Messages ---- */
  CLAIM_MESSAGES: (claimId) => `/api/claims/${claimId}/messages`,

  /* ---- Proposed Dashboard Metrics ---- */
  DASHBOARD: "/api/dashboard",

  /* ---- Proposed Administrative Oversight ---- */
  ADMIN_DASHBOARD: "/api/admin/dashboard",
  ADMIN_CLAIMS: "/api/admin/claims",
  ADMIN_ITEMS: "/api/admin/items",
  ADMIN_MATCHES: "/api/admin/matches",
};

export default ENDPOINTS;
