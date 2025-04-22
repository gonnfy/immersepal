import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { Prisma } from '@prisma/client'; // Using local interface instead
import { AppError, ERROR_CODES } from '@/lib/errors'; // Import base error type and ERROR_CODES
// import { useLocale } from 'next-intl'; // Removed: No longer needed for API calls
// import { i18nConfig } from '@/i18n/routing'; // Not needed for useLocale
import { CardUpdatePayload } from '@/lib/zod'; // Import the payload type
// Define a simple interface for the Card data matching the expected API response
export interface Card {
  id: string;
  front: string;
  back: string;
  deckId: string;
  interval: number;
  easeFactor: number;
  nextReviewAt: string; // Or Date, adjust based on API serialization
  createdAt: string;    // Or Date
  updatedAt: string;    // Or Date
  // Add other optional fields from prisma/schema.prisma if needed
  // frontAudioUrl?: string | null;
  // backAudioUrl?: string | null;
  // explanation?: string | null;
  // translation?: string | null;
}

// Define the type for the data needed to create a card
type CreateCardData = {
  front: string;
  back: string;
};

// Define the type for the mutation context, including the deckId
type CreateCardContext = {
  deckId: string;
};

// API call function
const createCardApi = async (
  { deckId }: CreateCardContext,
  newData: CreateCardData
): Promise<Card> => {
  const response = await fetch(`/api/decks/${deckId}/cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    // Throw an AppError or a more specific error based on errorData
    throw new AppError(
      errorData.message || 'Failed to create card',
      response.status,
      errorData.errorCode || 'API_ERROR',
      errorData.details
    );
  }

  return response.json();
};

/**
 * Custom hook for creating a new card within a specific deck.
 *
 * @param deckId - The ID of the deck to add the card to.
 * @param options - Optional TanStack Query mutation options (e.g., onSuccess, onError).
 */
export const useCreateCard = (
  deckId: string,
  options?: {
    onSuccess?: (data: Card) => void;
    onError?: (error: AppError) => void;
  }
) => {
  const queryClient = useQueryClient();
  // const locale = useLocale(); // Removed: No longer needed for API calls

  return useMutation<Card, AppError, CreateCardData>({
    mutationFn: (newData) => createCardApi({ deckId }, newData),
    onSuccess: (data) => {
      // Invalidate the query for the list of cards in this deck
      // Adjust the query key based on how you fetch cards (e.g., in useCards hook)
      queryClient.invalidateQueries({ queryKey: ['cards', deckId] });
      console.log('Card created successfully:', data);
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('Error creating card:', error);
      options?.onError?.(error);
      // Handle error display in the UI (e.g., show a toast notification)
    },
  });
};

// Add other card mutation hooks here (e.g., useUpdateCard, useDeleteCard)
// --- Delete Card ---

// API call function for deleting a card
const deleteCardApi = async (
  deckId: string,
  cardId: string
): Promise<void> => {
  const response = await fetch(`/api/decks/${deckId}/cards/${cardId}`, {
    method: 'DELETE',
  });

  // 204 No Content is a success status for DELETE
  if (!response.ok && response.status !== 204) {
    let errorData = { message: 'Failed to delete card', errorCode: 'API_ERROR', details: null };
    try {
        // Attempt to parse error details if available
        errorData = await response.json();
    } catch (e) {
        // Ignore JSON parse error if body is empty or not JSON
        console.warn("Could not parse error response body for DELETE card request.");
    }
    throw new AppError(
      errorData.message || 'Failed to delete card',
      response.status,
      // Use a valid ErrorCode as fallback
      (ERROR_CODES[errorData.errorCode as keyof typeof ERROR_CODES] || ERROR_CODES.INTERNAL_SERVER_ERROR),
      errorData.details
    );
  }

  // No content to return on successful deletion (204)
};

/**
 * Custom hook for deleting a card from a specific deck.
 *
 * @param deckId - The ID of the deck the card belongs to.
 * @param options - Optional TanStack Query mutation options (e.g., onSuccess, onError).
 */
export const useDeleteCard = (
  deckId: string,
  options?: {
    onSuccess?: (cardId: string) => void; // Pass cardId to onSuccess for potential UI updates
    onError?: (error: AppError, cardId: string) => void;
  }
) => {
  const queryClient = useQueryClient();
  // const locale = useLocale(); // Removed: No longer needed for API calls

  return useMutation<void, AppError, { cardId: string }>({ // Takes { cardId } as input
    mutationFn: ({ cardId }) => deleteCardApi(deckId, cardId),
    onSuccess: (_, variables) => { // First arg is data (void), second is variables ({ cardId })
      // Invalidate the query for the list of cards in this deck
      queryClient.invalidateQueries({ queryKey: ['cards', deckId] });
      console.log(`Card ${variables.cardId} deleted successfully from deck ${deckId}`);
      options?.onSuccess?.(variables.cardId);
    },
    onError: (error, variables) => {
      console.error(`Error deleting card ${variables.cardId}:`, error);
      options?.onError?.(error, variables.cardId);
      // Handle error display in the UI
    },
  });
};

// --- Update Card API Call ---

// Define or import the Card type (use local if needed, align with API response)
// Using local definition from lines 8-23

const updateCardApi = async (
  deckId: string,
  cardId: string,
  updateData: CardUpdatePayload // Use the imported type
): Promise<Card> => { // Should return the updated Card object on success
  if (!deckId || !cardId) {
      throw new Error('Deck ID and Card ID are required for updating a card.');
  }

  const apiUrl = `/api/decks/${deckId}/cards/${cardId}`;
  console.log(`[updateCardApi] Calling PUT ${apiUrl}`); // For debugging

  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      // Include other necessary headers like Authorization if needed, though usually handled by cookies/middleware
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    // Attempt to parse error details from the response body
    let errorBody = { message: `Failed to update card (Status: ${response.status})`, errorCode: 'API_ERROR', details: null };
    try {
        // Check content type before parsing
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
             errorBody = await response.json();
        }
    } catch (e) {
      console.warn("[updateCardApi] Could not parse error response body:", e);
      // Keep default error message if parsing fails
    }

    // Throw an AppError using details from the parsed body or defaults
    throw new AppError(
      errorBody.message || `Failed to update card (Status: ${response.status})`,
      response.status,
      // Use the errorCode from the response if available and valid, otherwise default
      (ERROR_CODES[errorBody.errorCode as keyof typeof ERROR_CODES] || ERROR_CODES.INTERNAL_SERVER_ERROR),
      errorBody.details
    );
  }

  // If response is OK (e.g., 200), parse and return the updated card data
  return response.json() as Promise<Card>; // Type assertion based on expected API success response
};


/**
 * Custom hook for updating an existing card within a specific deck.
 * Handles API interaction, loading state, errors, and cache invalidation.
 *
 * @param deckId - The ID of the deck the card belongs to. This is used for cache invalidation.
 * @param options - Optional TanStack Query mutation options like onSuccess and onError callbacks.
 */
export const useUpdateCard = (
  deckId: string, // Required for cache invalidation
  options?: {
    /** Callback function fired upon successful mutation. Receives the updated card data and original variables. */
    onSuccess?: (updatedCard: Card, variables: { cardId: string; data: CardUpdatePayload }) => void;
    /** Callback function fired upon mutation error. Receives the error and original variables. */
    onError?: (error: AppError, variables: { cardId: string; data: CardUpdatePayload }) => void;
    /** Add other standard useMutation options if needed (e.g., onMutate, onSettled) */
  }
) => {
  const queryClient = useQueryClient();
  // const locale = useLocale(); // Removed: No longer needed for API calls

  // Define the mutation using useMutation
  return useMutation<
    Card,                                     // Type returned by mutationFn on success (updated card)
    AppError,                                 // Type of error thrown on failure
    { cardId: string; data: CardUpdatePayload } // Type of variables passed to the mutate function
  >({
    // The core mutation function that performs the asynchronous task
    mutationFn: ({ cardId, data }) => updateCardApi(deckId, cardId, data),

    // Function called after the mutation succeeds
    onSuccess: (updatedCard, variables) => {
      console.log(`Card ${variables.cardId} updated successfully. Invalidating cache for deck ${deckId}.`);

      // Invalidate the query cache for the list of cards in this deck to trigger a refetch.
      // Ensure the query key matches the one used in the useCards hook.
      queryClient.invalidateQueries({ queryKey: ['cards', deckId] });

      // Call the user-provided onSuccess callback, if defined
      options?.onSuccess?.(updatedCard, variables);
    },

    // Function called after the mutation fails
    onError: (error, variables) => {
      console.error(`Error updating card ${variables.cardId}:`, error);

      // Call the user-provided onError callback, if defined
      options?.onError?.(error, variables);

      // Note: UI-level error display (e.g., toasts) should typically be handled
      // in the component calling this hook, using the error state returned by useMutation.
    },

    // Include other options passed by the user if necessary
    // ...options, // This would spread other options like onMutate, onSettled, etc.
  });
};