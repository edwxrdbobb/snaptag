import { createContext, useContext, useState, type ReactNode } from "react";

const ENV_USERNAME = import.meta.env.VITE_DASHBOARD_USERNAME as string | undefined;
const ENV_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD as string | undefined;

const STORAGE_KEY = "snaptag-dashboard-auth";

type AuthContextValue = {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => sessionStorage.getItem(STORAGE_KEY) === "true"
  );

  const login = (username: string, password: string): boolean => {
    if (!ENV_USERNAME || !ENV_PASSWORD) {
      console.error(
        "Dashboard credentials are not configured. Set VITE_DASHBOARD_USERNAME and VITE_DASHBOARD_PASSWORD in .env.local"
      );
      return false;
    }
    if (username === ENV_USERNAME && password === ENV_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
