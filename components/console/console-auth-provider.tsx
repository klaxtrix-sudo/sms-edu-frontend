"use client";

import React, { createContext, useContext } from "react";

interface ConsoleAuthContextValue {
  token: string;
  user: { id: string; username: string; role: string } | null;
}

const ConsoleAuthContext = createContext<ConsoleAuthContextValue | null>(null);

export function ConsoleAuthProvider({
  token,
  user,
  children,
}: {
  token: string;
  user: { id: string; username: string; role: string } | null;
  children: React.ReactNode;
}) {
  return (
    <ConsoleAuthContext.Provider value={{ token, user }}>
      {children}
    </ConsoleAuthContext.Provider>
  );
}

export function useConsoleAuth(): ConsoleAuthContextValue {
  const ctx = useContext(ConsoleAuthContext);
  if (!ctx) {
    throw new Error("useConsoleAuth must be used within a ConsoleAuthProvider");
  }
  return ctx;
}

/**
 * Returns a function that produces Authorization headers for backend API calls.
 * Reads the token from the console auth context (backed by httpOnly cookie).
 * Returns a function to match the old getConsoleAuthHeaders() API.
 */
export function useConsoleAuthHeaders() {
  const { token } = useConsoleAuth();
  return () => ({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
