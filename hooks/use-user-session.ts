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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hooks/use-user-session.ts:25',message:'checkSession entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    try {
      const sessionId = localStorage.getItem("sessionId");
      const storedUser = localStorage.getItem("user");
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hooks/use-user-session.ts:28',message:'After get localStorage',data:{hasSessionId:!!sessionId,hasStoredUser:!!storedUser},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      if (!sessionId || !storedUser) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hooks/use-user-session.ts:31',message:'No sessionId or storedUser branch',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        setUser(null);
        return;
      }

      // Optimistically use cached user for faster UI, then validate in background
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hooks/use-user-session.ts:42',message:'Before fetch session API',data:{sessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      const response = await fetch("/api/auth/session", {
        method: "GET",
        headers: {
          "x-session-id": sessionId,
        },
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hooks/use-user-session.ts:49',message:'After fetch session API',data:{status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      if (response.ok) {
        const data = await response.json();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hooks/use-user-session.ts:52',message:'After parse response',data:{success:data.success,hasSession:!!data.session},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        if (!(data.success && data.session)) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hooks/use-user-session.ts:54',message:'Invalid session response branch',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          localStorage.removeItem("sessionId");
          localStorage.removeItem("user");
          setUser(null);
        }
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hooks/use-user-session.ts:60',message:'Response not ok branch',data:{status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        localStorage.removeItem("sessionId");
        localStorage.removeItem("user");
        setUser(null);
      }
    } catch (error) {
      // #region agent log
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'Unknown';
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hooks/use-user-session.ts:61',message:'checkSession catch error',data:{errorMessage:errorMsg,errorName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
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

