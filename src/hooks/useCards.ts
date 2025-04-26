// src/hooks/useCards.ts (Updated for aiContents and explicit return type)

import { useQuery } from '@tanstack/react-query';
import { AppError, isAppError } from '@/lib/errors';
// Import types needed for pagination and the card data structure (including aiContents)
import {
  type PaginatedCardsResponse, // Contains CardApiResponse[] with aiContents
  type CardApiResponse,        // Card type including aiContents
  type PaginationMeta          // Pagination metadata type
} from '@/types/api.types';

// Interface for potential error object structure from the API
// Consider using ApiErrorResponse from api.types.ts if it matches the actual error structure
interface ApiErrorLike {
    message?: string;
    errorCode?: string; // Assuming AppError might add this
    details?: unknown;
}

// --- API function to fetch paginated cards ---
// Logic remains largely the same, types are updated via imports
const fetchPaginatedCards = async (deckId: string, offset: number, limit: number): Promise<PaginatedCardsResponse> => {
    if (!deckId) {
        // This check is important, although 'enabled' should prevent calls without deckId
        throw new Error('Deck ID is required to fetch cards.');
    }

    // Construct URL with pagination query parameters
    const params = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
    });
    const apiUrl = `/api/decks/${deckId}/cards?${params.toString()}`; // Use locale-independent path
    console.log(`[useCards fetcher] Fetching cards from: ${apiUrl}`);

    const response = await fetch(apiUrl);

    if (!response.ok) {
        // --- Error Handling (Existing logic) ---
        let errorData: ApiErrorLike = { message: `Failed to fetch cards for deck ${deckId}. Status: ${response.status}` };
        try {
            const contentType = response.headers.get('content-type');
            if (response.body && contentType && contentType.includes('application/json')) {
                // Try to parse JSON error, potentially matching ApiErrorResponse or AppError structure
                errorData = await response.json();
            } else if (response.body) {
                 const textResponse = await response.text();
                 console.warn(`[useCards fetcher] Received non-JSON error response: ${textResponse.substring(0,100)}`);
                 // Ensure errorData is an object before assigning message
                 if (typeof errorData === 'object' && errorData !== null) {
                    errorData.message = textResponse.substring(0,100); // Use part of the text as the message
                 }
            }
        } catch (e) {
            console.warn('[useCards fetcher] Could not parse error response body:', e);
        }

        // Throw specific AppError if possible, otherwise a generic Error
        if (isAppError(errorData)) {
           // If errorData matches AppError structure (checked by type guard)
           throw new AppError(
               errorData.message, // Guaranteed string by AppError
               response.status,
               errorData.errorCode, // Guaranteed ErrorCode by AppError
               errorData.details
           );
        } else {
           // Handle cases where errorData is not a structured AppError
           const errorMessage = (typeof errorData === 'object' && errorData !== null && 'message' in errorData && typeof errorData.message === 'string')
                                ? errorData.message // Use message if available
                                : `Failed to fetch cards for deck ${deckId}. Status: ${response.status}`; // Fallback message
           // Consider throwing AppError with a default code if appropriate
           // throw new AppError(errorMessage, response.status, 'INTERNAL_SERVER_ERROR');
           throw new Error(errorMessage); // Stick to generic Error for now
        }
        // --- End Error Handling ---
    }

    // Assume the API returns the PaginatedCardsResponse structure directly
    const data: PaginatedCardsResponse = await response.json();
    // Optional: Add validation here if needed (e.g., using Zod)
    if (!data || !Array.isArray(data.data) || !data.pagination) {
        console.error('[useCards fetcher] Invalid response format received:', data);
        throw new Error('Invalid response format from cards API.');
    }
    return data;
};


// --- useCards Custom Hook ---

// Define options for the hook
interface UseCardsOptions {
  offset?: number;
  limit?: number;
}

// ↓↓↓ Define the explicit return type for the hook ↓↓↓
interface UseCardsReturn {
  /** Array of cards. Each card object conforms to CardApiResponse, including the `aiContents` array. */
  cards: CardApiResponse[];
  /** Pagination metadata, or null if no data. */
  pagination: PaginationMeta | null;
  /** True if the initial query is loading (no data yet). */
  isLoading: boolean;
  /** True if the query is fetching, including background fetching and refetching. */
  isFetching: boolean;
  /** Error object if the query failed, otherwise null. */
  error: Error | AppError | null;
}

// Update hook signature to accept pagination options and return the defined type
export const useCards = (deckId: string | null, options: UseCardsOptions = {}): UseCardsReturn => {
    // Get pagination options with default values
    const { offset = 0, limit = 10 } = options;

    // Use React Query's useQuery hook
    // Type arguments use the imported, updated types
    const queryResult = useQuery<PaginatedCardsResponse, Error | AppError>({
        // Update queryKey to include pagination parameters for unique caching per page
        queryKey: ['cards', deckId, { offset, limit }],
        // Update queryFn to call the paginated fetcher
        queryFn: () => {
            // Double-check deckId existence (though 'enabled' handles this)
            if (!deckId) {
                // Should not happen if 'enabled' is working, return rejected promise
                // Use AppError for consistency if desired
                return Promise.reject(new AppError("Deck ID is required.", 400, 'VALIDATION_ERROR'));
            }
            // Call the updated fetcher with deckId and pagination params
            return fetchPaginatedCards(deckId, offset, limit);
        },
        // Ensure the query only runs when a valid deckId is provided
        enabled: !!deckId,

        // Optional: Keep previous data while fetching new page for smoother UX
        // keepPreviousData: true,
        // Optional: Define staleTime if needed
        // staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Return the structured data conforming to UseCardsReturn
    return {
        // Access the nested 'data' array within the API response. Elements are CardApiResponse.
        cards: queryResult.data?.data ?? [], // Default to empty array
        // Access the 'pagination' object from the API response
        pagination: queryResult.data?.pagination ?? null, // Default to null
        // Pass through React Query status flags
        isLoading: queryResult.isLoading,
        isFetching: queryResult.isFetching,
        error: queryResult.error, // Pass through any error object
    };
};

// ↓↓↓ Re-export CardApiResponse as Card with updated JSDoc ↓↓↓
/**
 * Re-exporting CardApiResponse as Card for component usage.
 * This Card type includes the `aiContents` array, reflecting the latest API structure.
 */
export type { CardApiResponse as Card };