/**
 * AWS Bedrock NLP utilities
 * Handles natural language processing using Bedrock models
 */

import { getBedrockClient, getNLPModelIdentifier, getNLPFallbackModelID } from "./bedrock-client";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { mapBedrockCategory } from "../mapping/bedrock-category-mapper";
import { getAllCategories } from "../data/categories";
import { normalizeBusinessName } from "../normalization/name-normalizer";
import { normalizePriceRange } from "../normalization/price-range-normalizer";
import { normalizeLocationName } from "../normalization/location-normalizer";
import { withRateLimit } from "./rate-limiter";
import { withFallback, isRetryableError, retryWithBackoff } from "./fallback-handler";
import { getBedrockCostMonitor } from "../search/performance-optimizer";

export interface NLPRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface NLPResponse {
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

/**
 * Invoke Bedrock NLP model with primary/fallback support
 */
export async function invokeNLP(request: NLPRequest): Promise<NLPResponse> {
  const { prompt, maxTokens = 1000, temperature = 0.7, systemPrompt } = request;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new Error("Prompt is required for NLP invocation");
  }

  // Try primary model first
  const primaryModelId = getNLPModelIdentifier();
  try {
    return await invokeNLPWithModel(primaryModelId, request);
  } catch (primaryError: any) {
    // If primary fails and it's a retryable error or model-specific error, try fallback
    const isRetryable = isRetryableError(primaryError);
    const isModelError = primaryError.message?.includes("model") || 
                         primaryError.message?.includes("AccessDenied") ||
                         primaryError.message?.includes("ValidationException");

    if (isRetryable || isModelError) {
      const fallbackModelId = getNLPFallbackModelID();
      console.log(`[NLP] Primary model failed, trying fallback: ${fallbackModelId}`);
      try {
        return await invokeNLPWithModel(fallbackModelId, request);
      } catch (fallbackError: any) {
        // If fallback also fails, throw the original error
        throw new Error(`Both primary and fallback models failed. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`);
      }
    }
    // If not retryable, throw original error
    throw primaryError;
  }
}

/**
 * Invoke Bedrock NLP model with specific model ID
 */
