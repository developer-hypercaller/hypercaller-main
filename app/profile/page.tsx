"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { useUserSession } from "@/hooks/use-user-session";
import { ArrowLeft, MapPin, Navigation, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

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
}

export default function ProfilePage() {
  const router = useRouter();
  const { user: sessionUser, isLoading: isSessionLoading } = useUserSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Location state
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAddress, setManualAddress] = useState("");

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
            errorMessage = "Location request timed out. Please try again.";
            break;
        }
        setError(errorMessage);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
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
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <h1 className="text-xl font-semibold">Profile</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-6">
              <Avatar avatarId={profile.avatar} size="xl" />
              <div>
                <CardTitle className="text-2xl">
                  {profile.firstName} {profile.lastName}
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  @{profile.username}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  First Name
                </label>
                <p className="text-base mt-1">{profile.firstName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Last Name
                </label>
                <p className="text-base mt-1">{profile.lastName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Phone Number
                </label>
                <p className="text-base mt-1">{profile.phoneNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Role
                </label>
                <p className="text-base mt-1 capitalize">{profile.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location
            </CardTitle>
            <CardDescription>
              Set your location to help us provide better services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Location Display */}
            {profile.address && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Current Address</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {profile.address}
                    </p>
                    {profile.latitude && profile.longitude && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Coordinates: {profile.latitude.toFixed(6)}, {profile.longitude.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Success/Error Messages */}
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

            {/* Location Options */}
            {!showManualInput ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleGetCurrentLocation}
                  disabled={isGettingLocation || isSaving}
                  className="flex-1"
                  variant="default"
                >
                  {isGettingLocation ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <Navigation className="mr-2 h-4 w-4" />
                      Choose Current Location
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
                  Enter Manually
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Enter Full Address
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
                <div className="flex gap-3">
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
                        Save Address
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
      </div>
    </div>
  );
}

