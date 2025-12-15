"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { useUserSession } from "@/hooks/use-user-session";

export function AppHeader() {
  const { user, isLoading: isSessionLoading } = useUserSession();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isHomePage = pathname === "/";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${mounted ? "animate-slide-down" : "opacity-0"}`}>
      <div className="mx-4 sm:mx-6 lg:mx-8 mt-4">
        <div className="glass rounded-2xl px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg overflow-hidden">
                  <Image
                    src="/hypercaller-logo.png"
                    alt="Hypercaller logo"
                    width={36}
                    height={36}
                    className="rounded-lg object-contain"
                    priority
                  />
                </div>
              </div>
              <span className="text-xl font-bold tracking-tight">Hypercaller</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className={pathname === "/pricing" ? "text-primary" : ""}
              >
                <Link href="/pricing" className="text-sm font-medium">
                  Pricing
                </Link>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className={pathname === "/contact" ? "text-primary" : ""}
              >
                <Link href="/contact" className="text-sm font-medium">
                  Contact
                </Link>
              </Button>
            </nav>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              {isSessionLoading ? (
                <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
              ) : user ? (
                <UserProfileDropdown user={user} />
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="hidden sm:flex" asChild>
                    <Link href="/login">Sign in</Link>
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white border-0 shadow-lg shadow-violet-500/25" 
                    asChild
                  >
                    <Link href="/register">Get started</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