async function invokeNLPWithModel(
  modelIdentifier: string,
  request: NLPRequest
): Promise<NLPResponse> {
  const { prompt, maxTokens = 1000, temperature = 0.7, systemPrompt } = request;

  try {
    // Check if using inference profile (ARN) or direct model ID
    const isInferenceProfile = modelIdentifier.startsWith("arn:");
    // Check model type
    const isNovaModel = modelIdentifier.includes("amazon.nova") || modelIdentifier.includes("apac.amazon.nova");
    const isTitanModel = modelIdentifier.includes("amazon.titan");
    const isMistralModel = modelIdentifier.includes("mistral.");
    const isLlamaModel = modelIdentifier.includes("meta.llama");

    let requestBody: any;

    if (isNovaModel) {
      // Amazon Nova model format (via inference profile)
      requestBody = {
        messages: [
          ...(systemPrompt
            ? [
                {
                  role: "system",
                  content: [{ text: systemPrompt }],
                },
              ]
            : []),
          {
            role: "user",
            content: [{ text: prompt }],
          },
        ],
        inferenceConfig: {
          maxTokens: maxTokens,
          temperature,
        },
      };
    } else if (isTitanModel) {
      // Amazon Titan model format
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
      requestBody = {
        inputText: fullPrompt,
        textGenerationConfig: {
          maxTokenCount: maxTokens,
          temperature,
        },
      };
    } else if (isMistralModel) {
      // Mistral model format
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
      requestBody = {
        prompt: `<s>[INST] ${fullPrompt} [/INST]`,
        max_tokens: maxTokens,
        temperature,
      };
    } else if (isLlamaModel) {
      // Meta Llama model format
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
      requestBody = {
        prompt: fullPrompt,
        max_gen_len: maxTokens,
        temperature,
      };
    } else if (isInferenceProfile) {
      // Inference profile format (for Claude Sonnet 4, etc.)
      requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: maxTokens,
        temperature,
        messages: [
          ...(systemPrompt
            ? [
                {
                  role: "system",
                  content: systemPrompt,
                },
              ]
            : []),
          {
            role: "user",
            content: prompt,
          },
        ],
      };
    } else {
      // Direct model format (for Claude 3 Haiku, etc.)
      requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: maxTokens,
        temperature,
        messages: [
          ...(systemPrompt
            ? [
                {
                  role: "system",
                  content: systemPrompt,
                },
              ]
            : []),
          {
            role: "user",
            content: prompt,
          },
        ],
      };
    }

    const command = new InvokeModelCommand({
      modelId: modelIdentifier,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody),
    });

    const response = await getBedrockClient().send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Track cost
    try {
      const costMonitor = getBedrockCostMonitor();
      const usage = responseBody.usage || {};
      const inputTokens = usage.inputTokens || Math.ceil(prompt.length / 4); // Rough estimate
      const outputTokens = usage.outputTokens || Math.ceil((responseBody.text?.length || 0) / 4);
      
      // Determine model name for cost tracking
      let modelName = modelIdentifier;
      if (modelIdentifier.includes("claude")) {
        modelName = "claude-3-sonnet"; // Default to sonnet pricing
      } else if (modelIdentifier.includes("haiku")) {
        modelName = "claude-3-haiku";
      }
      
      costMonitor.recordAPICall(modelName, { input: inputTokens, output: outputTokens });
    } catch (costError) {
      // Don't fail if cost tracking fails
      console.warn(`[NLP] Failed to track cost: ${costError}`);
    }

    // Extract text from response
    let text = "";
    let usage = responseBody.usage;

    // Handle Titan model response format
    if (responseBody.results && responseBody.results[0]) {
      text = responseBody.results[0].outputText || "";
      usage = responseBody.results[0].tokenCount ? {
        inputTokens: responseBody.results[0].tokenCount.inputTokens,
        outputTokens: responseBody.results[0].tokenCount.outputTokens,
      } : undefined;
    }
    // Handle Nova model response format
    else if (responseBody.output && responseBody.output.message) {
      const content = responseBody.output.message.content;
      if (Array.isArray(content)) {
        text = content.map((item: any) => item.text || "").join("");
      } else if (typeof content === "string") {
        text = content;
      }
      usage = responseBody.usage;
    }
    // Handle Mistral model response format
    else if (responseBody.outputs && responseBody.outputs[0]) {
      text = responseBody.outputs[0].text || "";
      usage = responseBody.usage;
    }
    // Handle Llama model response format
    else if (responseBody.generation) {
      text = responseBody.generation;
      usage = responseBody.prompt_token_count && responseBody.generation_token_count ? {
        inputTokens: responseBody.prompt_token_count,
        outputTokens: responseBody.generation_token_count,
      } : undefined;
    }
    // Handle Claude model response format
    else if (responseBody.content && Array.isArray(responseBody.content)) {
      text = responseBody.content
        .map((item: any) => item.text || "")
        .join("");
      usage = responseBody.usage;
    } else if (responseBody.text) {
      text = responseBody.text;
    } else if (typeof responseBody === "string") {
      text = responseBody;
    }

    return {
      text,
      usage,
    };
  } catch (error: any) {
    throw new Error(`Failed to invoke NLP model: ${error.message}`);
  }
}

/**
 * Extract entities from text using NLP (legacy function)
 * @deprecated Use the new extractEntities() function with EntityResult return type
 */
export async function extractEntitiesLegacy(text: string): Promise<{
  categories?: string[];
  locations?: string[];
  intent?: string;
}> {
  const systemPrompt = `You are an entity extraction system. Extract business categories, locations, and search intent from user queries. Return a JSON object with categories (array), locations (array), and intent (string: "find", "discover", "compare", or "explore").`;

  const prompt = `Extract entities from this search query: "${text}"\n\nReturn only valid JSON.`;

  try {
    const response = await invokeNLPWithErrorHandling({
      prompt,
      systemPrompt,
      maxTokens: 200,
      temperature: 0.3,
    });

    // Parse JSON response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const entities = JSON.parse(jsonMatch[0]);
      return {
        categories: entities.categories || [],
        locations: entities.locations || [],
        intent: entities.intent || "find",
      };
    }

    return {};
  } catch (error) {
    // Fallback: return empty entities
    return {};
  }
}

