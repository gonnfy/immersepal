// src/hooks/useDecks.ts
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
// Assuming types are exported correctly from api.types
import {
  DeckApiResponse,
  ApiErrorResponse,
  PaginatedDecksResponse,
  PaginationMeta,
} from '../types/api.types';

interface UseDecksOptions {
  offset?: number;
  limit?: number;
}

interface UseDecksReturn {
  decks: DeckApiResponse[];
  pagination: PaginationMeta | null;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null; // Keep error type as Error for simplicity from useQuery
}

const fetchPaginatedDecks = async (
  userId: string,
  offset: number,
  limit: number
): Promise<PaginatedDecksResponse> => {
  const params = new URLSearchParams({
    offset: offset.toString(),
    limit: limit.toString(),
  });
  const apiUrl = `/api/decks?${params.toString()}`;
  console.log(`[useDecks fetcher] Fetching decks from: ${apiUrl}`);

  const response = await fetch(apiUrl);

  if (!response.ok) {
    // ★★★ Fixed let -> const ★★★
    const errorData: { message?: string } = {
      message: `Failed to fetch decks. Status: ${response.status}`,
    };
    try {
      if (response.headers.get('content-length') !== '0' && response.body) {
        const parsedError: ApiErrorResponse | { message: string } =
          await response.json();
        // Only assign if parsedError has a message property
        if (parsedError && typeof parsedError.message === 'string') {
          errorData.message = parsedError.message;
        }
      }
    } catch (e) {
      console.warn(
        'Could not parse error response body for fetchPaginatedDecks:',
        e
      );
    }
    throw new Error(errorData.message);
  }
  return response.json() as Promise<PaginatedDecksResponse>;
};

export const useDecks = (options: UseDecksOptions = {}): UseDecksReturn => {
  const { offset = 0, limit = 10 } = options;
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;

  // Specify Error type for useQuery to match the catch block
  const queryResult = useQuery<PaginatedDecksResponse, Error>({
    queryKey: ['decks', userId, { offset, limit }],
    queryFn: () => {
      if (!userId) return Promise.reject(new Error('User not authenticated'));
      return fetchPaginatedDecks(userId, offset, limit);
    },
    enabled: !!userId && !isAuthLoading,
  });

  return {
    decks: queryResult.data?.data ?? [],
    pagination: queryResult.data?.pagination ?? null,
    isLoading: queryResult.isLoading || isAuthLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error, // This will be of type Error | null
  };
};
