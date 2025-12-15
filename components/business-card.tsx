"use client";

import { useState, useEffect } from "react";
import { MapPin, Star, Phone, Globe, Clock, DollarSign, Navigation, Heart, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useUserSession } from "@/hooks/use-user-session";
import { useToast } from "@/hooks/use-toast";
// Note: Using img tag instead of Next.js Image for external images
// import Image from "next/image";

interface Business {
  businessId: string;
  name: string;
  description?: string;
  category?: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  };
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  rating?: number;
  reviewCount?: number;
  priceRange?: "$" | "$$" | "$$$" | "$$$$";
  images?: string[];
  logo?: string;
  distance?: number; // Distance in meters
  distanceKm?: number; // Distance in kilometers
  businessHours?: any;
  amenities?: string[];
  status?: string;
  isVerified?: boolean;
}

interface BusinessCardProps {
  business: Business;
  onClick?: () => void;
  showDistance?: boolean;
  className?: string;
  showSaveButton?: boolean;
  isSaved?: boolean;
  onSaveChange?: (saved: boolean) => void;
}

/**
 * Format distance for display
 */
function formatDistance(distance?: number, distanceKm?: number): string {
  if (distanceKm !== undefined) {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m away`;
    }
    return `${distanceKm.toFixed(1)}km away`;
  }
  if (distance !== undefined) {
    if (distance < 1000) {
      return `${Math.round(distance)}m away`;
    }
    return `${(distance / 1000).toFixed(1)}km away`;
  }
  return "";
}

/**
 * Format rating for display
 */
function formatRating(rating?: number): string {
  if (!rating) return "No rating";
  return rating.toFixed(1);
}

/**
 * Get star display (filled and empty stars)
 */
function getStarDisplay(rating?: number): { filled: number; empty: number; display: string } {
  if (!rating) {
    return { filled: 0, empty: 5, display: "☆☆☆☆☆" };
  }
  
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let display = "★".repeat(fullStars);
  if (hasHalfStar) {
    display += "½";
  }
  display += "☆".repeat(emptyStars);
  
  return { filled: fullStars, empty: emptyStars, display };
}

/**
 * Format distance for display (in km)
 */
function formatDistanceKm(distance?: number, distanceKm?: number): string {
  if (distanceKm !== undefined) {
    return `${distanceKm.toFixed(1)} km away`;
  }
  if (distance !== undefined) {
    const km = distance / 1000;
    return `${km.toFixed(1)} km away`;
  }
  return "";
}

/**
 * Get price range text
 */
function getPriceRangeText(priceRange?: string): string {
  if (!priceRange) return "";
  
  const priceMap: Record<string, string> = {
    "$": "Budget",
    "$$": "Moderate",
    "$$$": "Expensive",
    "$$$$": "Very Expensive",
  };
  
  return priceMap[priceRange] || priceRange;
}

/**
 * Get Google Maps directions URL
 */
function getDirectionsUrl(latitude?: number, longitude?: number, address?: string): string {
  if (latitude && longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }
  return "#";
}

/**
 * Format website URL to ensure it has protocol
 */
function formatWebsiteUrl(url?: string): string {
  if (!url) return "#";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
}

/**
 * Get price range display
 */
function getPriceRangeDisplay(priceRange?: string): string {
  if (!priceRange) return "";
  return priceRange;
}

/**
 * Format business hours for display (simplified)
 */
function formatBusinessHours(hours?: any): string {
  if (!hours) return "";
  
  // Get today's day
  const today = new Date().toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
  const todayHours = hours[today];
  
  if (!todayHours || todayHours.isClosed) {
    return "Closed today";
  }
  
  if (todayHours.open && todayHours.close) {
    return `Open ${todayHours.open} - ${todayHours.close}`;
  }
  
  return "Hours vary";
}

export function BusinessCard({
  business,
  onClick,
  showDistance = true,
  className,
  showSaveButton = true,
  isSaved: initialIsSaved,
  onSaveChange,
}: BusinessCardProps) {
  const { user } = useUserSession();
  const { success, error: showErrorToast } = useToast();
  const [isSaved, setIsSaved] = useState(initialIsSaved || false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check if business is saved on mount
  useEffect(() => {
    if (!user?.userId || !showSaveButton) {
      setIsChecking(false);
      return;
    }

    const checkSaved = async () => {
      try {
        const sessionId = localStorage.getItem("sessionId");
        if (!sessionId) {
          setIsChecking(false);
          return;
        }

        const response = await fetch(`/api/profile/saved-businesses?businessId=${business.businessId}`, {
          headers: { "x-session-id": sessionId },
        });

        if (response.ok) {
          const data = await response.json();
          setIsSaved(data.isSaved || false);
        }
      } catch (err) {
        console.error("Error checking saved status:", err);
      } finally {
        setIsChecking(false);
      }
    };

    checkSaved();
  }, [user?.userId, business.businessId, showSaveButton]);

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    if (!user?.userId) {
      showErrorToast("Please sign in to save businesses");
      return;
    }

    // Optimistic update - immediately update UI
    const previousSavedState = isSaved;
    setIsSaved(!isSaved);
    onSaveChange?.(!isSaved);
    setIsSaving(true);

    try {
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        // Revert optimistic update
        setIsSaved(previousSavedState);
        onSaveChange?.(previousSavedState);
        showErrorToast("Session expired. Please sign in again.");
        return;
      }

      if (previousSavedState) {
        // Remove
        const response = await fetch(`/api/profile/saved-businesses?businessId=${business.businessId}`, {
          method: "DELETE",
          headers: { "x-session-id": sessionId },
        });

        if (response.ok) {
          const responseData = await response.json().catch(() => ({}));
          if (responseData.success !== false) {
            success("Business removed from saved list");
          } else {
            throw new Error(responseData.error || "Failed to remove business");
          }
        } else {
          // Revert optimistic update on error
          setIsSaved(previousSavedState);
          onSaveChange?.(previousSavedState);
          let errorMessage = "Failed to remove business";
          try {
            const data = await response.json();
            errorMessage = data.error || errorMessage;
          } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
          showErrorToast(errorMessage);
        }
      } else {
        // Save
        // Sanitize business object - only send essential fields
        const sanitizedBusiness = {
          businessId: business.businessId,
          name: business.name,
          description: business.description,
          category: business.category,
          location: business.location,
          contact: business.contact,
          rating: business.rating,
          reviewCount: business.reviewCount,
          priceRange: business.priceRange,
          images: business.images,
          logo: business.logo,
          distance: business.distance,
          distanceKm: business.distanceKm,
          businessHours: business.businessHours,
          amenities: business.amenities,
          status: business.status,
          isVerified: business.isVerified,
        };
        
        console.log("Saving business:", { businessId: business.businessId, businessName: business.name });
        const response = await fetch("/api/profile/saved-businesses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": sessionId,
          },
          body: JSON.stringify({
            businessId: business.businessId,
            business: sanitizedBusiness, // Store sanitized business data
          }),
        });

        console.log("Save response status:", response.status, response.ok);

        if (response.ok) {
          const responseData = await response.json().catch((err) => {
            console.error("Error parsing save response:", err);
            return { success: false, error: "Invalid response from server" };
          });
          console.log("Save response data:", responseData);
          
          if (responseData.success === true) {
            success("Business saved!");
          } else {
            // If success is false or missing, treat as error
            setIsSaved(previousSavedState);
            onSaveChange?.(previousSavedState);
            showErrorToast(responseData.error || "Failed to save business");
          }
        } else {
          let errorMessage = "Failed to save business";
          let shouldRevert = true;
          
          try {
            const text = await response.text();
            console.error("Save error response (raw):", text);
            let data;
            try {
              data = JSON.parse(text);
            } catch (e) {
              console.error("Failed to parse error as JSON:", e);
              data = { error: text || errorMessage };
            }
            console.error("Save error response (parsed):", JSON.stringify(data, null, 2));
            // Show both error and details in the message
            const errorMsg = data.error || "Failed to save business";
            const detailsMsg = data.details ? `: ${data.details}` : "";
            errorMessage = `${errorMsg}${detailsMsg}`;
            console.error("Full error details:", {
              status: response.status,
              statusText: response.statusText,
              error: data.error,
              details: data.details,
              fullResponse: JSON.stringify(data, null, 2)
            });
            
            if (response.status === 409) {
              // Already saved - keep the optimistic update
              shouldRevert = false;
              success("Business saved!");
            }
          } catch (parseErr) {
            console.error("Error parsing error response:", parseErr);
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
          
          if (shouldRevert) {
            // Revert optimistic update on error
            setIsSaved(previousSavedState);
            onSaveChange?.(previousSavedState);
            showErrorToast(errorMessage);
          }
        }
      }
    } catch (err: any) {
      console.error("Error toggling save:", err);
      // Revert optimistic update on error
      setIsSaved(previousSavedState);
      onSaveChange?.(previousSavedState);
      const errorMessage = err.message || "Failed to update saved status";
      showErrorToast(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const distanceText = showDistance ? formatDistanceKm(business.distance, business.distanceKm) : "";
  const ratingText = formatRating(business.rating);
  const starDisplay = getStarDisplay(business.rating);
  const priceRangeDisplay = getPriceRangeDisplay(business.priceRange);
  const priceRangeText = getPriceRangeText(business.priceRange);
  const hoursText = formatBusinessHours(business.businessHours);
  const directionsUrl = getDirectionsUrl(
    business.location?.latitude,
    business.location?.longitude,
    business.location?.address
  );
  const websiteUrl = formatWebsiteUrl(business.contact?.website);

  return (
    <Card
      className={cn(
        "group hover:shadow-lg hover:border-primary/20 transition-all duration-200 cursor-pointer",
        "hover:-translate-y-0.5 overflow-hidden",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3 overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-start gap-2 mb-1 flex-wrap">
              <CardTitle className="text-lg font-semibold break-words line-clamp-2 flex-1 min-w-0">
                {business.name}
              </CardTitle>
              {business.isVerified && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded shrink-0">
                  Verified
                </span>
              )}
            </div>
            {business.category && (
              <p className="text-sm text-muted-foreground truncate break-words">
                {business.category}
              </p>
            )}
          </div>
          {business.logo && (
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center ring-2 ring-border group-hover:ring-primary/20 transition-all">
              <img
                src={business.logo}
                alt={`${business.name} logo`}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 overflow-hidden">
        {/* Description */}
        {business.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 break-words">
            {business.description}
          </p>
        )}

        {/* Rating and Price */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {business.rating !== undefined && (
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div className="flex items-center gap-1 shrink-0">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />
                <span className="font-medium whitespace-nowrap">{ratingText}</span>
              </div>
              <div className="text-yellow-400 text-sm shrink-0" title={`${ratingText} out of 5 stars`}>
                {starDisplay.display}
              </div>
              {business.reviewCount !== undefined && business.reviewCount > 0 && (
                <span className="text-muted-foreground whitespace-nowrap shrink-0">
                  ({business.reviewCount} review{business.reviewCount !== 1 ? "s" : ""})
                </span>
              )}
            </div>
          )}
          {priceRangeDisplay && (
            <div className="flex items-center gap-1 shrink-0">
              <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground whitespace-nowrap" title={priceRangeText}>
                {priceRangeDisplay}
              </span>
            </div>
          )}
        </div>

        {/* Location */}
        {business.location && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground min-w-0">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 overflow-hidden">
              {business.location.address && (
                <p className="break-words line-clamp-2" title={business.location.address}>
                  {business.location.address}
                </p>
              )}
              {(business.location.city || business.location.state) && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate break-words">
                  {[business.location.city, business.location.state].filter(Boolean).join(", ")}
                </p>
              )}
              {distanceText && (
                <p className="text-xs font-medium text-primary mt-0.5 whitespace-nowrap">
                  {distanceText}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Business Hours */}
        {hoursText && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            <Clock className="h-4 w-4 shrink-0" />
            <span className="truncate break-words">{hoursText}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-3 border-t border-border/50">
          {showSaveButton && user?.userId && (
            <Button
              variant={isSaved ? "default" : "outline"}
              size="sm"
              className={cn(
                "flex-1 transition-all duration-200 min-w-0",
                isSaved
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                  : "hover:bg-primary hover:text-primary-foreground border-2"
              )}
              onClick={handleSaveToggle}
              disabled={isSaving || isChecking}
            >
              {isSaving || isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span className="truncate ml-2">{isSaved ? "Saving..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  <Heart className={cn(
                    "h-4 w-4 shrink-0 transition-all duration-200",
                    isSaved && "fill-current scale-110"
                  )} />
                  <span className="truncate font-medium">{isSaved ? "Saved" : "Save"}</span>
                </>
              )}
            </Button>
          )}
          {business.contact?.phone && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors min-w-0"
              asChild
            >
              <a 
                href={`tel:${business.contact.phone}`} 
                className="flex items-center gap-2 justify-center min-w-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-4 w-4 shrink-0" />
                <span className="truncate">Call</span>
              </a>
            </Button>
          )}
          {(business.location?.latitude || business.location?.address) && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors min-w-0"
              asChild
            >
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 justify-center min-w-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Navigation className="h-4 w-4 shrink-0" />
                <span className="truncate">Directions</span>
              </a>
            </Button>
          )}
          {business.contact?.website && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors min-w-0"
              asChild
            >
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 justify-center min-w-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Globe className="h-4 w-4 shrink-0" />
                <span className="truncate">Website</span>
              </a>
            </Button>
          )}
        </div>

        {/* Amenities (if any) */}
        {business.amenities && business.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 overflow-hidden">
            {business.amenities.slice(0, 3).map((amenity, index) => (
              <span
                key={index}
                className="text-xs bg-muted px-2 py-0.5 rounded break-words max-w-full truncate"
                title={amenity}
              >
                {amenity}
              </span>
            ))}
            {business.amenities.length > 3 && (
              <span className="text-xs text-muted-foreground px-2 py-0.5 whitespace-nowrap">
                +{business.amenities.length - 3} more
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