/**
 * Classify search query category
 * @deprecated Use classifyCategory instead
 */
export async function classifyQueryCategory(query: string): Promise<string | null> {
  const result = await classifyCategory(query);
  return result.category || null;
}

// Intent detection cache (in-memory)
const intentCache = new Map<string, { intent: 'search' | 'book' | 'compare' | 'review' | 'directions' | 'unknown'; confidence: number; timestamp: number }>();
const INTENT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Detect user intent from query
 * Uses Claude to classify intent with caching for performance
 * 
 * @param query - User search query
 * @returns Intent classification with confidence score
 */
export async function detectIntent(query: string): Promise<{
  intent: 'search' | 'book' | 'compare' | 'review' | 'directions' | 'unknown';
  confidence: number;
}> {
  // Basic validation
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return { intent: "search", confidence: 0.5 };
  }

  const normalizedQuery = query.trim().toLowerCase();

  // Check cache
  const cached = intentCache.get(normalizedQuery);
  if (cached && Date.now() - cached.timestamp < INTENT_CACHE_TTL) {
    return { intent: cached.intent, confidence: cached.confidence };
  }

  // Intent classification prompt
  const systemPrompt = `You are an intent classification system for business search queries. Classify the user's intent from their query.

Intent types:
- search: User wants to find businesses (e.g., "find restaurants", "show me hotels", "where are gyms")
- book: User wants to make a reservation/booking (e.g., "book a table", "reserve hotel", "make appointment")
- compare: User wants to compare businesses (e.g., "compare restaurants", "which is better", "difference between")
- review: User wants to see reviews (e.g., "reviews for", "ratings of", "what do people say about")
- directions: User wants directions to a business (e.g., "how to get to", "directions to", "route to")
- unknown: Intent is unclear or doesn't fit other categories

Return your response as a JSON object with "intent" (one of the types above) and "confidence" (0.0 to 1.0).`;

  const prompt = `Classify the user's intent from this query: "${query}"

Return only a JSON object in this format:
{
  "intent": "search|book|compare|review|directions|unknown",
  "confidence": 0.0-1.0
}`;

  try {
    const response = await invokeNLPWithErrorHandling({
      prompt,
      systemPrompt,
      maxTokens: 100,
      temperature: 0.3,
    });

    // Parse JSON response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const intent = parsed.intent?.toLowerCase();
        const confidence = Math.max(0, Math.min(1, parseFloat(parsed.confidence) || 0.5));

        // Validate intent
        const validIntents: Array<'search' | 'book' | 'compare' | 'review' | 'directions' | 'unknown'> = 
          ['search', 'book', 'compare', 'review', 'directions', 'unknown'];
        const validatedIntent = validIntents.includes(intent) ? intent : 'unknown';

        const result = {
          intent: validatedIntent as 'search' | 'book' | 'compare' | 'review' | 'directions' | 'unknown',
          confidence,
        };

        // Cache result
        intentCache.set(normalizedQuery, {
          ...result,
          timestamp: Date.now(),
        });

        // Log low confidence results for review
        if (confidence < 0.6) {
          console.warn(`[NLP] Low confidence intent detection: "${query}" -> ${validatedIntent} (${confidence})`);
        }

        return result;
      } catch (parseError) {
        console.error(`[NLP] Failed to parse intent response: ${parseError}`);
      }
    }
  } catch (error: any) {
    console.error(`[NLP] Intent detection error: ${error.message}`);
    // Return default on error
    const defaultResult = { intent: "search" as const, confidence: 0.5 };
    intentCache.set(normalizedQuery, {
      ...defaultResult,
      timestamp: Date.now(),
    });
    return defaultResult;
  }

  // Fallback if parsing fails
  return { intent: "search", confidence: 0.5 };
}

// Category classification cache (in-memory)
const categoryCache = new Map<string, { category: string; confidence: number; alternatives: string[]; timestamp: number }>();
const CATEGORY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Classify category from query
 * Uses Claude to classify category and maps to our taxonomy
 * 
 * @param query - User search query
 * @returns Category classification with confidence and alternatives
 */
