/**
 * Single source of truth for backend endpoint paths.
 *
 * PROPOSED — BACKEND NOT IMPLEMENTED. None of these routes exist yet.
 * They are documented in docs/api-contract.md. When the backend team
 * finalises real routes, this is the only file that needs to change.
 */

export const ENDPOINTS = {
  /* ---- Authentication ---- */
  REGISTER: "/api/auth/register",
  LOGIN: "/api/auth/login",
  ME: "/api/auth/me",
};

export default ENDPOINTS;
