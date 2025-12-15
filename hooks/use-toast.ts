"use client";

import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info", duration = 5000) => {
      const id = Math.random().toString(36).substring(7);
      const toast: Toast = { id, message, type, duration };
      setToasts((prev) => [...prev, toast]);

      // Auto-remove after duration
      setTimeout(() => {
        removeToast(id);
      }, duration);

      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    return showToast(message, "success", duration);
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    return showToast(message, "error", duration);
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    return showToast(message, "info", duration);
  }, [showToast]);

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    info,
  };
}