export async function classifyCategory(query: string): Promise<{
  category: string; // Our standardized category ID
  confidence: number;
  alternatives: string[]; // Alternative categories
}> {
  // Basic validation
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return {
      category: "general",
      confidence: 0.0,
      alternatives: [],
    };
  }

  const normalizedQuery = query.trim().toLowerCase();

  // Check cache
  const cached = categoryCache.get(normalizedQuery);
  if (cached && Date.now() - cached.timestamp < CATEGORY_CACHE_TTL) {
    return {
      category: cached.category,
      confidence: cached.confidence,
      alternatives: cached.alternatives,
    };
  }

  // Get all categories for the prompt
  const allCategories = getAllCategories();
  const rootCategories = allCategories.filter((cat) => !cat.parentId);
  const categoryList = rootCategories.map((cat) => `- ${cat.name} (${cat.id})`).join("\n");

  // Category-specific natural language examples for enhanced understanding
  const naturalLanguageExamples: Record<string, string[]> = {
    food: [
      "I am looking for places to eat", "I want to eat something", "where to eat",
      "I'm hungry", "need food", "places to eat", "looking for food", "want to eat"
    ],
    fitness: [
      "I need to work out", "where to exercise", "places to work out",
      "gym to join", "want to start working out", "need to exercise"
    ],
    healthcare: [
      "need to see a doctor", "find medical help", "need medical attention",
      "where to get treatment", "healthcare services", "medical services"
    ],
    accommodation: [
      "places to stay", "where to stay", "need a place to stay",
      "book a hotel", "find accommodation", "lodging options"
    ],
    automotive: [
      "need car service", "find a mechanic", "car repair shop",
      "automotive services", "vehicle services", "car maintenance"
    ],
    retail: [
      "where to shop", "find stores", "shopping places",
      "retail stores", "where can I buy", "shopping malls"
    ],
    entertainment: [
      "entertainment places", "things to do", "fun places",
      "places to visit", "entertainment options", "recreation"
    ],
    "professional-services": [
      "service providers", "professional services", "business services",
      "find services", "service options"
    ],
    education: [
      "find schools", "education services", "coaching classes",
      "training institutes", "learning centers"
    ],
  };

  // Build concise examples section
  const examplesSection = Object.entries(naturalLanguageExamples)
    .map(([catId, examples]) => {
      const cat = rootCategories.find(c => c.id === catId);
      if (!cat || examples.length === 0) return null;
      return `- ${cat.name} (${catId}): "${examples.slice(0, 3).join('", "')}" ...`;
    })
    .filter(Boolean)
    .join("\n");

  // Enhanced category classification prompt with natural language examples
  const systemPrompt = `You are a category classification system for business search queries. Classify natural language queries into one of the available business categories.

Available categories:
${categoryList}

Natural Language Query Examples:
${examplesSection}

Important Guidelines:
- Understand conversational queries: "I want to eat" → food, "need a place to stay" → accommodation
- Recognize intent phrases: "looking for", "want", "need", "where can I find", "show me", "I'm", "I am"
- Map synonyms and related terms from the category synonyms to correct categories
- Consider context and intent: "I'm hungry" → food, "need to work out" → fitness, "need medical help" → healthcare
- Handle variations: "places to eat" = "where to eat" = "want to eat" → all map to food

Return your response as a JSON object with:
- "category": The most relevant category ID from the list above
- "confidence": Confidence score (0.0 to 1.0)
- "alternatives": Array of alternative category IDs (if applicable, max 3)

If the query doesn't clearly match any category, use "general" with low confidence (<0.3).`;

  const prompt = `Classify this business search query into one of these categories: ${rootCategories.map(c => c.id).join(", ")}

Query: "${query}"

Return only a JSON object in this format:
{
  "category": "category-id",
  "confidence": 0.0-1.0,
  "alternatives": ["category-id1", "category-id2"]
}`;

  try {
    const response = await invokeNLPWithErrorHandling({
      prompt,
      systemPrompt,
      maxTokens: 200,
      temperature: 0.2,
    });

    // Parse JSON response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const bedrockCategory = parsed.category || parsed.categoryId || "";
        const confidence = Math.max(0, Math.min(1, parseFloat(parsed.confidence) || 0.5));
        const alternatives = Array.isArray(parsed.alternatives) 
          ? parsed.alternatives.map((alt: any) => String(alt).toLowerCase())
          : [];

        // Map Bedrock output to our taxonomy
        const mappedResult = mapBedrockCategory(bedrockCategory, confidence);
        const categoryId = mappedResult.categoryId;

        // Map alternatives
        const mappedAlternatives = alternatives
          .map((alt: string) => mapBedrockCategory(alt, confidence * 0.8))
          .filter((result) => result.categoryId !== "general" && result.categoryId !== categoryId)
          .map((result) => result.categoryId)
          .slice(0, 3); // Max 3 alternatives

        // Return "general" if confidence too low
        const finalCategory = confidence < 0.3 ? "general" : categoryId;
        const finalConfidence = confidence < 0.3 ? confidence : mappedResult.confidence;

        const result = {
          category: finalCategory,
          confidence: finalConfidence,
          alternatives: mappedAlternatives,
        };

        // Cache result
        categoryCache.set(normalizedQuery, {
          ...result,
          timestamp: Date.now(),
        });

        // Log low confidence results for review
        if (finalConfidence < 0.5) {
          console.warn(`[NLP] Low confidence category classification: "${query}" -> ${finalCategory} (${finalConfidence})`);
        }

        return result;
      } catch (parseError) {
        console.error(`[NLP] Failed to parse category response: ${parseError}`);
      }
    }
  } catch (error: any) {
    console.error(`[NLP] Category classification error: ${error.message}`);
    // Return default on error
    const defaultResult = {
      category: "general",
      confidence: 0.0,
      alternatives: [],
    };
    categoryCache.set(normalizedQuery, {
      ...defaultResult,
      timestamp: Date.now(),
    });
    return defaultResult;
  }

  // Fallback if parsing fails
  return {
    category: "general",
    confidence: 0.0,
    alternatives: [],
  };
}

