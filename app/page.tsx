"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConfettiCelebration } from "@/components/confetti-celebration";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { BusinessSearchBar, type SearchSummary } from "@/components/business-search-bar";
import { useUserSession } from "@/hooks/use-user-session";
import {
  Search,
  Zap,
  Building2,
  Users,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Database,
  Target,
  ChevronRight,
  Play,
  Star,
} from "lucide-react";

const features = [
  {
    title: "AI business discovery",
    description: "Search once and see the right businesses ranked with AI so users find what they need fast.",
    icon: Search,
    color: "from-cyan-500 to-blue-600",
    iconBg: "bg-gradient-to-br from-cyan-500 to-blue-600",
  },
  {
    title: "Trusted company profiles",
    description: "Verified details so both users and businesses see accurate information without extra clicks.",
    icon: Building2,
    color: "from-violet-500 to-purple-600",
    iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
  },
  {
    title: "Better leads for both sides",
    description: "Users get relevant options; businesses get qualified visibility and inbound interest that matches.",
    icon: Users,
    color: "from-rose-500 to-pink-600",
    iconBg: "bg-gradient-to-br from-rose-500 to-pink-600",
  },
];

const stats = [
  { value: "6.5M+", label: "Businesses indexed", icon: Database, color: "text-violet-500" },
  { value: "120K+", label: "Fresh signals daily", icon: TrendingUp, color: "text-cyan-500" },
  { value: "<200ms", label: "AI ranking speed", icon: Zap, color: "text-amber-500" },
  { value: "99.9%", label: "Platform uptime", icon: Target, color: "text-emerald-500" },
];

