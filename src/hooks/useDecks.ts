// src/hooks/useDecks.ts (Pagination 対応版)
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
// ★ Import new types ★
import { DeckApiResponse, ApiErrorResponse, PaginatedDecksResponse, PaginationMeta } from '../types/api.types';

// ★ Define options type ★
interface UseDecksOptions {
  offset?: number;
  limit?: number;
}

// ★ Define return type (optional but recommended) ★
interface UseDecksReturn {
  decks: DeckApiResponse[];
  pagination: PaginationMeta | null;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
}

// ★ Renamed and modified fetch function to handle pagination ★
const fetchPaginatedDecks = async (userId: string, offset: number, limit: number): Promise<PaginatedDecksResponse> => {
  // Construct URL with pagination parameters
  const params = new URLSearchParams({
    offset: offset.toString(),
    limit: limit.toString(),
  });
  const apiUrl = `/api/decks?${params.toString()}`; // No locale prefix needed
  console.log(`[useDecks fetcher] Fetching decks from: ${apiUrl}`);

  const response = await fetch(apiUrl);

  if (!response.ok) {
    let errorData: { message?: string } = { message: `Failed to fetch decks. Status: ${response.status}` };
    try {
      if (response.headers.get('content-length') !== '0' && response.body) {
        const parsedError: ApiErrorResponse | { message: string } = await response.json();
        errorData.message = parsedError.message || errorData.message;
      }
    } catch (e) {
      console.warn('Could not parse error response body for fetchPaginatedDecks:', e);
    }
    throw new Error(errorData.message);
  }

  // ★ Return the paginated response structure ★
  return response.json() as Promise<PaginatedDecksResponse>;
};

/**
 * Custom hook to fetch a paginated list of decks for the authenticated user.
 */
// ★ Update hook signature and add return type ★
export const useDecks = (options: UseDecksOptions = {}): UseDecksReturn => {
  // ★ Set default pagination values ★
  const { offset = 0, limit = 10 } = options;
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;

  // ★ Update useQuery with new types and parameters ★
  const queryResult = useQuery<PaginatedDecksResponse, Error>({ // ★ Update success type ★
    // ★ Include offset and limit in queryKey ★
    queryKey: ['decks', userId, { offset, limit }],

    // ★ Call the paginated fetch function ★
    queryFn: () => {
      if (!userId) {
        // Should be handled by 'enabled' but good practice to check
        return Promise.reject(new Error("User not authenticated"));
      }
      return fetchPaginatedDecks(userId, offset, limit); // ★ Pass offset and limit ★
    },

    // Enable query only when userId is available and auth check is done
    enabled: !!userId && !isAuthLoading,

    // Keep existing options like staleTime if needed
    // staleTime: 5 * 60 * 1000,
  });

  // ★ Update the return structure ★
  return {
    // Extract decks array from the response data
    decks: queryResult.data?.data ?? [],
    // Extract pagination metadata
    pagination: queryResult.data?.pagination ?? null,
    // Combine loading states
    isLoading: queryResult.isLoading || isAuthLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error,
  };
};