// Entity extraction cache (in-memory)
const entityCache = new Map<string, { entities: EntityResult; timestamp: number }>();
const ENTITY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Entity extraction result type
export interface EntityResult {
  locations: string[];
  businessNames: string[];
  times: string[]; // "now", "tonight", "open now"
  prices: string[]; // "budget", "cheap", "expensive"
  features: string[]; // "pet-friendly", "wifi", etc.
  confidence: number;
}

/**
 * Extract entities from query
 * Uses Claude to extract locations, business names, times, prices, and features
 * 
 * @param query - User search query
 * @returns Extracted entities with confidence
 */
export async function extractEntities(query: string): Promise<EntityResult> {
  // Basic validation
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return {
      locations: [],
      businessNames: [],
      times: [],
      prices: [],
      features: [],
      confidence: 0.0,
    };
  }

  const normalizedQuery = query.trim().toLowerCase();

  // Check cache
  const cached = entityCache.get(normalizedQuery);
  if (cached && Date.now() - cached.timestamp < ENTITY_CACHE_TTL) {
    return cached.entities;
  }

  // Entity extraction prompt
  const systemPrompt = `You are an entity extraction system for business search queries. Extract specific entities from user queries.

Extract:
- Locations: Cities, landmarks, areas, neighborhoods (e.g., "Mumbai", "near Central Park", "downtown")
- Business names: Specific business names if mentioned (e.g., "Starbucks", "McDonald's")
- Times: Time-related expressions (e.g., "now", "tonight", "open now", "today", "this weekend")
- Prices: Price-related terms (e.g., "budget", "cheap", "expensive", "affordable", "luxury")
- Features: Business features/amenities (e.g., "pet-friendly", "wifi", "parking", "outdoor seating", "delivery")

Return your response as a JSON object with arrays for each entity type and a confidence score (0.0 to 1.0).`;

  const prompt = `Extract entities from this query: "${query}"

Return only a JSON object in this format:
{
  "locations": ["location1", "location2"],
  "businessNames": ["name1", "name2"],
  "times": ["now", "tonight"],
  "prices": ["budget", "cheap"],
  "features": ["pet-friendly", "wifi"],
  "confidence": 0.0-1.0
}`;

  try {
    const response = await invokeNLPWithErrorHandling({
      prompt,
      systemPrompt,
      maxTokens: 300,
      temperature: 0.2,
    });

    // Parse JSON response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const confidence = Math.max(0, Math.min(1, parseFloat(parsed.confidence) || 0.5));

        // Normalize locations
        const locations = Array.isArray(parsed.locations)
          ? parsed.locations
              .map((loc: string) => {
                const normalized = normalizeLocationName(loc);
                return normalized || loc.trim();
              })
              .filter((loc: string) => loc.length > 0)
          : [];

        // Normalize business names
        const businessNames = Array.isArray(parsed.businessNames)
          ? parsed.businessNames
              .map((name: string) => {
                const normalized = normalizeBusinessName(name);
                return normalized || name.trim();
              })
              .filter((name: string) => name.length > 0)
          : [];

        // Normalize times (keep as-is, just trim)
        const times = Array.isArray(parsed.times)
          ? parsed.times.map((t: string) => t.trim().toLowerCase()).filter((t: string) => t.length > 0)
          : [];

        // Normalize prices (map to price range terms)
        const prices = Array.isArray(parsed.prices)
          ? parsed.prices
              .map((price: string) => {
                const normalized = normalizePriceRange(price);
                return normalized || price.trim().toLowerCase();
              })
              .filter((price: string) => price.length > 0)
          : [];

        // Normalize features (keep as-is, just normalize case)
        const features = Array.isArray(parsed.features)
          ? parsed.features.map((f: string) => f.trim().toLowerCase()).filter((f: string) => f.length > 0)
          : [];

        const result: EntityResult = {
          locations: Array.from(new Set(locations)),
          businessNames: Array.from(new Set(businessNames)),
          times: Array.from(new Set(times)),
          prices: Array.from(new Set(prices)),
          features: Array.from(new Set(features)),
          confidence,
        };

        // Cache result
        entityCache.set(normalizedQuery, {
          entities: result,
          timestamp: Date.now(),
        });

        return result;
      } catch (parseError) {
        console.error(`[NLP] Failed to parse entity response: ${parseError}`);
      }
    }
  } catch (error: any) {
    console.error(`[NLP] Entity extraction error: ${error.message}`);
    // Return default on error
    const defaultResult: EntityResult = {
      locations: [],
      businessNames: [],
      times: [],
      prices: [],
      features: [],
      confidence: 0.0,
    };
    entityCache.set(normalizedQuery, {
      entities: defaultResult,
      timestamp: Date.now(),
    });
    return defaultResult;
  }

  // Fallback if parsing fails
  return {
    locations: [],
    businessNames: [],
    times: [],
    prices: [],
    features: [],
    confidence: 0.0,
  };
}

