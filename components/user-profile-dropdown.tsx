"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { LogOut, User, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar: string;
}

interface UserProfileDropdownProps {
  user: User;
}

export function UserProfileDropdown({ user }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    const sessionId = localStorage.getItem("sessionId");
    
    // Invalidate session on server (update database)
    if (sessionId) {
      try {
        const response = await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": sessionId,
          },
        });

        if (!response.ok) {
          console.error("Logout API returned error:", response.status);
          // Continue with logout even if API call fails
        }
      } catch (error) {
        console.error("Error calling logout API:", error);
        // Continue with logout even if API call fails (network error, etc.)
      }
    }

    // Clear localStorage (client-side cleanup)
    localStorage.removeItem("sessionId");
    localStorage.removeItem("user");

    // Close dropdown
    setIsOpen(false);

    // Force a full page reload to ensure all components reset and show login/signup buttons
    window.location.href = "/";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        className="flex items-center gap-2 h-auto p-2 hover:bg-accent"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Avatar avatarId={user.avatar} size="md" />
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md border bg-background shadow-lg z-50">
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <Avatar avatarId={user.avatar} size="lg" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-xs text-muted-foreground">@{user.username}</span>
              </div>
            </div>
          </div>
          <div className="p-1">
            <button
              onClick={() => {
                setIsOpen(false);
                // Navigate to profile page (if exists) or do nothing
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-accent transition-colors"
            >
              <User className="h-4 w-4" />
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-accent text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

