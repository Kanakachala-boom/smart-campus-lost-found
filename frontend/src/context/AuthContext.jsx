/**
 * Authentication state for The National Institute of Engineering (NIE), Mysuru.
 *
 * Provides session management, token persistence, role helpers, and
 * login/logout/recovery methods for all application components.
 *
 * Registration is intentionally omitted as accounts are pre-authorized institutional NIE logins.
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
  }, [token, clearSession]);

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

  const requestPasswordReset = useCallback(async (email) => {
    return authService.requestPasswordReset(email);
  }, []);

  const resetPassword = useCallback(async (params) => {
    return authService.resetPassword(params);
  }, []);

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
      requestPasswordReset,
      resetPassword,
      logout,
    }),
    [user, token, isInitialising, login, requestPasswordReset, resetPassword, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
