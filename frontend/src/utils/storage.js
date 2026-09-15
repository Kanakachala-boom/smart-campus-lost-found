/**
 * Thin localStorage wrapper.
 *
 * Access is wrapped in try/catch because localStorage throws in private
 * browsing modes and when storage quota is exceeded. A storage failure
 * should degrade the experience, never break the page.
 */

const PREFIX = "scl_";

export const STORAGE_KEYS = {
  TOKEN: `${PREFIX}auth_token`,
  USER: `${PREFIX}auth_user`,
  THEME: `${PREFIX}theme_preference`,
};

export function readStorage(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key) {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Clears only this application's keys, leaving other origin data alone. */
export function clearAppStorage() {
  Object.values(STORAGE_KEYS).forEach(removeStorage);
}
