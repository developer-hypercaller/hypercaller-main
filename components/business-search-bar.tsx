"use client";

import { useState, FormEvent, useEffect } from "react";
import { Search, Loader2, Filter, X, Sparkles, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchResults } from "./search-results";
import { LocationUpdateButton } from "./location-update-button";
import { LocationSetupModal } from "./location-setup-modal";
import { useUserSession } from "@/hooks/use-user-session";
import { useToast } from "@/hooks/use-toast";
import { detectNearMeKeywords } from "@/lib/search/location-resolver";
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

interface SearchResponse {
  success: boolean;
  query: string;
  location?: {
    used: string;
    source: "explicit" | "profile" | "geolocation" | "ip";
    coordinates?: {
      lat: number;
      lng: number;
    };
    city?: string;
    state?: string;
    radius?: number;
    isStale?: boolean;
  };
  results: Business[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  analysis?: {
    intent: string;
    category?: string;
    entities?: {
      categories?: string[];
      locations?: string[];
      businessNames?: string[];
      priceRange?: string[];
    };
  };
  performance: {
    responseTime: number;
    fromCache: boolean;
    steps?: any[];
    bedrockApiCalls?: number;
    cacheHits?: number;
    errors?: string[];
  };
  error?: string;
  errorCode?: string;
  action?: string;
  partialResults?: boolean;
}

interface BusinessSearchBarProps {
  className?: string;
  onBusinessClick?: (business: Business) => void;
  showResults?: boolean; // Whether to show results below the search bar
}

export function BusinessSearchBar({ 
  className, 
  onBusinessClick,
  showResults = true,
}: BusinessSearchBarProps) {
  const { user } = useUserSession();
  const { success, error: showErrorToast } = useToast();
  
  // User location state
  const [userLocation, setUserLocation] = useState<{
    address?: string;
    latitude?: number;
    longitude?: number;
    locationLastUpdated?: number | null;
  } | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Business[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 20,
    hasMore: false,
  });
  const [locationInfo, setLocationInfo] = useState<SearchResponse["location"] | undefined>();
  const [queryAnalysis, setQueryAnalysis] = useState<SearchResponse["analysis"] | undefined>();
  const [showQueryAnalysis, setShowQueryAnalysis] = useState(false);
  const [isProcessingSemantic, setIsProcessingSemantic] = useState(false);
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [priceRange, setPriceRange] = useState<string | undefined>(undefined);
  
  // Location setup modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState<string | null>(null);

  /**
   * Perform search
   */
  const performSearch = async (query: string, page: number = 1) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/business-search-bar.tsx:143',message:'performSearch entry',data:{query,page},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    // Validate query
    if (!query || query.trim().length === 0) {
      setError("Please enter a search query");
      return;
    }

    console.log("[BusinessSearchBar] performSearch called with query:", query, "page:", page);
    
    // Clear old results immediately when starting a new search
    setResults([]);
    setLoading(true);
    setError(null);
    setIsProcessingSemantic(true);
    setQueryAnalysis(undefined); // Clear previous query analysis
    setShowQueryAnalysis(false); // Hide previous analysis

