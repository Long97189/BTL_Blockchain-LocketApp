import React, { createContext, useEffect, useState } from "react";
import { apiRequest } from "../utils/api";

export const AuthContext = createContext(null);

const TOKEN_KEY = "locket-social-token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const bootstrapSession = async () => {
      if (!token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const payload = await apiRequest("/auth/me", {
          token,
        });
        setUser(payload.user);
      } catch (error) {
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
        setUser(null);
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrapSession();
  }, [token]);

  const persistSession = (nextToken, nextUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
  };

  const login = async (email, password) => {
    const payload = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    persistSession(payload.token, payload.user);
    return payload.user;
  };

  const register = async (email, password) => {
    const payload = await apiRequest("/auth/register", {
      method: "POST",
      body: { email, password },
    });

    persistSession(payload.token, payload.user);
    return payload.user;
  };

  const refreshMe = async () => {
    if (!token) {
      return null;
    }

    const payload = await apiRequest("/auth/me", { token });
    setUser(payload.user);
    return payload.user;
  };

  const updateCurrentUser = (nextUser) => {
    setUser(nextUser);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isBootstrapping,
        login,
        register,
        logout: clearSession,
        refreshMe,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
