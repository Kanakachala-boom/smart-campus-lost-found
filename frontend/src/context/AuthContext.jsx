/**
 * Authentication state.
 *
 * Foundation only: session shape, persistence and role helpers. The login
 * and registration screens are not part of this stage.
 *
 * SECURITY NOTE
 * The JWT is kept in localStorage so the session survives a refresh. This is
 * readable by any script on the origin, so it is only acceptable because the
 * backend independently authorises every request. Role checks here control
 * what the interface offers, never what the API permits. The backend must
 * re-check the role on every protected route.
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { setUnauthorizedHandler } from "../services/api";
import authService from "../services/authService";
import { ROLES } from "../utils/constants";
import {
  clearAppStorage,
  readStorage,
  STORAGE_KEYS,
  writeStorage,
} from "../utils/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStorage(STORAGE_KEYS.USER));
  const [token, setToken] = useState(() => readStorage(STORAGE_KEYS.TOKEN));
  // Starts true so route guards (added later) wait for the session check
  // instead of bouncing an authenticated user to login on reload.
  const [isInitialising, setIsInitialising] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    clearAppStorage();
  }, []);

  const persistSession = useCallback((accessToken, userRecord) => {
    setToken(accessToken);
    setUser(userRecord);
    writeStorage(STORAGE_KEYS.TOKEN, accessToken);
    writeStorage(STORAGE_KEYS.USER, userRecord);
  }, []);

  /* A 401 from any request means the token is gone or expired. */
  useEffect(() => {
    setUnauthorizedHandler(() => clearSession());
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  /* Revalidate a stored token once on load. */
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!token) {
        setIsInitialising(false);
        return;
      }

      try {
        const current = await authService.getCurrentUser();
        if (cancelled) return;
        setUser(current);
        writeStorage(STORAGE_KEYS.USER, current);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsInitialising(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
    // Runs once on mount; token changes are handled by login/logout directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (credentials) => {
      const result = await authService.login(credentials);
      persistSession(result.access_token, result.user);
      return result.user;
    },
    [persistSession],
  );

  const register = useCallback(
    async (details) => {
      const result = await authService.register(details);
      persistSession(result.access_token, result.user);
      return result.user;
    },
    [persistSession],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      token,
      isInitialising,
      isAuthenticated: Boolean(token && user),
      isAdmin: user?.role === ROLES.ADMIN,
      login,
      register,
      logout,
    }),
    [user, token, isInitialising, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
