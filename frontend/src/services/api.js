/**
 * Central HTTP client for the future FastAPI backend.
 *
 * THE BACKEND DOES NOT EXIST YET. This file defines the transport that will
 * be used once it does. Every service module goes through this file, and
 * nothing else in the app should call fetch() directly.
 *
 * The base URL comes from VITE_API_BASE_URL. It is never hard-coded.
 */

import { readStorage, STORAGE_KEYS } from "../utils/storage";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * Master switch between the isolated mock layer and the real backend.
 * Set VITE_USE_MOCK=false once FastAPI endpoints exist.
 * No component reads this flag directly; only service modules do.
 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

/** Normalised error thrown by every failed request. */
export class ApiError extends Error {
  constructor(message, { status = 0, data = null, isNetworkError = false } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.isNetworkError = isNetworkError;
  }
}

/**
 * Pulls a readable message out of a FastAPI error body.
 * FastAPI returns {detail: "..."} for HTTPException and
 * {detail: [{loc, msg, type}]} for request validation failures.
 */
function extractErrorMessage(body, status) {
  if (!body) return `Request failed (${status}).`;

  if (typeof body === "string") {
    const trimmed = body.trim();
    return trimmed ? trimmed : `Request failed (${status}).`;
  }

  const detail = body.detail;
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    const field = Array.isArray(first.loc) ? first.loc.at(-1) : null;
    return field ? `${field}: ${first.msg}` : first.msg;
  }

  if (typeof body.message === "string") return body.message;
  if (typeof body.error === "string") return body.error;
  return `Request failed (${status}).`;
}

/** Default request timeout in milliseconds (15s) */
export const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

/** Callback invoked on a 401 so AuthContext can log the user out. */
let unauthorizedHandler = null;
let isHandlingUnauthorized = false;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function buildUrl(path, params) {
  const url = `${API_BASE_URL}${path}`;
  if (!params) return url;

  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    search.append(key, value);
  });

  const query = search.toString();
  return query ? `${url}?${query}` : url;
}

/**
 * Core request function.
 *
 * @param {string} path      endpoint path, e.g. '/api/lost-items'
 * @param {Object} options
 * @param {string} options.method
 * @param {Object} options.body      JSON-serialised automatically
 * @param {FormData} options.formData used instead of body for file uploads
 * @param {Object} options.headers   custom headers to merge
 * @param {Object} options.params    query string parameters
 * @param {boolean} options.auth     attach the JWT, default true
 * @param {AbortSignal} options.signal
 * @param {number} options.timeout   timeout in milliseconds (default: 15000)
 */
export async function request(
  path,
  {
    method = "GET",
    body,
    formData,
    headers: customHeaders = {},
    params,
    auth = true,
    signal,
    timeout = DEFAULT_REQUEST_TIMEOUT_MS,
  } = {},
) {
  const headers = { ...customHeaders };

  if (auth && !headers.Authorization) {
    const token = readStorage(STORAGE_KEYS.TOKEN);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let payload;
  if (formData) {
    // Content-Type is intentionally omitted so the browser sets the
    // multipart boundary itself.
    payload = formData;
  } else if (body instanceof URLSearchParams) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    payload = body.toString();
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  // Setup abort controller for timeout and external signal forwarding
  const controller = new AbortController();
  let didTimeout = false;
  let timeoutTimer = null;

  if (timeout > 0) {
    timeoutTimer = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeout);
  }

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  let response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: payload,
      signal: controller.signal,
    });
  } catch (error) {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    if (didTimeout) {
      throw new ApiError(
        `Request timed out after ${timeout / 1000} seconds. The campus server may be unreachable.`,
        { isNetworkError: true, status: 408 },
      );
    }
    if (error.name === "AbortError" && !didTimeout) throw error;
    const targetUrl = API_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
    throw new ApiError(
      `Unable to reach the server at ${targetUrl}. Please check your connection and ensure the backend is running.`,
      { isNetworkError: true, status: 0 },
    );
  } finally {
    if (timeoutTimer) clearTimeout(timeoutTimer);
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    // Only invoke 401 logout callback for authenticated requests with a token
    // to prevent loop / clearing session during bad credential logins
    if (auth && response.status === 401 && unauthorizedHandler && !isHandlingUnauthorized) {
      isHandlingUnauthorized = true;
      try {
        unauthorizedHandler();
      } catch (handlerErr) {
        console.error("Failed to execute unauthorized session handler:", handlerErr);
      } finally {
        isHandlingUnauthorized = false;
      }
    }
    throw new ApiError(extractErrorMessage(data, response.status), {
      status: response.status,
      data,
    });
  }

  return data;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) =>
    request(path, { ...options, method: "POST", body }),
  put: (path, body, options) =>
    request(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) =>
    request(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
  upload: (path, formData, options) =>
    request(path, { ...options, method: "POST", formData }),
};

export default api;
