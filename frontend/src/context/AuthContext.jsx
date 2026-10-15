
/**
 * Authentication state for The National Institute of Engineering (NIE), Mysuru.
 *
 * Provides session management, token persistence, role helpers, and
 * login/logout/recovery methods for all application components.
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
  const [user, setUser] = useState(() =>
    readStorage(STORAGE_KEYS.USER)
  );

  const [token, setToken] = useState(() =>
    readStorage(STORAGE_KEYS.TOKEN)
  );

  const [isInitialising, setIsInitialising] = useState(true);

  // Clear authentication state and persisted session.
  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);

    removeStorage(STORAGE_KEYS.TOKEN);
    removeStorage(STORAGE_KEYS.USER);
  }, []);

  // Save authenticated user and token.
  const persistSession = useCallback((accessToken, userRecord) => {
    writeStorage(STORAGE_KEYS.TOKEN, accessToken);
    writeStorage(STORAGE_KEYS.USER, userRecord);

    setToken(accessToken);
    setUser(userRecord);
  }, []);

  // Clear the session if the API reports an unauthorized request.
  useEffect(() => {
    setUnauthorizedHandler(() => clearSession());

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [clearSession]);

  // Restore and validate a saved session on application startup.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!token) {
        setIsInitialising(false);
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser();

        if (cancelled) return;

        if (!currentUser) {
          clearSession();
          return;
        }

        setUser(currentUser);
        writeStorage(STORAGE_KEYS.USER, currentUser);
      } catch (error) {
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) {
          setIsInitialising(false);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [token, clearSession]);

  // Login.
  const login = useCallback(
    async (credentials) => {
      const result = await authService.login(credentials);

      if (!result?.access_token || !result?.user) {
        throw new Error(
          "Login response is missing the access token or user profile."
        );
      }

      persistSession(result.access_token, result.user);

      return result;
    },
    [persistSession]
  );

  // Logout: clear the local session even if the API request fails.
  const logout = useCallback(async () => {
    const logoutRequest = authService.logout();

    clearSession();

    try {
      await logoutRequest;
    } catch (error) {
      // Local logout is complete even if the server request fails.
      console.error("Logout API request failed:", error);
    }
  }, [clearSession]);

  // Password recovery.
  const requestPasswordReset = useCallback(async (email) => {
    return authService.requestPasswordReset(email);
  }, []);

  const resetPassword = useCallback(async (params) => {
    return authService.resetPassword(params);
  }, []);

  const isAdmin = user?.role === ROLES.ADMIN;

  const value = useMemo(
    () => ({
      user,
      token,
      isInitialising,
      isAuthenticated: Boolean(token && user),
      isAdmin,
      login,
      logout,
      requestPasswordReset,
      resetPassword,
    }),
    [
      user,
      token,
      isInitialising,
      isAdmin,
      login,
      logout,
      requestPasswordReset,
      resetPassword,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
