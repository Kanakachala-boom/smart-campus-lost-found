/**
 * Utility helper to ensure image URLs point to the full backend server address
 * when relative paths like /uploads/xyz are stored in the database.
 */

import { API_BASE_URL } from "../services/api";

export function getFullImageUrl(url) {
  if (!url) return null;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  const base = API_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase}${cleanUrl}`;
}

export default getFullImageUrl;
