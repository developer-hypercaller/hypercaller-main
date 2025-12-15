"use client";

import { useState, useEffect } from "react";
import { MapPin, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { LocationUpdateButton } from "./location-update-button";
import { cn } from "@/lib/utils";

interface LocationIndicatorProps {
  userId?: string;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
    locationLastUpdated?: number | null;
  } | null;
  searchLocation?: {
    address: string;
    source: "explicit" | "profile" | "geolocation" | "ip";
    city?: string;
    state?: string;
  } | null;
  onLocationUpdate?: () => void;
  showUpdateButton?: boolean;
  className?: string;
}

/**
 * Check if location is stale (>30 days old)
 */
function isLocationStale(locationLastUpdated?: number | null): boolean {
  if (!locationLastUpdated) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const thirtyDaysInSeconds = 30 * 24 * 60 * 60; // 30 days
  const ageInSeconds = now - locationLastUpdated;

  return ageInSeconds > thirtyDaysInSeconds;
}

/**
 * Format days ago
 */
function formatDaysAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diffSeconds = now - timestamp;
  const diffDays = Math.floor(diffSeconds / (24 * 60 * 60));

  if (diffDays === 0) {
    return "today";
  } else if (diffDays === 1) {
    return "1 day ago";
  } else {
    return `${diffDays} days ago`;
  }
}

/**
 * Fetch user profile to get location
 */
async function fetchUserProfile(): Promise<any> {
  try {
    const sessionId = localStorage.getItem("sessionId");
    if (!sessionId) {
      return null;
    }

    const response = await fetch("/api/profile", {
      method: "GET",
      headers: {
        "x-session-id": sessionId,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user || null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export function LocationIndicator({
  userId,
  location: initialLocation,
  searchLocation,
  onLocationUpdate,
  showUpdateButton = true,
  className,
}: LocationIndicatorProps) {
  const [location, setLocation] = useState(initialLocation);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user profile if location not provided
  useEffect(() => {
    if (!location && userId) {
      setIsLoading(true);
      fetchUserProfile()
        .then((user) => {
          if (user) {
            setLocation({
              address: user.address,
              latitude: user.latitude,
              longitude: user.longitude,
              locationLastUpdated: user.locationLastUpdated,
            });
          }
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [userId, location]);

  // Update location after update
  const handleLocationUpdate = () => {
    if (userId) {
      setIsLoading(true);
      fetchUserProfile()
        .then((user) => {
          if (user) {
            setLocation({
              address: user.address,
              latitude: user.latitude,
              longitude: user.longitude,
              locationLastUpdated: user.locationLastUpdated,
            });
          }
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
    if (onLocationUpdate) {
      onLocationUpdate();
    }
  };

  // Determine which location to display
  const displayLocation = searchLocation || location;
  const isStale = location && isLocationStale(location.locationLastUpdated);
  const locationSource = searchLocation?.source || "profile";

  if (!displayLocation) {
    return null;
  }

  const address = displayLocation.address || "Unknown location";
  const isUsingSavedLocation = !searchLocation && location;
  const isSearchingIn = !!searchLocation;

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <MapPin
          className={cn(
            "h-4 w-4 shrink-0",
            isStale ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground"
          )}
        />
        <div className="flex-1 min-w-0">
          {isUsingSavedLocation ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Using your saved location:</span>
              <span className="font-medium truncate" title={address}>
                {address}
              </span>
              {isStale && location.locationLastUpdated && (
                <span
                  className="text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap"
                  title={`Location last updated ${formatDaysAgo(location.locationLastUpdated)}`}
                >
                  (Updated {formatDaysAgo(location.locationLastUpdated)})
                </span>
              )}
            </div>
          ) : isSearchingIn ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Searching in:</span>
              <span className="font-medium truncate" title={address}>
                {address}
              </span>
              {locationSource !== "profile" && (
                <span className="text-xs text-muted-foreground">
                  ({locationSource})
                </span>
              )}
            </div>
          ) : (
            <span className="font-medium truncate" title={address}>
              {address}
            </span>
          )}
        </div>
      </div>

      {showUpdateButton && isUsingSavedLocation && userId && (
        <LocationUpdateButton
          userId={userId}
          locationLastUpdated={location?.locationLastUpdated}
          showStaleIndicator={false} // We show stale indicator in the text
          onLocationUpdated={handleLocationUpdate}
          variant="ghost"
          size="sm"
        />
      )}
    </div>
  );
}

