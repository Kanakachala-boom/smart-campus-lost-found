
/**
 * Central endpoint paths matching the current FastAPI backend.
 * Base URL is configured separately in frontend/.env.
 */

export const ENDPOINTS = {
  /* ---- Authentication ---- */
  LOGIN: "/api/auth/login",
  REGISTER: "/api/auth/register",
  FORGOT_PASSWORD: "/api/auth/forgot-password",
  RESET_PASSWORD: "/api/auth/reset-password",
  ME: "/api/auth/me",

  // Lost and found items
  ITEMS: "/lost-items",
  LOST_ITEMS: "/lost-items",
  FOUND_ITEMS: "/found-items",
  ITEM_DETAIL: (type, id) => `/${type}-items/${id}`,
  MY_REPORTS: "/users/me/reports",

  /* ---- Item Status and Management ---- */
  ITEM_STATUS: (type, id) => `/api/${type}-items/${id}/status`,

  /* ---- Proposed Claims & Ownership Verification (Stage 5) ---- */
  CLAIMS: "/api/claims",
  MY_CLAIMS: "/api/claims/my-claims",
  CLAIM_DETAIL: (id) => `/api/claims/${id}`,
  FOUND_ITEM_CLAIMS: (foundItemId) => `/api/found-items/${foundItemId}/claims`,
  VERIFICATION_CHALLENGE: (foundItemId) => `/api/found-items/${foundItemId}/verification-challenge`,
  VERIFY_CLAIM: (claimId) => `/api/claims/${claimId}/verify`,

  /* ---- Proposed Automated Matching (Stage 6) ---- */
  MY_MATCHES: "/api/matches/my-matches",
  LOST_MATCHES: (id) => `/api/lost-items/${id}/matches`,
  FOUND_MATCHES: (id) => `/api/found-items/${id}/matches`,
  UPDATE_MATCH_STATUS: (id) => `/api/matches/${id}/status`,
  RECONCILE_MATCHES: "/api/matches/reconcile",

  // Private messages
  MESSAGES: "/messages",
  CONVERSATIONS: "/messages/conversations",
  CONVERSATION: (userId) => `/messages/conversation/${userId}`,

  /* ---- Proposed In-App Claim-Based Messages ---- */
  CLAIM_MESSAGES: (claimId) => `/api/claims/${claimId}/messages`,
  FOUND_ITEM_CONVERSATION: (foundItemId) => `/api/found-items/${foundItemId}/conversation`,
  FOUND_ITEM_MESSAGES: (foundItemId) => `/api/found-items/${foundItemId}/conversation/messages`,

  /* ---- Proposed Dashboard Metrics ---- */
  DASHBOARD: "/api/dashboard",

  /* ---- Proposed Administrative Oversight ---- */
  ADMIN_DASHBOARD: "/api/admin/dashboard",
  ADMIN_CLAIMS: "/api/admin/claims",
  ADMIN_ITEMS: "/api/admin/items",
  ADMIN_MATCHES: "/api/admin/matches",
};

export default ENDPOINTS;