// Combined analysis cache (in-memory)
const analysisCache = new Map<string, { analysis: QueryAnalysis; timestamp: number }>();
const ANALYSIS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Query analysis result type
export interface QueryAnalysis {
  intent: {
    intent: 'search' | 'book' | 'compare' | 'review' | 'directions' | 'unknown';
    confidence: number;
  };
  category: {
    category: string;
    confidence: number;
    alternatives: string[];
  };
  entities: EntityResult;
  confidence: number; // Overall confidence
}

/**
 * Analyze query with all NLP tasks
 * Runs intent detection, category classification, and entity extraction in parallel
 * 
 * @param query - User search query
 * @returns Complete query analysis
 */
export async function analyzeQuery(query: string): Promise<QueryAnalysis> {
  // Basic validation
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return {
      intent: { intent: "search", confidence: 0.5 },
      category: { category: "general", confidence: 0.0, alternatives: [] },
      entities: {
        locations: [],
        businessNames: [],
        times: [],
        prices: [],
        features: [],
        confidence: 0.0,
      },
      confidence: 0.0,
    };
  }

  const normalizedQuery = query.trim().toLowerCase();

  // Check cache
  const cached = analysisCache.get(normalizedQuery);
  if (cached && Date.now() - cached.timestamp < ANALYSIS_CACHE_TTL) {
    return cached.analysis;
  }

  try {
    // Run all NLP tasks in parallel with error handling
    const [intentResult, categoryResult, entityResult] = await Promise.allSettled([
      detectIntent(query),
      classifyCategory(query),
      extractEntities(query),
    ]);

    // Extract results (with fallbacks for failures)
    const intent = intentResult.status === "fulfilled"
      ? intentResult.value
      : { intent: "search" as const, confidence: 0.5 };

    const category = categoryResult.status === "fulfilled"
      ? categoryResult.value
      : { category: "general", confidence: 0.0, alternatives: [] };

    const entities = entityResult.status === "fulfilled"
      ? entityResult.value
      : {
          locations: [],
          businessNames: [],
          times: [],
          prices: [],
          features: [],
          confidence: 0.0,
        };

    // Calculate overall confidence (weighted average)
    const intentWeight = 0.3;
    const categoryWeight = 0.4;
    const entityWeight = 0.3;

    const overallConfidence =
      intent.confidence * intentWeight +
      category.confidence * categoryWeight +
      entities.confidence * entityWeight;

    const analysis: QueryAnalysis = {
      intent,
      category,
      entities,
      confidence: overallConfidence,
    };

    // Cache result
    analysisCache.set(normalizedQuery, {
      analysis,
      timestamp: Date.now(),
    });

    return analysis;
  } catch (error: any) {
    console.error(`[NLP] Query analysis error: ${error.message}`);
    // Return default on error
    const defaultAnalysis: QueryAnalysis = {
      intent: { intent: "search", confidence: 0.5 },
      category: { category: "general", confidence: 0.0, alternatives: [] },
      entities: {
        locations: [],
        businessNames: [],
        times: [],
        prices: [],
        features: [],
        confidence: 0.0,
      },
      confidence: 0.0,
    };
    analysisCache.set(normalizedQuery, {
      analysis: defaultAnalysis,
      timestamp: Date.now(),
    });
    return defaultAnalysis;
  }
}

