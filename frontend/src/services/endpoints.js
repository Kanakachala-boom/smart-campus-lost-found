
/**
 * Central endpoint paths matching the current FastAPI backend.
 * Base URL is configured separately in frontend/.env.
 */

export const ENDPOINTS = {
  // Authentication
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  ME: "/auth/me",
  FORGOT_PASSWORD: "/auth/forgot-password",
  RESET_PASSWORD: "/auth/reset-password",

  // Lost and found items
  ITEMS: "/lost-items",
  LOST_ITEMS: "/lost-items",
  FOUND_ITEMS: "/found-items",
  ITEM_DETAIL: (type, id) => `/${type}-items/${id}`,
  MY_REPORTS: "/users/me/reports",

  // Claims
  CLAIMS: "/claims",
  MY_CLAIMS: "/claims/mine",
  CLAIM_DETAIL: (id) => `/claims/${id}`,
  VERIFICATION_CHALLENGE: (claimId) =>
    `/ownership-verifications/claim/${claimId}`,
  VERIFY_CLAIM: (verificationId) =>
    `/ownership-verifications/${verificationId}/answer`,
  CLAIM_REVIEW: (id) => `/claims/${id}/review`,
  // Matching — requires a matching router
  MY_MATCHES: "/matches/my-matches",
  LOST_MATCHES: (id) => `/lost-items/${id}/matches`,
  FOUND_MATCHES: (id) => `/found-items/${id}/matches`,
  UPDATE_MATCH_STATUS: (id) => `/matches/${id}/status`,

  // Notifications
  NOTIFICATIONS: "/notifications",
  NOTIFICATION_READ: (id) => `/notifications/${id}/read`,
  NOTIFICATIONS_READ_ALL: "/notifications/read-all",
  NOTIFICATION_UNREAD_COUNT: "/notifications/unread-count",

  // Private messages
  CLAIM_MESSAGES: (claimId) => `/claims/${claimId}/messages`,
  MESSAGES: "/messages",
  CONVERSATIONS: "/messages/conversations",
  CONVERSATION: (userId) => `/messages/conversation/${userId}`,

  // Dashboard
  DASHBOARD: "/dashboard",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_CLAIMS: "/admin/claims",
  ADMIN_ITEMS: "/admin/items",
  ADMIN_MATCHES: "/admin/matches",
};

export default ENDPOINTS;
