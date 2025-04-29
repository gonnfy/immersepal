// src/hooks/useCardMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppError, ERROR_CODES } from '@/lib/errors';
// import { useLocale } from 'next-intl'; // Removed
import { type CardUpdatePayload } from '@/lib/zod';

// Define or import Card type
export interface Card {
  id: string;
  front: string;
  back: string;
  deckId: string;
  interval: number;
  easeFactor: number;
  nextReviewAt: string | Date; // Use string if API returns string, Date if objects are preferred
  createdAt: string | Date;
  updatedAt: string | Date;
  explanation?: string | null;
  translation?: string | null;
}

type CreateCardData = {
  front: string;
  back: string;
};

type CreateCardContext = {
  deckId: string;
};

// --- Create Card API Call ---
const createCardApi = async (
  { deckId }: CreateCardContext,
  newData: CreateCardData
): Promise<Card> => {
  const apiUrl = `/api/decks/${deckId}/cards`; // locale-independent
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new AppError(
      errorData.message || 'Failed to create card',
      response.status,
      errorData.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      errorData.details
    );
  }
  return response.json();
};

// --- useCreateCard Hook ---
export const useCreateCard = (
  deckId: string,
  options?: {
    onSuccess?: (data: Card) => void;
    onError?: (error: AppError) => void;
  }
) => {
  const queryClient = useQueryClient();
  return useMutation<Card, AppError, CreateCardData>({
    mutationFn: (newData) => createCardApi({ deckId }, newData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cards', deckId] });
      console.log('Card created successfully:', data);
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('Error creating card:', error);
      options?.onError?.(error);
    },
  });
};

// --- Delete Card API Call ---
const deleteCardApi = async (
  deckId: string,
  cardId: string
): Promise<void> => {
  const apiUrl = `/api/decks/${deckId}/cards/${cardId}`; // locale-independent
  const response = await fetch(apiUrl, { method: 'DELETE' });
  if (!response.ok && response.status !== 204) {
    let errorData = { message: 'Failed to delete card', errorCode: 'API_ERROR', details: null };
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      }
      
    } catch (_e) { // _e is unused
      console.warn("Could not parse error response body for DELETE card request.");
    }
    throw new AppError(
      errorData.message || 'Failed to delete card',
      response.status,
      (ERROR_CODES[errorData.errorCode as keyof typeof ERROR_CODES] || ERROR_CODES.INTERNAL_SERVER_ERROR),
      errorData.details
    );
  }
};

// --- useDeleteCard Hook ---
export const useDeleteCard = (
  deckId: string,
  options?: {
    onSuccess?: (cardId: string) => void;
    onError?: (error: AppError, cardId: string) => void;
  }
) => {
  const queryClient = useQueryClient();
  return useMutation<void, AppError, { cardId: string }>({
    mutationFn: ({ cardId }) => deleteCardApi(deckId, cardId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cards', deckId] });
      console.log(`Card ${variables.cardId} deleted successfully from deck ${deckId}`);
      options?.onSuccess?.(variables.cardId);
    },
    onError: (error, variables) => {
      console.error(`Error deleting card ${variables.cardId}:`, error);
      options?.onError?.(error, variables.cardId);
    },
  });
};

// --- Update Card API Call ---
const updateCardApi = async (
  deckId: string,
  cardId: string,
  updateData: CardUpdatePayload
): Promise<Card> => {
  const apiUrl = `/api/decks/${deckId}/cards/${cardId}`; // locale-independent
  console.log(`[updateCardApi] Calling PUT ${apiUrl}`);
  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });
  if (!response.ok) {
    let errorData = { message: `Failed to update card (Status: ${response.status})`, errorCode: 'API_ERROR', details: null };
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
           errorData = await response.json();
      }
    } catch (e) {
      console.warn("[updateCardApi] Could not parse error response body:", e);
    }
    throw new AppError(
      errorData.message,
      response.status,
      (ERROR_CODES[errorData.errorCode as keyof typeof ERROR_CODES] || ERROR_CODES.INTERNAL_SERVER_ERROR),
      errorData.details
    );
  }
  return response.json();
};

// --- useUpdateCard Hook ---
export const useUpdateCard = (
  deckId: string,
  options?: {
    onSuccess?: (updatedCard: Card, variables: { cardId: string; data: CardUpdatePayload }) => void;
    onError?: (error: AppError, variables: { cardId: string; data: CardUpdatePayload }) => void;
  }
) => {
  const queryClient = useQueryClient();
  return useMutation<
    Card,
    AppError,
    { cardId: string; data: CardUpdatePayload }
  >({
    mutationFn: ({ cardId, data }) => updateCardApi(deckId, cardId, data),
    onSuccess: (updatedCard, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cards', deckId] });
      console.log(`Card ${variables.cardId} updated successfully:`, updatedCard);
      options?.onSuccess?.(updatedCard, variables);
    },
    onError: (error, variables) => {
      console.error(`Error updating card ${variables.cardId}:`, error);
      options?.onError?.(error, variables);
    },
  });
};