// Enhanced error handling wrapper for invokeNLP
const NLP_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Invoke NLP with timeout, rate limiting, and error handling
 * Wraps the base invokeNLP function with comprehensive error handling
 */
async function invokeNLPWithErrorHandling(request: NLPRequest): Promise<NLPResponse> {
  // Use fallback wrapper for error handling
  return await withFallback(
    async () => {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("NLP request timeout")), NLP_TIMEOUT_MS);
      });

      // Race between NLP call and timeout
      try {
        // Apply rate limiting
        return await withRateLimit(async () => {
          return await Promise.race([
            invokeNLP(request),
            timeoutPromise,
          ]);
        });
      } catch (error: any) {
        // Handle timeout
        if (error.message === "NLP request timeout") {
          console.error(`[NLP] Request timeout after ${NLP_TIMEOUT_MS}ms`);
          throw new Error("NLP request timeout");
        }

        // Handle rate limiting with retry
        if (isRetryableError(error) && (error.code === "ThrottlingException" || error.message?.toLowerCase().includes("rate limit"))) {
          console.warn(`[NLP] Rate limit hit, retrying with backoff...`);
          try {
            return await retryWithBackoff(async () => {
              return await withRateLimit(() => invokeNLP(request));
            }, 3, 1000);
          } catch (retryError: any) {
            console.error(`[NLP] Retry failed: ${retryError.message}`);
            throw new Error("NLP rate limit exceeded");
          }
        }

        // Handle API errors
        if (error.code === "AccessDeniedException" || error.code === "ValidationException") {
          console.error(`[NLP] API error: ${error.code} - ${error.message}`);
          throw new Error(`NLP API error: ${error.message}`);
        }

        // Re-throw other errors
        throw error;
      }
    },
    // Fallback: return empty response
    async () => {
      console.warn(`[NLP] Using fallback for request`);
      return {
        text: "",
        usage: undefined,
      };
    },
    { logError: true }
  );
}

