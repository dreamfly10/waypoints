import React, { createContext, useContext } from "react";

type AuthContextValue = {
  user: { id: string } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  accessToken: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const noError = Promise.resolve({ error: null });

  const value: AuthContextValue = {
    user: { id: "demo-user" },
    loading: false,
    signIn: async () => noError,
    signUp: async () => noError,
    signInWithGoogle: async () => noError,
    signOut: async () => {},
    accessToken: null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
