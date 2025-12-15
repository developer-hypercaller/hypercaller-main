"use client";

import { MapPin, Star, Phone, Globe, Clock, DollarSign, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
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

export function BusinessCard({ business, onClick, showDistance = true, className }: BusinessCardProps) {
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

  return (
    <Card
      className={cn(
        "group hover:shadow-lg hover:border-primary/20 transition-all duration-200 cursor-pointer",
        "hover:-translate-y-0.5",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg font-semibold truncate">
                {business.name}
              </CardTitle>
              {business.isVerified && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                  Verified
                </span>
              )}
            </div>
            {business.category && (
              <p className="text-sm text-muted-foreground truncate">
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

      <CardContent className="space-y-3">
        {/* Description */}
        {business.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {business.description}
          </p>
        )}

        {/* Rating and Price */}
        <div className="flex items-center gap-4 text-sm">
          {business.rating !== undefined && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{ratingText}</span>
              </div>
              <div className="text-yellow-400 text-sm" title={`${ratingText} out of 5 stars`}>
                {starDisplay.display}
              </div>
              {business.reviewCount !== undefined && business.reviewCount > 0 && (
                <span className="text-muted-foreground">
                  ({business.reviewCount} review{business.reviewCount !== 1 ? "s" : ""})
                </span>
              )}
            </div>
          )}
          {priceRangeDisplay && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground" title={priceRangeText}>
                {priceRangeDisplay}
              </span>
            </div>
          )}
        </div>

        {/* Location */}
        {business.location && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {business.location.address && (
                <p className="truncate" title={business.location.address}>
                  {business.location.address}
                </p>
              )}
              {(business.location.city || business.location.state) && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {[business.location.city, business.location.state].filter(Boolean).join(", ")}
                </p>
              )}
              {distanceText && (
                <p className="text-xs font-medium text-primary mt-0.5">
                  {distanceText}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Business Hours */}
        {hoursText && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{hoursText}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-3 border-t border-border/50">
          {business.contact?.phone && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <a href={`tel:${business.contact.phone}`} className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>Call</span>
              </a>
            </Button>
          )}
          {(business.location?.latitude || business.location?.address) && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Navigation className="h-4 w-4" />
                <span>Directions</span>
              </a>
            </Button>
          )}
          {business.contact?.website && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={business.contact.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                <span>Website</span>
              </a>
            </Button>
          )}
        </div>

        {/* Amenities (if any) */}
        {business.amenities && business.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {business.amenities.slice(0, 3).map((amenity, index) => (
              <span
                key={index}
                className="text-xs bg-muted px-2 py-0.5 rounded"
              >
                {amenity}
              </span>
            ))}
            {business.amenities.length > 3 && (
              <span className="text-xs text-muted-foreground px-2 py-0.5">
                +{business.amenities.length - 3} more
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

