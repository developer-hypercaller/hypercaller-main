"use client";

import { useState } from "react";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

interface LocationSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSet: () => void;
}

export function LocationSetupModal({ isOpen, onClose, onLocationSet }: LocationSetupModalProps) {
  const [mode, setMode] = useState<"select" | "current" | "manual">("select");
  const [manualAddress, setManualAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);

  const handleClose = () => {
    if (!isLoading) {
      setMode("select");
      setManualAddress("");
      setError(null);
      setGeolocationError(null);
      onClose();
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsLoading(true);
    setError(null);
    setGeolocationError(null);

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setGeolocationError("Geolocation is not supported by your browser.");
      setIsLoading(false);
      return;
    }

    try {
      // Request current location with longer timeout and better error handling
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("TIMEOUT"));
        }, 10000); // 10 seconds timeout

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            resolve(pos);
          },
          (err) => {
            clearTimeout(timeoutId);
            reject(err);
          },
          {
            // Prefer faster, cached fixes to avoid slow high-accuracy locks
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 120000, // Accept cached location up to 2 minutes old
          }
        );
      });

      const { latitude, longitude } = position.coords;

      // Call API to update profile
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        setError("Please log in to set your location.");
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
        setError(data.error || "Failed to set location. Please try again.");
        setIsLoading(false);
        return;
      }

      // Success - close modal and notify parent
      handleClose();
      onLocationSet();
    } catch (error: any) {
      console.error("Geolocation error:", error);

      // Handle different error types
      if (error.code === 1) {
        // PERMISSION_DENIED
        setGeolocationError(
          "Location permission denied. Please enable location access in your browser settings or enter your location manually."
        );
      } else if (error.code === 2) {
        // POSITION_UNAVAILABLE
        setGeolocationError("Unable to determine your location. Please try again or enter your location manually.");
      } else if (error.code === 3) {
        // TIMEOUT
        setGeolocationError("Location request timed out. Please try again or enter your location manually.");
        setMode("manual");
      } else if (error.message) {
        setGeolocationError(error.message);
      } else {
        setGeolocationError("Failed to get your location. Please try again or enter your location manually.");
      }

      setIsLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate address
    const address = manualAddress.trim();
    if (!address) {
      setError("Please enter an address.");
      return;
    }

    setIsLoading(true);

    try {
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        setError("Please log in to set your location.");
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
          manualAddress: address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to set location. Please check the address and try again.");
        setIsLoading(false);
        return;
      }

      // Success - close modal and notify parent
      handleClose();
      onLocationSet();
    } catch (error: any) {
      console.error("Manual location error:", error);
      setError("Failed to set location. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" aria-labelledby="dialog-title" aria-describedby="dialog-description">
        <DialogClose onClose={handleClose} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Set Your Location
          </DialogTitle>
          <DialogDescription>
            Set your location to enable "near me" searches and location-based recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === "select" && (
            <>
              <Button
                onClick={() => setMode("current")}
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                <MapPin className="mr-2 h-4 w-4" />
                Use Current Location
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                onClick={() => setMode("manual")}
                variant="outline"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                Enter Location Manually
              </Button>
            </>
          )}

          {mode === "current" && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Click the button below to use your current location. You'll be asked to allow location access.
              </div>

              <Button
                onClick={handleUseCurrentLocation}
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Getting your location...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Use Current Location
                  </>
                )}
              </Button>

              {geolocationError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium text-destructive">Location Access Failed</p>
                      <p className="text-sm text-destructive/80">{geolocationError}</p>
                      <Button
                        onClick={() => setMode("manual")}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        Enter Location Manually Instead
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={() => {
                  setMode("select");
                  setGeolocationError(null);
                }}
                variant="ghost"
                className="w-full"
                disabled={isLoading}
              >
                Back
              </Button>
            </div>
          )}

          {mode === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="address" className="text-sm font-medium">
                  Enter your address
                </label>
                <Input
                  id="address"
                  type="text"
                  placeholder="e.g., 123 Main St, Mumbai, Maharashtra"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  disabled={isLoading}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a complete address including city and state for best results.
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  size="lg"
                  disabled={isLoading || !manualAddress.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting location...
                    </>
                  ) : (
                    "Set Location"
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setMode("select");
                    setManualAddress("");
                    setError(null);
                  }}
                  variant="outline"
                  disabled={isLoading}
                >
                  Back
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

