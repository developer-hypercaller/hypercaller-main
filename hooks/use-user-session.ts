"use client";

import { useState, useEffect } from "react";

interface User {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar: string;
}

interface UseUserSessionReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetch: () => void;
}

export function useUserSession(): UseUserSessionReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = async () => {
    try {
      const sessionId = localStorage.getItem("sessionId");
      const storedUser = localStorage.getItem("user");

      if (!sessionId || !storedUser) {
        setUser(null);
        return;
      }

      // Optimistically use cached user for faster UI, then validate in background
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }

      const response = await fetch("/api/auth/session", {
        method: "GET",
        headers: {
          "x-session-id": sessionId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (!(data.success && data.session)) {
          localStorage.removeItem("sessionId");
          localStorage.removeItem("user");
          setUser(null);
        }
      } else {
        localStorage.removeItem("sessionId");
        localStorage.removeItem("user");
        setUser(null);
      }
    } catch (error) {
      console.error("Error checking session:", error);
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Bootstrap quickly from cache, then validate in background
    const sessionId = localStorage.getItem("sessionId");
    const storedUser = localStorage.getItem("user");
    if (sessionId && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
      setIsLoading(false);
    } else {
      setUser(null);
      setIsLoading(false);
    }

    checkSession();

    // Listen for storage changes (e.g., login/logout in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sessionId" || e.key === "user") {
        checkSession();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refetch: checkSession,
  };
}

