/**
 * Authentication service for The National Institute of Engineering (NIE), Mysuru.
 *
 * PROPOSED FASTAPI INTEGRATION CONTRACT (NOT YET IMPLEMENTED):
 * - POST /api/auth/login           -> { email, password } or OAuth2 form
 * - POST /api/auth/forgot-password -> { email }
 * - POST /api/auth/reset-password  -> { token, new_password }
 * - GET  /api/auth/me              -> Current user profile derived from JWT
 */

import api, { ApiError, USE_MOCK } from "./api";
import ENDPOINTS from "./endpoints";
import { findMockUserByEmail, findMockUserById, mockUsers } from "./mock/mockData";
import { mockError, mockResponse } from "./mock/mockClient";
import { readStorage, STORAGE_KEYS } from "../utils/storage";

/**
 * Proposed FastAPI login format adapter.
 * Configurable via environment variable (default: "json").
 */
export const LOGIN_REQUEST_FORMAT =
  import.meta.env.VITE_AUTH_LOGIN_FORMAT?.toLowerCase() === "form"
    ? "form"
    : "json";

/**
 * Authenticates NIE credentials.
 *
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @returns {Promise<{ access_token: string, token_type: string, user: Object }>}
 */
export async function login({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  if (USE_MOCK) {
    const user = findMockUserByEmail(normalizedEmail);
    if (!user || !password) {
      return mockError(
        "Invalid credentials. Please verify your NIE email and password.",
        401,
      );
    }

    return mockResponse({
      access_token: `mock.jwt.token.${user.user_id}`,
      token_type: "bearer",
      user,
    });
  }

  let responseData;

  if (LOGIN_REQUEST_FORMAT === "form") {
    const formData = new URLSearchParams();
    formData.append("username", normalizedEmail);
    formData.append("password", password);

    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
    const response = await fetch(`${baseUrl}${ENDPOINTS.LOGIN}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new ApiError(err?.detail || "Invalid credentials.", {
        status: response.status,
      });
    }

    responseData = await response.json();
  } else {
    responseData = await api.post(
      ENDPOINTS.LOGIN,
      { email: normalizedEmail, password },
      { auth: false },
    );
  }

  if (responseData?.access_token && !responseData?.user) {
    try {
      const userProfile = await api.get(ENDPOINTS.ME, {
        headers: { Authorization: `Bearer ${responseData.access_token}` },
      });
      responseData.user = userProfile;
    } catch {
      // Degrade gracefully if /me endpoint is pending backend implementation
    }
  }

  return responseData;
}

/**
 * Submits a password recovery request for an NIE email.
 *
 * Note: Does not confirm whether the email actually exists, to prevent
 * account enumeration.
 *
 * @param {string} email
 * @returns {Promise<{ message: string }>}
 */
export async function requestPasswordReset(email) {
  const normalizedEmail = email.trim().toLowerCase();

  if (USE_MOCK) {
    // Simulate server processing delay
    return mockResponse({
      message:
        "If an account exists for this NIE email, recovery instructions have been sent to your registered college email.",
    });
  }

  return api.post(
    ENDPOINTS.FORGOT_PASSWORD,
    { email: normalizedEmail },
    { auth: false },
  );
}

/**
 * Resets the password using a reset token provided in the recovery link.
 *
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.newPassword
 * @returns {Promise<{ message: string }>}
 */
export async function resetPassword({ token, newPassword }) {
  if (USE_MOCK) {
    return mockResponse({
      message: "Password has been updated successfully.",
    });
  }

  return api.post(
    ENDPOINTS.RESET_PASSWORD,
    { token: token || null, new_password: newPassword },
    { auth: false },
  );
}

/**
 * Restores or revalidates the current authenticated user's profile.
 *
 * @returns {Promise<Object|null>}
 */
export async function getCurrentUser() {
  if (USE_MOCK) {
    const currentToken = readStorage(STORAGE_KEYS.TOKEN);
    if (currentToken && typeof currentToken === "string") {
      const match = currentToken.match(/mock\.jwt\.token\.(\d+)/);
      if (match) {
        const found = findMockUserById(match[1]);
        if (found) return mockResponse(found);
      }
    }
    const savedUser = readStorage(STORAGE_KEYS.USER);
    if (savedUser) return mockResponse(savedUser);
    return mockResponse(mockUsers[0]);
  }

  return api.get(ENDPOINTS.ME);
}

/**
 * Logs out the user. Discards the JWT locally.
 *
 * @returns {Promise<boolean>}
 */
export async function logout() {
  return true;
}

export default {
  login,
  requestPasswordReset,
  resetPassword,
  getCurrentUser,
  logout,
  LOGIN_REQUEST_FORMAT,
};
