"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { useUserSession } from "@/hooks/use-user-session";
import { MapPin, Navigation, Loader2, CheckCircle2, AlertCircle, CalendarClock, Phone, UserRound, History, ArrowRight, Search as SearchIcon, Edit2, X } from "lucide-react";
import { getRootCategories } from "@/lib/data/categories";
import { avatarMap } from "@/lib/avatar-map";

interface UserProfile {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: string;
  avatar: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: number;
  lastLoginAt: number | null;
  preferredCategories?: string[];
}

interface SearchHistoryItem {
  userId: string;
  createdAt: number;
  query: string;
  filters?: any;
  location?: any;
  resultCount?: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: sessionUser, isLoading: isSessionLoading } = useUserSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingProfileInfo, setIsSavingProfileInfo] = useState(false);
  const [isSavingCategories, setIsSavingCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [firstNameInput, setFirstNameInput] = useState("");
  const [lastNameInput, setLastNameInput] = useState("");
  const [avatarInput, setAvatarInput] = useState<string | null>(null);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const historySectionRef = useRef<HTMLDivElement | null>(null);
  
  // Location state
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  
  // Edit mode state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [originalFirstName, setOriginalFirstName] = useState("");
  const [originalLastName, setOriginalLastName] = useState("");
  const [originalAvatar, setOriginalAvatar] = useState<string | null>(null);

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isSessionLoading && !sessionUser) {
      router.push("/login");
    }
  }, [isSessionLoading, sessionUser, router]);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!sessionUser) return;

      setIsLoading(true);
      setError(null);

      try {
        const sessionId = localStorage.getItem("sessionId");
        if (!sessionId) {
          router.push("/login");
          return;
        }

        const response = await fetch("/api/profile", {
          method: "GET",
          headers: {
            "x-session-id": sessionId,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch profile");
        }

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error("Error parsing profile response:", jsonError);
          throw new Error("Invalid response from server");
        }
        if (data.success && data.user) {
          setProfile(data.user);
          setFirstNameInput(data.user.firstName || "");
          setLastNameInput(data.user.lastName || "");
          setAvatarInput(data.user.avatar || null);
          setPreferredCategories(data.user.preferredCategories || []);
          setOriginalFirstName(data.user.firstName || "");
          setOriginalLastName(data.user.lastName || "");
          setOriginalAvatar(data.user.avatar || null);
          if (data.user.address) {
            setManualAddress(data.user.address);
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionUser) {
      fetchProfile();
    }
  }, [sessionUser, router]);

  // Fetch search history
  useEffect(() => {
    const fetchHistory = async () => {
      if (!sessionUser) return;
      setIsHistoryLoading(true);
      try {
        const sessionId = localStorage.getItem("sessionId");
        if (!sessionId) {
          router.push("/login");
          return;
        }
        const response = await fetch(`/api/search/history?limit=25`, {
          method: "GET",
          headers: {
            "x-session-id": sessionId,
          },
        });
        if (!response.ok) {
          throw new Error("Failed to load search history");
        }
        const data = await response.json();
        if (data.success && Array.isArray(data.items)) {
          setSearchHistory(data.items);
        }
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [sessionUser, router]);

  // Scroll to searches if tab=searches
  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab === "searches" && historySectionRef.current) {
      historySectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [searchParams]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setIsGettingLocation(true);
    setError(null);
    setSuccess(null);
    setShowManualInput(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          await saveLocation({ useCurrentLocation: true, latitude, longitude });
        } catch (err) {
          console.error("Error getting location:", err);
          setError("Failed to get your location. Please try again.");
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMessage = "Failed to get your location.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again or enter your location manually.";
            break;
        }
        setShowManualInput(true);
        setError(errorMessage);
        setIsGettingLocation(false);
      },
      {
        // Prefer a fast, cached fix; avoid long GPS locks on desktop
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 120000,
      }
    );
  };

  const handleManualAddressSubmit = async () => {
    if (!manualAddress.trim()) {
      setError("Please enter an address.");
      return;
    }

    setError(null);
    setSuccess(null);
    await saveLocation({ manualAddress: manualAddress.trim() });
  };

  const formatRelativeTime = (timestampSeconds: number) => {
    if (!timestampSeconds) return "—";
    const diffMs = Date.now() - timestampSeconds * 1000;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleRerunSearch = (query: string) => {
    if (!query) return;
    localStorage.setItem("pendingRerunQuery", query);
    router.push("/");
  };

  const handleStartEditLocation = () => {
    setIsEditingLocation(true);
    setShowManualInput(false);
    setError(null);
    setSuccess(null);
  };

  const handleCancelEditLocation = () => {
    setIsEditingLocation(false);
    setShowManualInput(false);
    setError(null);
    setSuccess(null);
    if (profile?.address) {
      setManualAddress(profile.address);
    }
  };

  const saveLocation = async (locationData: {
    useCurrentLocation?: boolean;
    latitude?: number;
    longitude?: number;
    manualAddress?: string;
  }) => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify(locationData),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          throw new Error("Failed to save location");
        }
        throw new Error(errorData.error || "Failed to save location");
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("Error parsing save location response:", jsonError);
        throw new Error("Invalid response from server");
      }
      if (data.success && data.user) {
        setProfile(data.user);
        setIsEditingLocation(false);
        setSuccess("Location saved successfully!");
        setShowManualInput(false);
        if (data.user.address) {
          setManualAddress(data.user.address);
        }
      }
    } catch (err: any) {
      console.error("Error saving location:", err);
      setError(err.message || "Failed to save location. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEditProfile = () => {
    setOriginalFirstName(firstNameInput);
    setOriginalLastName(lastNameInput);
    setOriginalAvatar(avatarInput);
    setIsEditingProfile(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancelEditProfile = () => {
    setFirstNameInput(originalFirstName);
    setLastNameInput(originalLastName);
    setAvatarInput(originalAvatar);
    setIsEditingProfile(false);
    setError(null);
    setSuccess(null);
  };

  const handleSaveProfileInfo = async () => {
    setIsSavingProfileInfo(true);
    setError(null);
    setSuccess(null);
    try {
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({
          firstName: firstNameInput.trim(),
          lastName: lastNameInput.trim(),
          avatar: avatarInput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save profile");
      }

      const data = await response.json();
      if (data.success && data.user) {
        setProfile(data.user);
        setOriginalFirstName(firstNameInput.trim());
        setOriginalLastName(lastNameInput.trim());
        setOriginalAvatar(avatarInput);
        setIsEditingProfile(false);
        setSuccess("Profile updated successfully.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save profile. Please try again.");
    } finally {
      setIsSavingProfileInfo(false);
    }
  };

  const handleToggleCategory = async (categoryId: string) => {
    const previousCategories = preferredCategories;
    const nextCategories = preferredCategories.includes(categoryId)
      ? preferredCategories.filter((id) => id !== categoryId)
      : [...preferredCategories, categoryId];

    setPreferredCategories(nextCategories);
    setIsSavingCategories(true);
    setError(null);
    setSuccess(null);

    try {
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({
          preferredCategories: nextCategories,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update categories");
      }

      const data = await response.json();
      if (data.success && data.user) {
        setProfile(data.user);
        setPreferredCategories(data.user.preferredCategories || []);
        setSuccess("Preferences updated.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update categories. Please try again.");
      setPreferredCategories(previousCategories);
    } finally {
      setIsSavingCategories(false);
    }
  };

  const rootCategories = getRootCategories().slice(0, 24);

  if (isSessionLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sessionUser || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen mesh-gradient noise-overlay relative overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="glow-orb w-[500px] h-[500px] bg-violet-500/25 top-[-180px] left-[-120px] animate-float" />
        <div className="glow-orb w-[420px] h-[420px] bg-cyan-500/20 bottom-[-100px] right-[-80px] animate-float-delayed" />
        <div className="glow-orb w-[360px] h-[360px] bg-rose-500/20 top-[30%] left-[20%] animate-pulse-glow" />
      </div>
      <div className="pointer-events-none fixed inset-0 dot-pattern opacity-60" />

      <AppHeader />

      {/* Main Content */}
      <main className="relative pt-28 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl space-y-6">
            <Card className="relative border-0 bg-card/80 shadow-2xl shadow-foreground/5 backdrop-blur-xl overflow-hidden">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-violet-500 via-cyan-500 to-rose-500 opacity-20 blur-xl" />
              <div className="absolute inset-[1px] rounded-3xl bg-card" />
              <CardContent className="relative p-6 sm:p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-5">
                    <Avatar avatarId={profile.avatar} size="xl" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Signed in as</p>
                      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{profile.firstName} {profile.lastName}</h1>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <span className="rounded-full bg-primary/10 text-primary px-3 py-1 font-medium">@{profile.username}</span>
                        <span className="rounded-full bg-muted text-foreground/80 px-3 py-1 capitalize flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-muted-foreground" />
                          {profile.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="glass rounded-2xl p-3 border border-border/50">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarClock className="h-4 w-4" />
                        Member since
                      </div>
                      <p className="mt-1 font-semibold">{formatDate(profile.createdAt)}</p>
                    </div>
                    <div className="glass rounded-2xl p-3 border border-border/50">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarClock className="h-4 w-4" />
                        Last login
                      </div>
                      <p className="mt-1 font-semibold">{formatDate(profile.lastLoginAt)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-0 bg-card/70 backdrop-blur-xl shadow-xl shadow-foreground/5">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Account details</CardTitle>
                    <CardDescription>Your personal info stays private and secure.</CardDescription>
                  </div>
                  {!isEditingProfile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStartEditProfile}
                      className="flex items-center gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2">
                      <p className="text-sm text-muted-foreground">First name</p>
                      <Input 
                        value={firstNameInput} 
                        onChange={(e) => setFirstNameInput(e.target.value)} 
                        disabled={!isEditingProfile}
                      />
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2">
                      <p className="text-sm text-muted-foreground">Last name</p>
                      <Input 
                        value={lastNameInput} 
                        onChange={(e) => setLastNameInput(e.target.value)} 
                        disabled={!isEditingProfile}
                      />
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                      <p className="text-sm text-muted-foreground">Phone number</p>
                      <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {profile.phoneNumber}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                      <p className="text-sm text-muted-foreground">Role</p>
                      <p className="mt-1 text-lg font-semibold capitalize">{profile.role}</p>
                    </div>
                    <div className={`rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2 sm:col-span-2 ${!isEditingProfile ? "opacity-60" : ""}`}>
                      <p className="text-sm text-muted-foreground mb-2">Choose avatar</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(avatarMap).map((key) => (
                          <button
                            key={key}
                            onClick={() => setAvatarInput(key)}
                            disabled={!isEditingProfile}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition ${
                              avatarInput === key ? "border-primary bg-primary/10" : "border-border/60 bg-muted/30"
                            } ${!isEditingProfile ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                            type="button"
                          >
                            <Avatar avatarId={key} size="lg" />
                            <span className="text-sm font-medium">Avatar {key.replace("avatar", "")}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {isEditingProfile && (
                    <div className="flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={handleCancelEditProfile}
                        disabled={isSavingProfileInfo}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                      <Button onClick={handleSaveProfileInfo} disabled={isSavingProfileInfo}>
                        {isSavingProfileInfo ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save profile"
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 bg-card/70 backdrop-blur-xl shadow-xl shadow-foreground/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location
                  </CardTitle>
                  <CardDescription>Set your location to get better local matches.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile.address && (
                    <div className="p-4 rounded-2xl border border-border/60 bg-muted/40">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Current address</p>
                          <p className="mt-1 font-semibold leading-relaxed">{profile.address}</p>
                          {profile.latitude && profile.longitude && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Coordinates: {profile.latitude.toFixed(6)}, {profile.longitude.toFixed(6)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                  )}

                  {!showManualInput ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={handleGetCurrentLocation}
                        disabled={isGettingLocation || isSaving}
                        className="flex-1 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white border-0 shadow-lg shadow-violet-500/25"
                      >
                        {isGettingLocation ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Getting location...
                          </>
                        ) : (
                          <>
                            <Navigation className="mr-2 h-4 w-4" />
                            Use current location
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowManualInput(true);
                          setError(null);
                          setSuccess(null);
                        }}
                        disabled={isGettingLocation || isSaving}
                        className="flex-1"
                        variant="outline"
                      >
                        Enter manually
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Enter full address
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g., 123 Main St, City, State, Country"
                          value={manualAddress}
                          onChange={(e) => setManualAddress(e.target.value)}
                          disabled={isSaving}
                          className="w-full"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          onClick={handleManualAddressSubmit}
                          disabled={isSaving || !manualAddress.trim()}
                          className="flex-1"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <MapPin className="mr-2 h-4 w-4" />
                              Save address
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowManualInput(false);
                            setError(null);
                            setSuccess(null);
                          }}
                          disabled={isSaving}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 bg-card/70 backdrop-blur-xl shadow-xl shadow-foreground/5 lg:col-span-2">
                <CardHeader>
                  <CardTitle>Preferred categories</CardTitle>
                  <CardDescription>Select what you want to see more of.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isSavingCategories && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving preferences...
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {rootCategories.map((cat) => {
                      const selected = preferredCategories.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleToggleCategory(cat.id)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition border ${
                            selected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/40 border-border/60 hover:border-primary/60"
                          }`}
                        >
                          {cat.displayName || cat.name}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card
                ref={historySectionRef}
                className="border-0 bg-card/70 backdrop-blur-xl shadow-xl shadow-foreground/5 lg:col-span-2"
              >
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Search history
                    </CardTitle>
                    <CardDescription>Rerun or review your recent searches.</CardDescription>
                  </div>
                  {searchHistory.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => handleRerunSearch(searchHistory[0].query)}
                    >
                      Repeat last search <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {isHistoryLoading && (
                    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                      Loading your searches...
                    </div>
                  )}
                  {!isHistoryLoading && searchHistory.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-border/60 bg-card/60 p-4 text-sm text-muted-foreground text-center">
                      Your searches will appear here as you explore.
                    </div>
                  )}
                  {searchHistory.map((item) => (
                    <div
                      key={`${item.userId}-${item.createdAt}-${item.query}`}
                      className="group glass rounded-2xl p-4 sm:p-5 border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                          <SearchIcon />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold leading-tight truncate">{item.query}</p>
                          <p className="text-sm text-muted-foreground mt-1">{formatRelativeTime(item.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {typeof item.resultCount === "number" && (
                          <span className="text-sm text-muted-foreground">{item.resultCount} results</span>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleRerunSearch(item.query)}>
                          Rerun
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

