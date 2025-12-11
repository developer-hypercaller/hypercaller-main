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
    setIsLoading(true);
    try {
      const sessionId = localStorage.getItem("sessionId");
      const storedUser = localStorage.getItem("user");

      if (!sessionId || !storedUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Validate session with server
      const response = await fetch("/api/auth/session", {
        method: "GET",
        headers: {
          "x-session-id": sessionId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.session) {
          // Parse user from localStorage
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } else {
          // Session invalid, clear storage
          localStorage.removeItem("sessionId");
          localStorage.removeItem("user");
          setUser(null);
        }
      } else {
        // Session invalid, clear storage
        localStorage.removeItem("sessionId");
        localStorage.removeItem("user");
        setUser(null);
      }
    } catch (error) {
      console.error("Error checking session:", error);
      // On error, try to use stored user data
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

