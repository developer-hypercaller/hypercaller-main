"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getAvatarEmoji } from "@/lib/avatar-map";

interface AvatarProps {
  avatarId?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-6 text-sm",
  md: "w-8 h-8 text-lg",
  lg: "w-10 h-10 text-xl",
  xl: "w-12 h-12 text-2xl",
};

export function Avatar({ avatarId, size = "md", className }: AvatarProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [emoji, setEmoji] = useState<string>("");

  useEffect(() => {
    // Reset loading state when avatarId changes
    setIsLoaded(false);
    
    // Lazy load the emoji with a small delay to ensure smooth rendering
    const timer = setTimeout(() => {
      const loadedEmoji = getAvatarEmoji(avatarId);
      setEmoji(loadedEmoji);
      setIsLoaded(true);
    }, 50); // Small delay for smooth loading

    return () => clearTimeout(timer);
  }, [avatarId]);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/10 leading-none relative",
        sizeClasses[size],
        className
      )}
      aria-label="User avatar"
      role="img"
    >
      {/* Always reserve space - show placeholder while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1/2 h-1/2 rounded-full bg-primary/20 animate-pulse" />
        </div>
      )}
      
      {/* Render emoji only when loaded */}
      {isLoaded && (
        <span
          className="inline-block select-none transition-opacity duration-200"
          style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
        >
          {emoji}
        </span>
      )}
    </div>
  );
}