    try {
      // Check if "near me" search
      const isNearMe = detectNearMeKeywords(query);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/business-search-bar.tsx:164',message:'After detectNearMeKeywords',data:{isNearMe},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      // Get session ID for authentication
      const sessionId = localStorage.getItem("sessionId");
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/business-search-bar.tsx:168',message:'After get sessionId',data:{hasSessionId:!!sessionId,hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.log("[BusinessSearchBar] Session ID:", sessionId ? "present" : "not found");
      
      // Prepare request with filters
      const requestBody: any = {
        query: query.trim(),
        pagination: {
          page,
          limit: 20,
        },
        filters: {},
      };

      // Add rating filter if set
      if (minRating !== undefined && minRating > 0) {
        requestBody.filters.minRating = minRating;
      }

      // Add price range filter if set
      if (priceRange) {
        requestBody.filters.priceRange = priceRange;
      }

      console.log("[BusinessSearchBar] Making API request to /api/search with body:", requestBody);

      // Call search API
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/business-search-bar.tsx:191',message:'Before fetch search API',data:{query:requestBody.query,hasFilters:!!requestBody.filters},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionId && { "x-session-id": sessionId }),
        },
        body: JSON.stringify(requestBody),
      });

      console.log("[BusinessSearchBar] API response status:", response.status, response.ok);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/business-search-bar.tsx:202',message:'After fetch response',data:{status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      const data: SearchResponse = await response.json();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/business-search-bar.tsx:205',message:'After parse response',data:{success:data.success,resultCount:data.results?.length,hasError:!!data.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.log("[BusinessSearchBar] API response data:", data);

      if (!response.ok || !data.success) {
        console.log("[BusinessSearchBar] API request failed:", data.error, "errorCode:", data.errorCode);
        // Handle location required error
        if (data.errorCode === "LOCATION_REQUIRED" && data.action === "SET_LOCATION") {
          setError(null); // Don't show error, just open modal
          setShowLocationModal(true);
          setPendingSearchQuery(query); // Save query to retry after location is set
          setLoading(false);
          showErrorToast("Location required for 'near me' searches. Please set your location.");
          return;
        }

        // Handle other errors
        setError(data.error || "Search failed. Please try again.");
        setResults([]);
        setPagination({
          page: 1,
          totalPages: 1,
          total: 0,
          limit: 20,
          hasMore: false,
        });
        setLocationInfo(undefined);
        setLoading(false);
        return;
      }

      // Success - update state
      console.log("[BusinessSearchBar] Search successful, results count:", data.results?.length || 0);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/business-search-bar.tsx:234',message:'Search success',data:{resultCount:data.results?.length,total:data.pagination?.total},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      setResults(data.results || []);
      setPagination(data.pagination || {
        page: 1,
        totalPages: 1,
        total: 0,
        limit: 20,
        hasMore: false,
      });
      setLocationInfo(data.location);
      setQueryAnalysis(data.analysis);
      setError(null);
      setIsProcessingSemantic(false);

      // Show query analysis if available
      if (data.analysis) {
        setShowQueryAnalysis(true);
      }

      // Show success message if partial results
      if (data.partialResults) {
        showErrorToast("Search timed out. Partial results returned.");
      }

      // Show info if using fallback
      if (data.performance?.errors && data.performance.errors.length > 0) {
        const hasFallback = data.performance.errors.some((e: string) =>
          e.toLowerCase().includes("fallback") || e.toLowerCase().includes("keyword")
        );
        if (hasFallback && data.results.length > 0) {
          // Don't show error toast, just indicate in UI
        }
      }
    } catch (err: any) {
      // #region agent log
      const errorMsg = err instanceof Error ? err.message : String(err);
      const errorName = err instanceof Error ? err.name : 'Unknown';
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/business-search-bar.tsx:253',message:'Search catch error',data:{errorMessage:errorMsg,errorName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error("Search error:", err);
      setError("Failed to perform search. Please try again.");
      setResults([]);
      setPagination({
        page: 1,
        totalPages: 1,
        total: 0,
        limit: 20,
        hasMore: false,
      });
      setLocationInfo(undefined);
      setQueryAnalysis(undefined);
      setIsProcessingSemantic(false);
    } finally {
      setLoading(false);
      setIsProcessingSemantic(false);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[BusinessSearchBar] handleSubmit called, searchQuery:", searchQuery);
    
    if (!searchQuery || !searchQuery.trim()) {
      console.log("[BusinessSearchBar] Empty query, not performing search");
      return;
    }
    
    await performSearch(searchQuery, 1);
  };
  
  /**
   * Handle search button click (alternative trigger)
   */
  const handleSearchClick = async () => {
    console.log("[BusinessSearchBar] handleSearchClick called, searchQuery:", searchQuery);
    
    if (!searchQuery || !searchQuery.trim()) {
      console.log("[BusinessSearchBar] Empty query, not performing search");
      return;
    }
    
    await performSearch(searchQuery, 1);
  };

  /**
   * Handle page change
   */
  const handlePageChange = (page: number) => {
    performSearch(searchQuery, page);
  };

  /**
   * Handle location updated
   */
  const handleLocationUpdated = async () => {
    success("Location updated successfully!");
    
    // If there's a pending "near me" search, retry it
    if (pendingSearchQuery) {
      const query = pendingSearchQuery;
      setPendingSearchQuery(null);
      await performSearch(query, 1);
    } else if (detectNearMeKeywords(searchQuery)) {
      // If current query is "near me", retry search
      await performSearch(searchQuery, pagination.page);
    }
  };

  /**
   * Handle location set from modal
   */
  const handleLocationSet = async () => {
    setShowLocationModal(false);
    // Small delay to ensure location is saved
    setTimeout(async () => {
      await handleLocationUpdated();
    }, 500);
  };

  /**
   * Fetch user location from profile
   */
  useEffect(() => {
    const fetchUserLocation = async () => {
      if (!user?.userId) {
        setUserLocation(null);
        return;
      }

      try {
        const sessionId = localStorage.getItem("sessionId");
        if (!sessionId) {
          setUserLocation(null);
          return;
        }

        const response = await fetch("/api/profile", {
          method: "GET",
          headers: {
            "x-session-id": sessionId,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUserLocation({
              address: data.user.address || undefined,
              latitude: data.user.latitude || undefined,
              longitude: data.user.longitude || undefined,
              locationLastUpdated: data.user.locationLastUpdated || null,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user location:", error);
        setUserLocation(null);
      }
    };

    fetchUserLocation();
  }, [user?.userId]);

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 h-5 w-5 text-muted-foreground pointer-events-none top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search for businesses, industries, locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                // Allow Enter key to submit form
                if (e.key === "Enter" && searchQuery.trim()) {
                  console.log("[BusinessSearchBar] Enter key pressed in input");
                  // Form submission will be handled by handleSubmit
                }
              }}
              className="pl-12 pr-32 h-14 text-base rounded-lg border-2 border-input/50 focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary/30"
              disabled={loading}
            />
            <Button
              type="submit"
              size="lg"
              className="absolute right-2 h-10 px-6 rounded-md"
              disabled={loading || !searchQuery.trim()}
              onClick={(e) => {
                // Ensure form submission happens even if button is clicked directly
                if (!searchQuery.trim()) {
                  e.preventDefault();
                  return;
                }
                console.log("[BusinessSearchBar] Search button clicked");
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                "Search"
              )}
            </Button>
          </div>
          
          {/* Location Update Button */}
          {user?.userId && (
            <LocationUpdateButton
              userId={user.userId}
              onLocationUpdated={handleLocationUpdated}
              showStaleIndicator={true}
              variant="outline"
              size="default"
              className="h-14"
            />
          )}
        </div>
      </form>

      {/* Helper Text and Filters Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Discover businesses by name, industry, location, or keywords
          </p>
          {isProcessingSemantic && (
            <div className="flex items-center gap-1 text-xs text-primary">
              <Sparkles className="h-3 w-3 animate-pulse" />
              <span>AI processing...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {queryAnalysis && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowQueryAnalysis(!showQueryAnalysis)}
              className="flex items-center gap-1 text-xs"
            >
              <Info className="h-3 w-3" />
              Query Details
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {(minRating !== undefined || priceRange) && (
              <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>
        </div>
      </div>

      {/* Query Understanding Display */}
      {showQueryAnalysis && queryAnalysis && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Query Understanding</h3>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowQueryAnalysis(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Intent */}
            {queryAnalysis.intent && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Intent</p>
                <p className="text-sm capitalize">{queryAnalysis.intent}</p>
              </div>
            )}

            {/* Category */}
            {queryAnalysis.category && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Category</p>
                <p className="text-sm capitalize">{queryAnalysis.category}</p>
              </div>
            )}

            {/* Locations */}
            {queryAnalysis.entities?.locations && queryAnalysis.entities.locations.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Locations</p>
                <p className="text-sm">{queryAnalysis.entities.locations.join(", ")}</p>
              </div>
            )}

            {/* Business Names */}
            {queryAnalysis.entities?.businessNames && queryAnalysis.entities.businessNames.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Business Names</p>
                <p className="text-sm">{queryAnalysis.entities.businessNames.join(", ")}</p>
              </div>
            )}

            {/* Price Range */}
            {queryAnalysis.entities?.priceRange && queryAnalysis.entities.priceRange.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Price Range</p>
                <p className="text-sm">{queryAnalysis.entities.priceRange.join(", ")}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Filter Results</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setMinRating(undefined);
                setPriceRange(undefined);
                // Re-run search without filters
                if (searchQuery.trim()) {
                  performSearch(searchQuery, 1);
                }
              }}
              className="h-6 px-2 text-xs"
            >
              Clear All
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Rating Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Rating</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  placeholder="e.g., 4.0"
                  value={minRating !== undefined ? minRating : ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setMinRating(value ? parseFloat(value) : undefined);
                  }}
                  className="h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMinRating(undefined);
                    if (searchQuery.trim()) {
                      performSearch(searchQuery, 1);
                    }
                  }}
                  className="h-9 px-2"
                  disabled={minRating === undefined}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Price Range</label>
              <div className="flex items-center gap-2">
                <select
                  value={priceRange || ""}
                  onChange={(e) => {
                    setPriceRange(e.target.value || undefined);
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Any Price</option>
                  <option value="$">$ - Budget</option>
                  <option value="$$">$$ - Moderate</option>
                  <option value="$$$">$$$ - Expensive</option>
                  <option value="$$$$">$$$$ - Very Expensive</option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPriceRange(undefined);
                    if (searchQuery.trim()) {
                      performSearch(searchQuery, 1);
                    }
                  }}
                  className="h-9 px-2"
                  disabled={!priceRange}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Apply Filters Button */}
          <Button
            type="button"
            onClick={() => {
              if (searchQuery.trim()) {
                performSearch(searchQuery, 1);
              }
            }}
            className="w-full"
            disabled={!searchQuery.trim()}
          >
            Apply Filters
          </Button>
        </div>
      )}

      {/* Search Results */}
      {showResults && (
        <SearchResults
          results={results}
          loading={loading}
          error={error}
          pagination={pagination}
          onPageChange={handlePageChange}
          locationInfo={locationInfo}
          userId={user?.userId}
          userLocation={userLocation}
          onBusinessClick={onBusinessClick}
        />
      )}

      {/* Location Setup Modal */}
      {showLocationModal && (
        <LocationSetupModal
          isOpen={showLocationModal}
          onClose={() => {
            setShowLocationModal(false);
            setPendingSearchQuery(null);
          }}
          onLocationSet={handleLocationSet}
        />
      )}
    </div>
  );
}
