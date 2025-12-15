/**
 * Search API endpoint
 * Handles business search requests with Bedrock-powered query processing
 * Uses complete query processing pipeline with NLP, embeddings, and hybrid search
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSessionOptional } from "../../../lib/middleware/auth";
import { recordSearchHistory } from "../../../lib/db/search-history";
import { processQuery } from "../../../lib/search/query-processor";
import { detectNearMeKeywords } from "../../../lib/search/location-resolver";

/**
 * Request body interface
 */
interface SearchRequest {
  query?: string;
  filters?: {
    category?: string;
    location?: {
      lat?: number;
      lng?: number;
      radius?: number;
    };
    minRating?: number;
    priceRange?: string;
  };
  pagination?: {
    page?: number;
    limit?: number;
  };
}

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  query: string;
  error: string;
  errorCode?: string;
  action?: string;
  performance?: {
    responseTime: number;
    fromCache: boolean;
    steps?: any[];
    bedrockApiCalls?: number;
    cacheHits?: number;
    errors?: string[];
  };
}

/**
 * Response interface
 */
interface SearchResponse {
  success: boolean;
  query: string;
  location?: {
    used: string; // Address or city name
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
  results: any[];
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
    entities: any;
  };
  performance: {
    responseTime: number; // in milliseconds
    fromCache: boolean;
    steps?: any[];
    bedrockApiCalls?: number;
    cacheHits?: number;
    errors?: string[];
  };
  error?: string;
  errorCode?: string;
  action?: string;
  partialResults?: boolean; // True if timeout occurred but partial results returned
}

/**
 * Validate search request
 */
function validateSearchRequest(body: any): {
  valid: boolean;
  error?: string;
  data?: SearchRequest;
} {
  // Validate query
  if (body.query !== undefined) {
    if (typeof body.query !== "string") {
      return { valid: false, error: "Query must be a string" };
    }
    if (body.query.trim().length === 0) {
      return { valid: false, error: "Query cannot be empty" };
    }
    if (body.query.length > 500) {
      return { valid: false, error: "Query cannot exceed 500 characters" };
    }
  }

  // Validate filters
  if (body.filters !== undefined) {
    if (typeof body.filters !== "object" || Array.isArray(body.filters)) {
      return { valid: false, error: "Filters must be an object" };
    }

    // Validate location
    if (body.filters.location !== undefined) {
      if (typeof body.filters.location !== "object" || Array.isArray(body.filters.location)) {
        return { valid: false, error: "Location must be an object" };
      }

      if (body.filters.location.lat !== undefined) {
        if (typeof body.filters.location.lat !== "number" || isNaN(body.filters.location.lat)) {
          return { valid: false, error: "Location latitude must be a number" };
        }
        if (body.filters.location.lat < -90 || body.filters.location.lat > 90) {
          return { valid: false, error: "Location latitude must be between -90 and 90" };
        }
      }

      if (body.filters.location.lng !== undefined) {
        if (typeof body.filters.location.lng !== "number" || isNaN(body.filters.location.lng)) {
          return { valid: false, error: "Location longitude must be a number" };
        }
        if (body.filters.location.lng < -180 || body.filters.location.lng > 180) {
          return { valid: false, error: "Location longitude must be between -180 and 180" };
        }
      }

      if (body.filters.location.radius !== undefined) {
        if (typeof body.filters.location.radius !== "number" || isNaN(body.filters.location.radius)) {
          return { valid: false, error: "Location radius must be a number" };
        }
        if (body.filters.location.radius <= 0) {
          return { valid: false, error: "Location radius must be greater than 0" };
        }
      }
    }

    // Validate rating
    if (body.filters.minRating !== undefined) {
      if (typeof body.filters.minRating !== "number" || isNaN(body.filters.minRating)) {
        return { valid: false, error: "Minimum rating must be a number" };
      }
      if (body.filters.minRating < 0 || body.filters.minRating > 5) {
        return { valid: false, error: "Minimum rating must be between 0 and 5" };
      }
    }
  }

  // Validate pagination
  if (body.pagination !== undefined) {
    if (typeof body.pagination !== "object" || Array.isArray(body.pagination)) {
      return { valid: false, error: "Pagination must be an object" };
    }

    if (body.pagination.page !== undefined) {
      if (typeof body.pagination.page !== "number" || isNaN(body.pagination.page)) {
        return { valid: false, error: "Page must be a number" };
      }
      if (body.pagination.page < 1) {
        return { valid: false, error: "Page must be >= 1" };
      }
      if (!Number.isInteger(body.pagination.page)) {
        return { valid: false, error: "Page must be an integer" };
      }
    }

    if (body.pagination.limit !== undefined) {
      if (typeof body.pagination.limit !== "number" || isNaN(body.pagination.limit)) {
        return { valid: false, error: "Limit must be a number" };
      }
      if (body.pagination.limit < 1 || body.pagination.limit > 100) {
        return { valid: false, error: "Limit must be between 1 and 100" };
      }
      if (!Number.isInteger(body.pagination.limit)) {
        return { valid: false, error: "Limit must be an integer" };
      }
    }
  }

  return { valid: true, data: body as SearchRequest };
}

