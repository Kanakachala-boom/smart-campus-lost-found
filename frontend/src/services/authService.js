/**
 * Authentication service.
 *
 * PROPOSED — BACKEND NOT IMPLEMENTED. This is the transport layer only.
 * The login/register screens themselves are built in a later stage.
 *
 * The frontend never sends user_id: the backend derives identity from the
 * JWT. See docs/api-contract.md for the full contract.
 */

import api, { USE_MOCK } from "./api";
import ENDPOINTS from "./endpoints";
import { mockUsers } from "./mock/mockData";
import { mockResponse, mockError } from "./mock/mockClient";

/** POST /api/auth/register -> { access_token, token_type, user } */
export async function register({ name, email, password, phone }) {
  if (USE_MOCK) {
    const exists = mockUsers.some((u) => u.email === email);
    if (exists) return mockError("An account with this email already exists.", 409);
    return mockResponse({
      access_token: "mock.jwt.token",
      token_type: "bearer",
      user: {
        user_id: 99,
        name,
        email,
        phone: phone ?? null,
        role: "STUDENT",
        is_active: true,
        created_at: new Date().toISOString(),
      },
    });
  }

  return api.post(
    ENDPOINTS.REGISTER,
    { name, email, password, phone: phone || null },
    { auth: false },
  );
}

/** POST /api/auth/login -> { access_token, token_type, user } */
export async function login({ email, password }) {
  if (USE_MOCK) {
    const user = mockUsers.find((u) => u.email === email);
    if (!user || !password) return mockError("Invalid email or password.", 401);
    return mockResponse({
      access_token: "mock.jwt.token",
      token_type: "bearer",
      user,
    });
  }

  return api.post(ENDPOINTS.LOGIN, { email, password }, { auth: false });
}

/** GET /api/auth/me -> current user, used to restore a session on reload. */
export async function getCurrentUser() {
  if (USE_MOCK) return mockResponse(mockUsers[0]);
  return api.get(ENDPOINTS.ME);
}

/**
 * Logout is client-side: the JWT is discarded. If the backend later adds a
 * token blocklist endpoint, the call belongs here.
 */
export async function logout() {
  return true;
}

export default { register, login, getCurrentUser, logout };
