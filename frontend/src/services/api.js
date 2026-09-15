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
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

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

  const detail = body.detail;
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    const field = Array.isArray(first.loc) ? first.loc.at(-1) : null;
    return field ? `${field}: ${first.msg}` : first.msg;
  }

  if (typeof body.message === "string") return body.message;
  return `Request failed (${status}).`;
}

/** Callback invoked on a 401 so AuthContext can log the user out. */
let unauthorizedHandler = null;

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
 * @param {Object} options.params    query string parameters
 * @param {boolean} options.auth     attach the JWT, default true
 * @param {AbortSignal} options.signal
 */
export async function request(
  path,
  { method = "GET", body, formData, params, auth = true, signal } = {},
) {
  const headers = {};

  if (auth) {
    const token = readStorage(STORAGE_KEYS.TOKEN);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let payload;
  if (formData) {
    // Content-Type is intentionally omitted so the browser sets the
    // multipart boundary itself.
    payload = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: payload,
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(
      "Unable to reach the server. Check your connection and try again.",
      { isNetworkError: true },
    );
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && unauthorizedHandler) unauthorizedHandler();
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
