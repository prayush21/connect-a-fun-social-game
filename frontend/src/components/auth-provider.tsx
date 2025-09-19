"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initAuth = useStore((state) => state.initAuth);
  const sessionId = useStore((state) => state.sessionId);

  useEffect(() => {
    // Initialize authentication when the app starts
    if (!sessionId) {
      initAuth();
    }
  }, [initAuth, sessionId]);

  return <>{children}</>;
}
