"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConfettiCelebration } from "@/components/confetti-celebration";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { BusinessSearchBar } from "@/components/business-search-bar";
import { useUserSession } from "@/hooks/use-user-session";
import { Search, Building2, Users, TrendingUp, Globe, Zap } from "lucide-react";

function HomeContent() {
  const searchParams = useSearchParams();
  const { user, isLoading: isSessionLoading, refetch: refetchSession } = useUserSession();
  const [showCelebration, setShowCelebration] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const registered = searchParams.get("registered");
    const loggedin = searchParams.get("loggedin");
    const googleLogin = searchParams.get("google_login");
    const email = searchParams.get("email");

    // Refetch session when user successfully logs in or registers
    if (registered === "true" || loggedin === "true" || googleLogin === "true") {
      refetchSession();
    }
    
    if (registered === "true") {
      setShowCelebration(true);
      
      // Hide celebration after 3 seconds
      timerRef.current = setTimeout(() => {
        setShowCelebration(false);
        // Remove the query parameter from URL after hiding celebration
        const url = new URL(window.location.href);
        url.searchParams.delete("registered");
        window.history.replaceState({}, "", url.toString());
        timerRef.current = null;
      }, 3000);
    } else if (loggedin === "true") {
      setShowCelebration(true);
      
      // Hide celebration after 3 seconds
      timerRef.current = setTimeout(() => {
        setShowCelebration(false);
        // Remove the query parameter from URL after hiding celebration
        const url = new URL(window.location.href);
        url.searchParams.delete("loggedin");
        window.history.replaceState({}, "", url.toString());
        timerRef.current = null;
      }, 3000);
    } else if (googleLogin === "true") {
      setShowCelebration(true);
      
      // Hide celebration after 3 seconds
      timerRef.current = setTimeout(() => {
        setShowCelebration(false);
        // Remove the query parameters from URL after hiding celebration
        const url = new URL(window.location.href);
        url.searchParams.delete("google_login");
        url.searchParams.delete("email");
        window.history.replaceState({}, "", url.toString());
        timerRef.current = null;
      }, 3000);
    } else {
      // If no query params, ensure celebration is hidden
      setShowCelebration(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      {showCelebration && <ConfettiCelebration />}

      {/* Navigation */}
      <nav className="border-b bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-6 w-6" />
              <span className="text-xl font-bold">Hypercaller</span>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              {!isSessionLoading && (
                <>
                  {user ? (
                    <UserProfileDropdown user={user} />
                  ) : (
                    <>
                      <Button variant="ghost" asChild>
                        <Link href="/login">Sign In</Link>
                      </Button>
                      <Button asChild>
                        <Link href="/register">Sign Up</Link>
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Discover Businesses Worldwide
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
            Connect with companies, explore opportunities, and grow your network.
            The ultimate platform for business discovery and networking.
          </p>
          
          {/* Search Bar - Only for authenticated users */}
          {user && (
            <div className="mt-8">
              <BusinessSearchBar className="py-0" />
            </div>
          )}
          
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button size="lg" className="text-base">
              <Search className="mr-2 h-5 w-5" />
              Start Discovering
            </Button>
            <Button size="lg" variant="outline" className="text-base">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to discover businesses
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Powerful features to help you find, connect, and engage with businesses
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="mb-4 h-12 w-12 rounded-lg border flex items-center justify-center">
                <Search className="h-6 w-6" />
              </div>
              <CardTitle>Advanced Search</CardTitle>
              <CardDescription>
                Find businesses by industry, location, size, and more with our
                powerful search engine
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 h-12 w-12 rounded-lg border flex items-center justify-center">
                <Building2 className="h-6 w-6" />
              </div>
              <CardTitle>Company Profiles</CardTitle>
              <CardDescription>
                Detailed company information, contact details, and business insights
                all in one place
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 h-12 w-12 rounded-lg border flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <CardTitle>Networking</CardTitle>
              <CardDescription>
                Connect with decision makers and build meaningful business
                relationships
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 h-12 w-12 rounded-lg border flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
              <CardTitle>Market Insights</CardTitle>
              <CardDescription>
                Get real-time market trends and analytics to make informed
                business decisions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 h-12 w-12 rounded-lg border flex items-center justify-center">
                <Globe className="h-6 w-6" />
              </div>
              <CardTitle>Global Reach</CardTitle>
              <CardDescription>
                Access businesses from around the world and expand your
                international network
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 h-12 w-12 rounded-lg border flex items-center justify-center">
                <Zap className="h-6 w-6" />
              </div>
              <CardTitle>Fast & Reliable</CardTitle>
              <CardDescription>
                Lightning-fast search results and reliable data to keep you
                ahead of the competition
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Ready to get started?</CardTitle>
            <CardDescription className="text-lg mt-4">
              Join thousands of professionals discovering and connecting with
              businesses every day
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              size="lg"
              className="text-base"
              asChild
            >
              <Link href="/register">Create Free Account</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Zap className="h-5 w-5" />
                <span className="font-bold">Hypercaller</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The ultimate business discovery platform
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Features</a></li>
                <li><a href="#" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Careers</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; 2024 Hypercaller. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <HomeContent />
    </Suspense>
  );
}
