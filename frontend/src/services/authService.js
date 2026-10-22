
/**
 * Authentication service for The National Institute of Engineering (NIE), Mysuru.
 *
 * FastAPI endpoints:
 * - POST /auth/login  -> { email, password }
 * - POST /auth/register
 * - GET  /auth/me     -> Current user profile derived from JWT
 *
 * Not yet implemented in the backend:
 * - POST /auth/forgot-password
 * - POST /auth/reset-password
 */

import api, { ApiError, USE_MOCK } from "./api";
import ENDPOINTS from "./endpoints";

import {
  findMockUserByEmail,
  findMockUserById,
  mockUsers,
} from "./mock/mockData";

import { mockError, mockResponse } from "./mock/mockClient";
import { readStorage, STORAGE_KEYS } from "../utils/storage";

/**
 * Login format supported by the backend.
 * Current FastAPI implementation accepts JSON.
 */
export const LOGIN_REQUEST_FORMAT =
  import.meta.env.VITE_AUTH_LOGIN_FORMAT?.toLowerCase() === "form"
    ? "form"
    : "json";

/**
 * Registers a new NIE student/staff account.
 *
 * @param {Object} userData
 * @param {string} userData.name
 * @param {string} userData.student_staff_id
 * @param {string} userData.email
 * @param {string} [userData.phone]
 * @param {string} userData.password
 * @returns {Promise<{ access_token: string, token_type: string, user: Object }>}
 */
export async function register(userData) {
  if (USE_MOCK) {
    return mockResponse({
      access_token: "mock.jwt.token.999",
      token_type: "bearer",
      user: {
        user_id: 999,
        name: userData.name,
        email: userData.email,
        student_staff_id: userData.student_staff_id,
        phone: userData.phone || null,
        role: "STUDENT",
        is_active: true,
        created_at: new Date().toISOString(),
      },
    });
  }

  return api.post(ENDPOINTS.REGISTER, userData, { auth: false });
}

/**
 * Authenticates NIE credentials.
 *
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<Object>}
 */
export async function login({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new ApiError("Please enter your email and password.", {
      status: 400,
    });
  }

  // Mock authentication
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

  // OAuth2 form login, if explicitly configured
  if (LOGIN_REQUEST_FORMAT === "form") {
    const formData = new URLSearchParams();
    formData.append("username", normalizedEmail);
    formData.append("password", password);
    responseData = await api.post(ENDPOINTS.LOGIN, formData, { auth: false });
  } else {
    // Current FastAPI backend accepts JSON: { email, password }
    responseData = await api.post(
      ENDPOINTS.LOGIN,
      {
        email: normalizedEmail,
        password,
      },
      {
        auth: false,
      },
    );
  }

  // Fetch the user profile using the newly issued token if login
  // did not already return the user.
  if (responseData?.access_token && !responseData?.user) {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

      const response = await fetch(`${baseUrl}${ENDPOINTS.ME}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${responseData.access_token}`,
        },
      });

      if (response.ok) {
        responseData.user = await response.json();
      }
    } catch {
      // Login may still succeed if profile retrieval fails.
    }
  }

  return responseData;
}

/**
 * Request password recovery.
 *
 * NOTE: The corresponding FastAPI endpoint is not implemented yet.
 *
 * @param {string} email
 */
export async function requestPasswordReset(email) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new ApiError("Please enter your NIE email address.", {
      status: 400,
    });
  }

  if (USE_MOCK) {
    return mockResponse({
      message:
        "If an account exists for this NIE email, recovery instructions have been sent to your registered college email.",
    });
  }

  return api.post(
    ENDPOINTS.FORGOT_PASSWORD,
    {
      email: normalizedEmail,
    },
    {
      auth: false,
    },
  );
}

/**
 * Reset a password using a recovery token.
 *
 * NOTE: The corresponding FastAPI endpoint is not implemented yet.
 *
 * @param {{ token: string, newPassword: string }} params
 */
export async function resetPassword({ token, newPassword }) {
  if (!token || !newPassword) {
    throw new ApiError("A reset token and new password are required.", {
      status: 400,
    });
  }

  if (USE_MOCK) {
    return mockResponse({
      message: "Password has been updated successfully.",
    });
  }

  return api.post(
    ENDPOINTS.RESET_PASSWORD,
    {
      token,
      new_password: newPassword,
    },
    {
      auth: false,
    },
  );
}

/**
 * Restore the currently authenticated user.
 *
 * In real mode, api.js should attach the saved JWT automatically.
 *
 * @returns {Promise<Object|null>}
 */
export async function getCurrentUser() {
  if (USE_MOCK) {
    const currentToken = readStorage(STORAGE_KEYS.TOKEN);

    if (currentToken && typeof currentToken === "string") {
      const match = currentToken.match(/^mock\.jwt\.token\.(\d+)$/);

      if (match) {
        const foundUser = findMockUserById(match[1]);

        if (foundUser) {
          return mockResponse(foundUser);
        }
      }
    }

    const savedUser = readStorage(STORAGE_KEYS.USER);

    if (savedUser) {
      return mockResponse(savedUser);
    }

    return mockResponse(mockUsers[0] ?? null);
  }

  return api.get(ENDPOINTS.ME);
}

/**
 * Logout.
 *
 * The caller/AuthContext is responsible for clearing stored credentials.
 */
export async function logout() {
  return true;
}

export default {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  getCurrentUser,
  logout,
  LOGIN_REQUEST_FORMAT,
};
