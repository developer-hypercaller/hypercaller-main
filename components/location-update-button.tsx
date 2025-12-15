"use client";

import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Toast } from "./ui/toast";
import { LocationSetupModal } from "./location-setup-modal";
import { cn } from "@/lib/utils";

interface LocationUpdateButtonProps {
  userId: string;
  onLocationUpdated?: () => void;
  showStaleIndicator?: boolean;
  locationLastUpdated?: number | null;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
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
 * Format timestamp to human-readable date
 */
function formatLastUpdated(timestamp: number | null | undefined): string {
  if (!timestamp) {
    return "Never";
  }

  const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  } else {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }
}

export function LocationUpdateButton({
  userId,
  onLocationUpdated,
  showStaleIndicator = true,
  locationLastUpdated,
  className,
  variant = "outline",
  size = "default",
}: LocationUpdateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const stale = showStaleIndicator && isLocationStale(locationLastUpdated);
  const tooltipText = locationLastUpdated
    ? `Last updated: ${formatLastUpdated(locationLastUpdated)}`
    : "Location not set";

  const handleQuickUpdate = async () => {
    setIsLoading(true);

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setToastMessage("Geolocation is not supported by your browser.");
      setShowToast(true);
      setIsLoading(false);
      setShowManualModal(true);
      return;
    }

    try {
      // Request current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          // Use a quick cached fix first; avoid long GPS locks on desktop
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 120000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Call API to update profile
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        setToastMessage("Please log in to update your location.");
        setShowToast(true);
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({
          useCurrentLocation: true,
          latitude,
          longitude,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setToastMessage(data.error || "Failed to update location. Please try again.");
        setShowToast(true);
        setIsLoading(false);
        // Optionally open manual entry modal
        if (data.error?.includes("geocoding") || data.error?.includes("address")) {
          setShowManualModal(true);
        }
        return;
      }

      // Success
      setToastMessage("Location updated successfully!");
      setShowToast(true);
      setIsLoading(false);
      if (onLocationUpdated) {
        onLocationUpdated();
      }
    } catch (err: any) {
      console.error("Location update error:", err);

      let errorMessage = "Failed to update location. Please try again.";

      if (err.code === 1) {
        // PERMISSION_DENIED
        errorMessage = "Location permission denied. Please enable location access or use manual entry.";
        setShowManualModal(true);
      } else if (err.code === 2) {
        // POSITION_UNAVAILABLE
        errorMessage = "Unable to determine your location. Please try again or use manual entry.";
      } else if (err.code === 3) {
        // TIMEOUT
        errorMessage = "Location request timed out. Please try again or use manual entry.";
        setShowManualModal(true);
      }

      setToastMessage(errorMessage);
      setShowToast(true);
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="relative inline-block group">
        <Button
          onClick={handleQuickUpdate}
          variant={variant}
          size={size}
          className={cn(
            "relative",
            stale && "border-amber-500 dark:border-amber-600",
            className
          )}
          disabled={isLoading}
          aria-label="Update location"
          title={tooltipText}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Update Location
            </>
          )}
          {stale && (
            <span
              className="absolute -top-1 -right-1 h-3 w-3 bg-amber-500 dark:bg-amber-400 rounded-full border-2 border-background"
              aria-label={`Location is stale (older than 30 days). Last updated ${formatLastUpdated(locationLastUpdated)}`}
              title={`Location is stale (older than 30 days). Last updated ${formatLastUpdated(locationLastUpdated)}`}
            />
          )}
        </Button>

        {/* Tooltip */}
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10"
          role="tooltip"
        >
          {tooltipText}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
        </div>
      </div>

      {/* Manual entry modal */}
      {showManualModal && (
        <LocationSetupModal
          isOpen={showManualModal}
          onClose={() => setShowManualModal(false)}
          onLocationSet={() => {
            setShowManualModal(false);
            if (onLocationUpdated) {
              onLocationUpdated();
            }
          }}
        />
      )}

      {/* Toast notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  );
}

