/**
 * Authentication state.
 *
 * Provides session management, token persistence, role helpers, and
 * login/register/logout methods for all application components.
 *
 * SECURITY NOTE:
 * The JWT is kept in localStorage so the session survives a browser refresh.
 * Role checks here control interface presentation only; the backend
 * independently re-authenticates every request via the Authorization header.
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
  readStorage,
  removeStorage,
  STORAGE_KEYS,
  writeStorage,
} from "../utils/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStorage(STORAGE_KEYS.USER));
  const [token, setToken] = useState(() => readStorage(STORAGE_KEYS.TOKEN));
  // Starts true so route guards wait for the session check on page load
  const [isInitialising, setIsInitialising] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    removeStorage(STORAGE_KEYS.TOKEN);
    removeStorage(STORAGE_KEYS.USER);
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
        if (current) {
          setUser(current);
          writeStorage(STORAGE_KEYS.USER, current);
        }
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
      if (result?.access_token && result?.user) {
        persistSession(result.access_token, result.user);
      }
      return result;
    },
    [persistSession],
  );

  const register = useCallback(
    async (details) => {
      const result = await authService.register(details);
      return result;
    },
    [],
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
