"use client";

import { Loader2, AlertCircle, Search, MapPin } from "lucide-react";
import { BusinessCard } from "./business-card";
import { Button } from "./ui/button";
import { LocationIndicator } from "./location-indicator";
import { cn } from "@/lib/utils";

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
  distance?: number;
  distanceKm?: number;
  businessHours?: any;
  amenities?: string[];
  status?: string;
  isVerified?: boolean;
}

interface PaginationInfo {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  hasMore: boolean;
}

interface LocationInfo {
  used: string;
  source: "explicit" | "profile" | "geolocation" | "ip";
  coordinates?: {
    lat: number;
    lng: number;
  };
  city?: string;
  state?: string;
}

interface SearchResultsProps {
  results: Business[];
  loading: boolean;
  error: string | null;
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  locationInfo?: LocationInfo;
  userId?: string;
  userLocation?: {
    address?: string;
    latitude?: number;
    longitude?: number;
    locationLastUpdated?: number | null;
  } | null;
  onBusinessClick?: (business: Business) => void;
  className?: string;
}

/**
 * Skeleton loader for business cards
 */
function BusinessCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 animate-pulse shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="h-6 bg-muted rounded-md w-3/4 mb-2" />
          <div className="h-4 bg-muted rounded-md w-1/2" />
        </div>
        <div className="w-12 h-12 bg-muted rounded-lg" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded-md w-full" />
        <div className="h-4 bg-muted rounded-md w-5/6" />
        <div className="flex items-center gap-4 mt-3">
          <div className="h-4 bg-muted rounded-md w-20" />
          <div className="h-4 bg-muted rounded-md w-16" />
        </div>
        <div className="h-4 bg-muted rounded-md w-2/3 mt-3" />
        <div className="h-4 bg-muted rounded-md w-1/2" />
      </div>
      <div className="flex items-center gap-2 pt-3 mt-3 border-t pt-3">
        <div className="h-9 bg-muted rounded-md flex-1" />
        <div className="h-9 bg-muted rounded-md flex-1" />
        <div className="h-9 bg-muted rounded-md flex-1" />
      </div>
    </div>
  );
}

export function SearchResults({
  results,
  loading,
  error,
  pagination,
  onPageChange,
  locationInfo,
  userId,
  userLocation,
  onBusinessClick,
  className,
}: SearchResultsProps) {
  // Loading state
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {locationInfo && (
          <LocationIndicator
            searchLocation={{
              address: locationInfo.used,
              source: locationInfo.source,
              city: locationInfo.city,
              state: locationInfo.state,
            }}
            showUpdateButton={false}
          />
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <BusinessCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        {locationInfo && (
          <LocationIndicator
            searchLocation={{
              address: locationInfo.used,
              source: locationInfo.source,
              city: locationInfo.city,
              state: locationInfo.state,
            }}
            showUpdateButton={false}
          />
        )}
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Search Error
          </h3>
          <p className="text-sm text-destructive/80">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (results.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        {locationInfo && (
          <LocationIndicator
            searchLocation={{
              address: locationInfo.used,
              source: locationInfo.source,
              city: locationInfo.city,
              state: locationInfo.state,
            }}
            showUpdateButton={false}
          />
        )}
        <div className="rounded-lg border bg-card p-12 text-center">
          <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No results found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            We couldn't find any businesses matching your search.
          </p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Try adjusting your search:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your spelling</li>
              <li>Use different keywords</li>
              <li>Try a broader location</li>
              <li>Remove some filters</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Results display
  return (
    <div className={cn("space-y-6", className)}>
      {/* Location Indicator */}
      {locationInfo && (
        <LocationIndicator
          userId={userId}
          location={userLocation}
          searchLocation={{
            address: locationInfo.used,
            source: locationInfo.source,
            city: locationInfo.city,
            state: locationInfo.state,
          }}
          onLocationUpdate={() => {
            // Refresh location if needed
          }}
          showUpdateButton={!!userId}
        />
      )}

      {/* Results Count */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Found {pagination.total} result{pagination.total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Business Cards Grid */}
      {/* Deduplicate by businessId to avoid showing same business multiple times */}
      {(() => {
        const seenIds = new Set<string>();
        const uniqueResults = results.filter(business => {
          if (seenIds.has(business.businessId)) {
            return false;
          }
          seenIds.add(business.businessId);
          return true;
        });
        
        return (
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
            {uniqueResults.map((business) => (
              <div key={business.businessId} className="min-w-0 w-full">
                <BusinessCard
                  business={business}
                  onClick={() => {
                    if (onBusinessClick) {
                      onBusinessClick(business);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        );
      })()}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 border-t border-border/50">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              aria-label="Previous page"
              className="hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Previous
            </Button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
              let pageNum: number;
              
              if (pagination.totalPages <= 7) {
                // Show all pages if 7 or fewer
                pageNum = i + 1;
              } else if (pagination.page <= 4) {
                // Show first 5 pages, ellipsis, last page
                if (i < 5) {
                  pageNum = i + 1;
                } else if (i === 5) {
                  return <span key="ellipsis1" className="px-2">...</span>;
                } else {
                  pageNum = pagination.totalPages;
                }
              } else if (pagination.page >= pagination.totalPages - 3) {
                // Show first page, ellipsis, last 5 pages
                if (i === 0) {
                  pageNum = 1;
                } else if (i === 1) {
                  return <span key="ellipsis2" className="px-2">...</span>;
                } else {
                  pageNum = pagination.totalPages - (6 - i);
                }
              } else {
                // Show first page, ellipsis, current-1, current, current+1, ellipsis, last page
                if (i === 0) {
                  pageNum = 1;
                } else if (i === 1) {
                  return <span key="ellipsis3" className="px-2">...</span>;
                } else if (i < 5) {
                  pageNum = pagination.page - 2 + (i - 1);
                } else if (i === 5) {
                  return <span key="ellipsis4" className="px-2">...</span>;
                } else {
                  pageNum = pagination.totalPages;
                }
              }

              return (
                <Button
                  key={pageNum}
                  variant={pagination.page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="min-w-[40px]"
                  aria-label={`Page ${pageNum}`}
                  aria-current={pagination.page === pageNum ? "page" : undefined}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              aria-label="Next page"
              className="hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Pagination Info */}
      {pagination.totalPages > 1 && (
        <div className="text-center text-sm text-muted-foreground">
          Page {pagination.page} of {pagination.totalPages}
        </div>
      )}
    </div>
  );
}

