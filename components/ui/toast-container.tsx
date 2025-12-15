"use client";

import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { Button } from "./button";
import { useToast, type Toast as ToastType } from "@/hooks/use-toast";

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
          duration={toast.duration}
        />
      ))}
    </div>
  );
}

interface ToastWithTypeProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
  duration?: number;
}

function Toast({ message, type = "info", onClose, duration = 5000 }: ToastWithTypeProps) {
  const icons = {
    success: CheckCircle2,
    error: XCircle,
    info: Info,
  };

  const Icon = icons[type];
  const bgColors = {
    success: "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
    error: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
    info: "bg-background border-2",
  };

  const textColors = {
    success: "text-green-800 dark:text-green-200",
    error: "text-red-800 dark:text-red-200",
    info: "text-foreground",
  };

  return (
    <div className={`${bgColors[type]} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-md animate-in slide-in-from-bottom-5`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${textColors[type]} shrink-0 mt-0.5`} />
        <p className={`text-sm font-medium flex-1 ${textColors[type]}`}>{message}</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