const headerLinks = [
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

const footerLinks = [
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

const DEFAULT_RECENTS: SearchSummary[] = [
  { query: "Verified service providers in Mumbai", resultCount: 128, timestamp: Date.now() - 1000 * 60 * 45 }, // 45m ago
  { query: "Trusted vendors in Delhi NCR", resultCount: 112, timestamp: Date.now() - 1000 * 60 * 90 }, // 1.5h ago
  { query: "Customer support partners in Mumbai", resultCount: 96, timestamp: Date.now() - 1000 * 60 * 180 }, // 3h ago
];

function HomeContent() {
  const searchParams = useSearchParams();
  const { user, isLoading: isSessionLoading } = useUserSession();
  const [showCelebration, setShowCelebration] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchSummary[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load recent searches from localStorage (client-only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("recentSearches");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, 5));
          return;
        }
      } catch (err) {
        console.error("Failed to parse recent searches", err);
      }
    }
    // Seed with helpful examples on first load
    setRecentSearches(DEFAULT_RECENTS);
    localStorage.setItem("recentSearches", JSON.stringify(DEFAULT_RECENTS));
  }, []);

  const handleSearchComplete = (entry: SearchSummary) => {
    setRecentSearches((prev) => {
      const deduped = [entry, ...prev.filter((p) => p.query.toLowerCase() !== entry.query.toLowerCase())];
      const next = deduped.slice(0, 5);
      if (typeof window !== "undefined") {
        localStorage.setItem("recentSearches", JSON.stringify(next));
      }
      return next;
    });
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const registered = searchParams.get("registered");
    const loggedin = searchParams.get("loggedin");
    const googleLogin = searchParams.get("google_login");

    if (registered === "true" || loggedin === "true" || googleLogin === "true") {
      setShowCelebration(true);
      timerRef.current = setTimeout(() => {
        setShowCelebration(false);
        const url = new URL(window.location.href);
        url.searchParams.delete("registered");
        url.searchParams.delete("loggedin");
        url.searchParams.delete("google_login");
        url.searchParams.delete("email");
        window.history.replaceState({}, "", url.toString());
        timerRef.current = null;
      }, 3000);
    } else {
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
    <div className="min-h-screen mesh-gradient noise-overlay relative overflow-x-hidden">
      {showCelebration && <ConfettiCelebration />}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="glow-orb w-[600px] h-[600px] bg-violet-500/30 top-[-200px] left-[-100px] animate-float" />
        <div className="glow-orb w-[500px] h-[500px] bg-cyan-500/20 top-[30%] right-[-150px] animate-float-delayed" />
        <div className="glow-orb w-[400px] h-[400px] bg-rose-500/20 bottom-[-100px] left-[20%] animate-pulse-glow" />
      </div>

      <div className="pointer-events-none fixed inset-0 dot-pattern opacity-60" />

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

              <nav className="hidden md:flex items-center gap-2">
                {headerLinks.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="group relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground/80 transition-all duration-300 hover:text-foreground"
                  >
                    <span className="relative">
                      <span className="absolute inset-0 bg-gradient-to-r from-violet-500/20 via-cyan-500/20 to-rose-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="relative">{item.label}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground scale-0 translate-x-[-6px] opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-primary" />
                    <span className="pointer-events-none absolute left-3 right-3 bottom-1 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-violet-500 via-cyan-500 to-rose-500 transition-transform duration-300 group-hover:scale-x-100" />
                  </Link>
                ))}
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
                    <Button size="sm" className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white border-0 shadow-lg shadow-violet-500/25" asChild>
                      <Link href="/register">Get started</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative min-h-[100vh] flex items-center justify-center pt-20 pb-10 sm:pt-24 sm:pb-12">
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className={`mb-8 inline-flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium backdrop-blur-sm ${mounted ? "animate-scale-in" : "opacity-0"}`}>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">Live data • Updated every 5 minutes</span>
            </div>

            <h1 className="relative">
              <span className={`block text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tight ${mounted ? "animate-text-reveal" : "opacity-0"}`}>
                Find the right
              </span>
              <span className={`block text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tight mt-2 gradient-text ${mounted ? "animate-text-reveal stagger-2" : "opacity-0"}`}>
                business, faster
              </span>
            </h1>

            <p className={`mx-auto mt-8 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed ${mounted ? "animate-slide-up stagger-3" : "opacity-0"}`}>
              Hypercaller is a business discovery platform. Users find the right businesses quickly; businesses get trusted visibility and better inbound leads — all powered by AI for both sides.
            </p>

            <div className={`mt-10 sm:mt-12 ${mounted ? "animate-slide-up stagger-4" : "opacity-0"}`}>
              <Card className="relative border-0 bg-card/80 shadow-2xl shadow-foreground/5 backdrop-blur-xl overflow-hidden">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500 via-cyan-500 to-rose-500 opacity-20 blur-sm" />
                <div className="absolute inset-[1px] rounded-xl bg-card" />
                
                <CardContent className="relative p-6 sm:p-8">
                  <BusinessSearchBar className="py-0" onSearchComplete={handleSearchComplete} />
                  
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    <span className="text-sm text-muted-foreground">Try:</span>
                    {[
                      "Best-rated service providers in Mumbai",
                      "Trusted vendors in Delhi NCR",
                      "Customer support partners in Mumbai",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-sm transition-all hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
                      >
                        <Sparkles className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className={`mt-12 sm:mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 ${mounted ? "animate-slide-up stagger-5" : "opacity-0"}`}>
              {stats.map((stat) => (
                <div key={stat.label} className="relative group">
                  <div className="glass rounded-2xl p-4 sm:p-5 card-hover text-center">
                    <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight">{stat.value}</div>
                    <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </section>

      {!isSessionLoading && user && (
        <section className="relative py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-2xl blur-md opacity-50" />
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Recent searches</h2>
                    <p className="text-muted-foreground">Pick up where you left off</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link href="/profile?tab=searches">
                  View all <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="space-y-3">
                {recentSearches.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-card/60 p-4 text-sm text-muted-foreground text-center">
                    Your latest searches will appear here once you start exploring.
                  </div>
                )}
                {recentSearches.map((item, index) => (
                  <div
                    key={item.query}
                    className="group glass rounded-2xl p-5 card-hover cursor-pointer"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/50 transition-colors group-hover:bg-primary/10">
                          <Search className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate group-hover:text-primary transition-colors">{item.query}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-muted-foreground">{formatRelativeTime(item.timestamp)}</span>
                            <span className="text-sm text-muted-foreground">•</span>
                            <span className="text-sm text-primary/80">{item.resultCount} results</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 line-pattern opacity-40" />
        
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Star className="h-3.5 w-3.5" />
              Powerful features
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Built for discovery <span className="gradient-text">and revenue</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Everything users need to find the right businesses fast, and everything businesses need to be discovered with confidence.
            </p>
          </div>

          <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <Card 
                key={feature.title} 
                className="group relative overflow-hidden border-0 bg-card/60 backdrop-blur-xl card-hover"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                
                <CardContent className="relative p-8">
                  <div className="mb-6">
                    <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${feature.iconBg} shadow-lg`}>
                      <feature.icon className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  
                  <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Learn more <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {!isSessionLoading && !user && (
        <section className="relative py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative mx-auto max-w-4xl px-2 sm:px-0">
              <div className="relative rounded-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-cyan-500 to-rose-500 animate-border-beam" />
                <div className="absolute inset-[2px] rounded-[22px] bg-card" />
                
                <div className="relative px-6 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20 text-center">
                  <div className="absolute top-8 left-6 sm:left-8 w-16 sm:w-20 h-16 sm:h-20 bg-violet-500/10 rounded-full blur-2xl" />
                  <div className="absolute bottom-8 right-6 sm:right-8 w-24 sm:w-32 h-24 sm:h-32 bg-cyan-500/10 rounded-full blur-2xl" />
                  
                  <div className="relative">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
                      <Play className="h-3.5 w-3.5" />
                      Free to start
                    </div>
                    
                    <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
                      Ready to discover and be discovered?
                    </h2>
                    <p className="mt-6 text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
                      Create an account to unlock AI-enriched discovery, save searches, and get better matches for users and businesses.
                    </p>
                    
                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                      <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white border-0 shadow-lg shadow-violet-500/25 h-12 px-8 text-base" asChild>
                        <Link href="/register">
                          Create free account
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base" asChild>
                        <Link href="/login">Sign in</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <footer className="relative border-t border-border/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold">Hypercaller</span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {footerLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group relative inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition-all duration-300 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                >
                  <span>{item.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                  <span className="pointer-events-none absolute inset-x-3 bottom-[6px] h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
            
            <p className="text-sm text-muted-foreground">© 2025 Hypercaller</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 animate-pulse" />
          <span className="text-xl font-bold">Loading...</span>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