/**
 * POST handler for search requests
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let query = "";
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/search/route.ts:206',message:'Search POST entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  try {
    // 1. Parse and validate request
    let body: any;
    try {
      body = await request.json();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/search/route.ts:216',message:'After parse body',data:{hasQuery:!!body.query,queryLength:body.query?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          query: "",
          error: "Invalid JSON in request body",
          errorCode: "INVALID_JSON",
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Validate request structure
    const validation = validateSearchRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          query: body.query || "",
          error: validation.error || "Invalid request",
          errorCode: "VALIDATION_ERROR",
        } as ErrorResponse,
        { status: 400 }
      );
    }

    const searchRequest = validation.data!;
    query = searchRequest.query || "";

    // Validate query is provided
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          query: "",
          error: "Query is required",
          errorCode: "VALIDATION_ERROR",
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Set defaults for pagination
    const page = searchRequest.pagination?.page || 1;
    const limit = searchRequest.pagination?.limit || 20;

    // 2. Authenticate (optional)
    const authResult = await validateSessionOptional(request);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/search/route.ts:264',message:'After validateSessionOptional',data:{isAuthenticated:authResult.isAuthenticated,hasUser:!!authResult.user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const userId = authResult.isAuthenticated && authResult.user ? authResult.user.userId : undefined;

    // Build session object for query processor
    const session: any = {
      filters: searchRequest.filters,
      location: authResult.isAuthenticated && authResult.user?.location
        ? {
            latitude: authResult.user.location.latitude,
            longitude: authResult.user.location.longitude,
            address: authResult.user.location.address,
            city: authResult.user.location.city,
            state: authResult.user.location.state,
          }
        : undefined,
    };

    // Check for "near me" keywords
    const isNearMe = detectNearMeKeywords(query);

    // If "near me" detected and no user profile location, return special error
    if (isNearMe && !session.location?.latitude && !session.location?.longitude) {
      return NextResponse.json(
        {
          success: false,
          query,
          error: "Location required for 'near me' searches. Please set your location in profile or provide coordinates.",
          errorCode: "LOCATION_REQUIRED",
          action: "SET_LOCATION",
          performance: {
            responseTime: Date.now() - startTime,
            fromCache: false,
          },
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // 3. Process query using query processor with enhanced error handling
    let processingResult;
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/search/route.ts:303',message:'Before processQuery',data:{query,hasUserId:!!userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      processingResult = await processQuery(query, userId, session, request);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/search/route.ts:305',message:'After processQuery',data:{resultCount:processingResult?.results?.length,hasErrors:!!processingResult?.performance?.errors},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } catch (error: any) {
      console.error("Query processing error:", error);
      
      // Check for specific error types
      const errorMessage = error.message || String(error);
      let errorCode = "PROCESSING_ERROR";
      let statusCode = 500;
      
      // Bedrock errors
      if (errorMessage.includes("Bedrock") || errorMessage.includes("bedrock") || 
          errorMessage.includes("AccessDenied") || errorMessage.includes("Throttling")) {
        errorCode = "BEDROCK_ERROR";
        // Bedrock errors should still return partial results if available
        // The query processor should have fallbacks built in
      }
      
      // Embedding errors
      if (errorMessage.includes("embedding") || errorMessage.includes("Embedding")) {
        errorCode = "EMBEDDING_ERROR";
        // Embedding errors should fallback to keyword-only search
      }
      
      // Validation errors
      if (errorMessage.includes("validation") || errorMessage.includes("Validation") ||
          errorMessage.includes("required") || errorMessage.includes("invalid")) {
        errorCode = "VALIDATION_ERROR";
        statusCode = 400;
      }
      
      // Return error response with performance metrics if available
      return NextResponse.json(
        {
          success: false,
          query,
          error: errorCode === "VALIDATION_ERROR" 
            ? errorMessage 
            : "Query processing failed. Please try again.",
          errorCode,
          performance: {
            responseTime: Date.now() - startTime,
            fromCache: false,
            errors: [errorMessage],
          },
        } as ErrorResponse,
        { status: statusCode }
      );
    }
    
    // Check if processing result has errors (partial success)
    if (processingResult.performance.errors && processingResult.performance.errors.length > 0) {
      // Log errors but continue (query processor handles fallbacks)
      console.warn("Query processing completed with errors:", processingResult.performance.errors);
      
      // Check for critical errors that should prevent results
      const criticalErrors = processingResult.performance.errors.filter((e: string) =>
        e.toLowerCase().includes("fatal") || 
        e.toLowerCase().includes("critical") ||
        e.toLowerCase().includes("timeout")
      );
      
      if (criticalErrors.length > 0 && processingResult.results.length === 0) {
        return NextResponse.json(
          {
            success: false,
            query,
            error: "Search failed due to critical errors. Please try again.",
            errorCode: "CRITICAL_ERROR",
            performance: processingResult.performance,
          } as ErrorResponse,
          { status: 500 }
        );
      }
    }

    // 4. Extract results and metadata
    const results = processingResult.results || [];
    const analysis = processingResult.analysis;
    const performance = processingResult.performance;

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedResults = results.slice(offset, offset + limit);
    const total = results.length;
    const totalPages = Math.ceil(total / limit);
    const hasMore = paginatedResults.length === limit && offset + limit < total;

    // 5. Format location info from analysis
    let locationInfo: SearchResponse["location"] | undefined;
    if (analysis.location) {
      locationInfo = {
        used: analysis.location.address || analysis.location.city || "Unknown location",
        source: analysis.location.source,
        coordinates: {
          lat: analysis.location.lat,
          lng: analysis.location.lng,
        },
        city: analysis.location.city,
        state: analysis.location.state,
        radius: analysis.location.radius,
        isStale: analysis.location.isStale,
      };
    } else if (searchRequest.filters?.location?.lat && searchRequest.filters?.location?.lng) {
      locationInfo = {
        used: "Provided coordinates",
        source: "explicit",
        coordinates: {
          lat: searchRequest.filters.location.lat,
          lng: searchRequest.filters.location.lng,
        },
        radius: searchRequest.filters.location.radius || 10000,
      };
    }

    // 6. Format results
    const formattedResults = paginatedResults.map((item: any) => {
      const formatted: any = {
        ...item,
        businessId: item.businessId,
        name: item.name,
        description: item.description,
        category: item.category,
        location: item.location,
        rating: item.rating ? parseFloat(item.rating.toFixed(1)) : null,
        priceRange: item.priceRange || null,
        images: item.images || [],
        phoneNumber: item.contact?.phone,
        email: item.contact?.email,
        website: item.contact?.website,
        businessHours: item.businessHours,
        amenities: item.amenities || [],
        status: item.status,
        isVerified: item.isVerified || false,
      };

      // Add distance if location provided
      if (item.distance !== undefined) {
        formatted.distance = Math.round(item.distance); // Round to nearest meter
        formatted.distanceKm = parseFloat((item.distance / 1000).toFixed(2)); // Distance in km
      }

      // Format rating
      if (formatted.rating !== null) {
        formatted.rating = parseFloat(formatted.rating.toFixed(1));
      }

      // Format price range (ensure it's a string)
      if (formatted.priceRange) {
        formatted.priceRange = String(formatted.priceRange);
      }

      // Include image URLs
      if (formatted.images && Array.isArray(formatted.images)) {
        formatted.imageUrls = formatted.images
          .map((img: any) => {
            if (typeof img === "string") return img;
            if (img?.url) return img.url;
            return null;
          })
          .filter((url: string | null) => url !== null);
      }

      return formatted;
    });

    // 7. Build response
    const response: SearchResponse = {
      success: true,
      query,
      results: formattedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
      analysis: {
        intent: analysis.intent,
        category: analysis.category,
        entities: analysis.entities,
      },
      performance: {
        responseTime: performance.responseTime,
        fromCache: performance.fromCache,
        steps: performance.steps,
        bedrockApiCalls: performance.bedrockApiCalls,
        cacheHits: performance.cacheHits,
        errors: performance.errors,
      },
    };

    // Add location info if available
    if (locationInfo) {
      response.location = locationInfo;
    }

    // Add errors if present (but search still succeeded)
    // Format errors for better readability
    if (performance.errors && performance.errors.length > 0) {
      const errorMessages = performance.errors.map((e: string) => {
        // Simplify error messages for client
        if (e.includes("Bedrock") || e.includes("bedrock")) {
          return "AI analysis temporarily unavailable (using fallback)";
        }
        if (e.includes("embedding") || e.includes("Embedding")) {
          return "Semantic search temporarily unavailable (using keyword search)";
        }
        if (e.includes("location") || e.includes("Location")) {
          return "Location resolution failed (searching without location filter)";
        }
        return e;
      });
      
      // Only include non-critical errors in response
      const nonCriticalErrors = errorMessages.filter((e: string) =>
        !e.toLowerCase().includes("fatal") && 
        !e.toLowerCase().includes("critical")
      );
      
      if (nonCriticalErrors.length > 0) {
        response.error = nonCriticalErrors.join("; ");
      }
      
      // Add warning flag if errors occurred but results are still returned
      if (nonCriticalErrors.length > 0 && response.results.length > 0) {
        response.partialResults = true;
      }
    }

    // 8. Fire-and-forget search history for authenticated users
    if (userId && searchRequest.query) {
      recordSearchHistory(userId, {
        query: searchRequest.query,
        filters: searchRequest.filters || {},
        location: response.location || {},
        resultCount: response.pagination?.total || 0,
      }).catch((err: any) => console.error("Failed to record search history:", err));
    }

    // 9. Return response
    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    // #region agent log
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Unknown';
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/search/route.ts:537',message:'Search catch error',data:{errorMessage:errorMsg,errorName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // Log actual error for debugging
    console.error("Search API error:", error);
    console.error("Search API error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 500),
    });
    const errorMessage = error.message || String(error);

    return NextResponse.json(
      {
        success: false,
        query: typeof query !== "undefined" ? query : "",
        error: errorMessage.includes("Cannot read") || errorMessage.includes("undefined") 
          ? "Search service error. Please try again." 
          : "Internal server error. Please try again.",
        errorCode: "INTERNAL_ERROR",
        performance: {
          responseTime: Date.now() - startTime,
          fromCache: false,
        },
      } as ErrorResponse,
      { status: 500 }
    );
  }
}
