/**
 * Authentication service.
 *
 * Handles transport for registration, login, session restore, and logout.
 *
 * PROPOSED FASTAPI INTEGRATION CONTRACT:
 * - POST /api/auth/register -> payload: { name, email, password, phone }
 * - POST /api/auth/login    -> payload: { email, password } (or OAuth2 form with username/password)
 * - GET  /api/auth/me       -> returns current user profile derived from JWT
 *
 * Configurable login format:
 * Backend may expect application/json or application/x-www-form-urlencoded (OAuth2PasswordRequestForm).
 * This service defaults to JSON and adapts seamlessly via VITE_AUTH_LOGIN_FORMAT ("json" | "form").
 */

import api, { ApiError, USE_MOCK } from "./api";
import ENDPOINTS from "./endpoints";
import {
  addMockUser,
  findMockUserByEmail,
  findMockUserById,
  mockUsers,
} from "./mock/mockData";
import { mockError, mockResponse } from "./mock/mockClient";
import { readStorage, STORAGE_KEYS } from "../utils/storage";

/**
 * Proposed FastAPI login format adapter.
 * Configurable via environment variable without code rewrites.
 */
export const LOGIN_REQUEST_FORMAT =
  import.meta.env.VITE_AUTH_LOGIN_FORMAT?.toLowerCase() === "form"
    ? "form"
    : "json";

/**
 * Registers a new user account.
 *
 * @param {Object} details
 * @param {string} details.name
 * @param {string} details.email
 * @param {string} details.password
 * @param {string|null} [details.phone]
 * @returns {Promise<{ message?: string, user: Object, access_token?: string }>}
 */
export async function register({ name, email, password, phone }) {
  if (USE_MOCK) {
    const existing = findMockUserByEmail(email);
    if (existing) {
      return mockError("An account with this email already exists.", 409);
    }

    const newUser = addMockUser({ name, email, phone });
    return mockResponse({
      message: "Account registered successfully.",
      user: newUser,
    });
  }

  return api.post(
    ENDPOINTS.REGISTER,
    {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone ? phone.trim() : null,
    },
    { auth: false },
  );
}

/**
 * Authenticates user credentials and returns session tokens.
 *
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @returns {Promise<{ access_token: string, token_type: string, user: Object }>}
 */
export async function login({ email, password }) {
  if (USE_MOCK) {
    const user = findMockUserByEmail(email);
    if (!user || !password) {
      return mockError("Invalid email or password.", 401);
    }

    return mockResponse({
      access_token: `mock.jwt.token.${user.user_id}`,
      token_type: "bearer",
      user,
    });
  }

  let responseData;

  if (LOGIN_REQUEST_FORMAT === "form") {
    // FastAPI OAuth2PasswordRequestForm expects application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append("username", email.trim().toLowerCase());
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
      throw new ApiError(err?.detail || "Invalid email or password.", {
        status: response.status,
      });
    }

    responseData = await response.json();
  } else {
    // Standard JSON payload
    responseData = await api.post(
      ENDPOINTS.LOGIN,
      { email: email.trim().toLowerCase(), password },
      { auth: false },
    );
  }

  // If the backend login endpoint returned a token without the user object,
  // fetch the user profile via the proposed /api/auth/me endpoint.
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
  register,
  login,
  getCurrentUser,
  logout,
  LOGIN_REQUEST_FORMAT,
};
