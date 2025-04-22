// src/hooks/useDeckMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth'; // Import useAuth
import { AuthError } from '@supabase/supabase-js'; // Import AuthError directly
import { ApiErrorResponse, DeckApiResponse, DeckCreatePayload } from '../types/api.types'; // Use DeckCreatePayload

// Define and export a custom error class for API errors
export class ApiError extends Error { // Add export
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// --- Create Deck ---
const createDeckApi = async ({ deckData }: { deckData: DeckCreatePayload }): Promise<DeckApiResponse> => { // Use DeckCreatePayload
  const apiUrl = `/api/decks`;
  // ★★★ fetch 直前の URL をログ出力 ★★★
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(deckData),
  });

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
    throw new ApiError(errorData.message || `HTTP error! status: ${response.status}`, response.status, errorData.details);
  }
  return response.json();
};

export const useCreateDeck = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const mutation = useMutation<DeckApiResponse, ApiError | AuthError, DeckCreatePayload>({ // Use DeckCreatePayload
    mutationFn: (deckData: DeckCreatePayload) => createDeckApi({ deckData }), // Use DeckCreatePayload
    onSuccess: (data) => {
      // Invalidate and refetch decks query after successful creation
      queryClient.invalidateQueries({ queryKey: ['decks', userId] });
      console.log('Deck created successfully:', data);
    },
    onError: (error) => {
      console.error('Error creating deck:', error);
      // Handle specific errors (e.g., show notification)
    },
  });

  return mutation;
};


// --- Delete Deck ---
const deleteDeckApi = async ({ deckId }: { deckId: string }): Promise<void> => {
  const apiUrl = `/api/decks/${deckId}`;
  // ★★★ fetch 直前の URL をログ出力 ★★★
  const response = await fetch(apiUrl, {
    method: 'DELETE',
  });
  if (response.status !== 204) { // No Content on success
     const errorData: ApiErrorResponse = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
     throw new ApiError(errorData.message || `HTTP error! status: ${response.status}`, response.status, errorData.details);
  }
  // No return needed for 204
};


export const useDeleteDeck = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const mutation = useMutation<void, ApiError | AuthError, { deckId: string }>({
    mutationFn: ({ deckId }: { deckId: string }) => deleteDeckApi({ deckId }),
    onSuccess: (_, variables) => {
      // Invalidate and refetch decks query after successful deletion
      queryClient.invalidateQueries({ queryKey: ['decks', userId] });
      // Optionally remove the specific deck from the cache immediately
      // queryClient.setQueryData(['decks', userId, locale], (oldData: DeckApiResponse[] | undefined) =>
      //   oldData ? oldData.filter(deck => deck.id !== variables.deckId) : []
      // );
      console.log(`Deck ${variables.deckId} deleted successfully`);
    },
    onError: (error, variables) => {
      console.error(`Error deleting deck ${variables.deckId}:`, error);
      // Handle specific errors
    },
  });

  return mutation;
};

// --- Update Deck (Example - Assuming similar structure) ---
// Add useUpdateDeck hook here if needed, ensuring locale is handled similarly.