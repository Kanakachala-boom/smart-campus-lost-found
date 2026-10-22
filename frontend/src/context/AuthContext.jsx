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
  const [sessionError, setSessionError] = useState(null);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    setSessionError(null);
    removeStorage(STORAGE_KEYS.TOKEN);
    removeStorage(STORAGE_KEYS.USER);
  }, []);

  const persistSession = useCallback((accessToken, userRecord) => {
    setToken(accessToken);
    setUser(userRecord);
    setSessionError(null);
    writeStorage(STORAGE_KEYS.TOKEN, accessToken);
    writeStorage(STORAGE_KEYS.USER, userRecord);
  }, []);

  /* A 401 from an authenticated request means the token is gone or expired. */
  useEffect(() => {
    setUnauthorizedHandler(() => clearSession());
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  /**
   * Revalidate a stored token.
   * Defined outcomes:
   * 1. No token: set isInitialising = false immediately (navigates to /login).
   * 2. Valid token: updates user state, clears error, set isInitialising = false.
   * 3. Invalid or expired token (401/403): clears invalid session, set isInitialising = false.
   * 4. Backend unavailable / timeout / 5xx: retains stored session, sets sessionError, set isInitialising = false.
   */
  const restoreSession = useCallback(async () => {
    setIsInitialising(true);
    setSessionError(null);

    const storedToken = readStorage(STORAGE_KEYS.TOKEN);
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsInitialising(false);
      return;
    }

    try {
      const current = await authService.getCurrentUser();
      if (current) {
        setUser(current);
        setToken(storedToken);
        writeStorage(STORAGE_KEYS.USER, current);
        setSessionError(null);
      } else {
        clearSession();
      }
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        // Token is invalid, expired, revoked, or account is deactivated
        clearSession();
      } else {
        // Backend unavailable, database operational error, or request timeout
        const message =
          error?.message ||
          "Unable to connect to the campus server. Please ensure the backend and MySQL database are running.";
        setSessionError(message);
      }
    } finally {
      setIsInitialising(false);
    }
  }, [clearSession]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const register = useCallback(
    async (userData) => {
      const result = await authService.register(userData);
      if (result?.access_token && result?.user) {
        persistSession(result.access_token, result.user);
      }
      return result;
    },
    [persistSession],
  );

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
      sessionError,
      retrySession: restoreSession,
      clearSession,
      isAuthenticated: Boolean(token && user),
      isAdmin: user?.role === ROLES.ADMIN,
      register,
      login,
      requestPasswordReset,
      resetPassword,
      logout,
    }),
    [
      user,
      token,
      isInitialising,
      sessionError,
      restoreSession,
      clearSession,
      register,
      login,
      requestPasswordReset,
      resetPassword,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
