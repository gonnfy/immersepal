// src/hooks/useDeckMutations.ts (API パス修正適用版)
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { AuthError } from '@supabase/supabase-js';
// ★ 必要な型をインポート。パスが /types/api.types.ts に変更されているか確認 ★
import { ApiErrorResponse, DeckApiResponse, DeckCreatePayload } from '../types';

// ★ ApiError クラスの定義 (重複定義を避けるため、lib/errors.ts など共通の場所に移動することも検討) ★
// もし lib/errors.ts に同等のものがあればそちらをインポート
export class ApiError extends Error {
  status: number;
  details?: unknown; // Changed from any

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// --- Create Deck ---
// ★ locale 引数を削除 ★
const createDeckApi = async ({ deckData }: { deckData: DeckCreatePayload }): Promise<DeckApiResponse> => {
  const apiUrl = `/api/decks`; // ★ locale なし ★
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(deckData),
  });

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({ message: 'Failed to parse error response', error: 'PARSE_ERROR' })); // Ensure error property exists
    throw new ApiError(errorData.message || `HTTP error! status: ${response.status}`, response.status, errorData.details);
  }
  return response.json();
};

export const useCreateDeck = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  // const params = useParams(); // ★ 不要なら削除 ★
  // const locale = typeof params?.locale === 'string' ? params.locale : 'en'; // ★ 不要なら削除 ★

  const mutation = useMutation<DeckApiResponse, ApiError | AuthError, DeckCreatePayload>({
    // ★ locale 引数を削除 ★
    mutationFn: (deckData: DeckCreatePayload) => createDeckApi({ deckData }),
    onSuccess: (data) => {
      // ★ queryKey から locale を削除 (データが locale に依存しない場合) ★
      queryClient.invalidateQueries({ queryKey: ['decks', userId] });
      console.log('Deck created successfully:', data);
    },
    onError: (error) => {
      console.error('Error creating deck:', error);
    },
  });

  return mutation;
};


// --- Delete Deck ---
// ★ locale 引数を削除 ★
const deleteDeckApi = async ({ deckId }: { deckId: string }): Promise<void> => {
  const apiUrl = `/api/decks/${deckId}`; // ★ locale なし ★
  const response = await fetch(apiUrl, {
    method: 'DELETE',
  });
  if (response.status !== 204) {
     const errorData: ApiErrorResponse = await response.json().catch(() => ({ message: 'Failed to parse error response', error: 'PARSE_ERROR' }));
     throw new ApiError(errorData.message || `HTTP error! status: ${response.status}`, response.status, errorData.details);
  }
};


export const useDeleteDeck = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  // const params = useParams(); // ★ 不要なら削除 ★
  // const locale = typeof params?.locale === 'string' ? params.locale : 'en'; // ★ 不要なら削除 ★

  const mutation = useMutation<void, ApiError | AuthError, { deckId: string }>({
    // ★ locale 引数を削除 ★
    mutationFn: ({ deckId }: { deckId: string }) => deleteDeckApi({ deckId }),
    onSuccess: (_, variables) => {
      // ★ queryKey から locale を削除 ★
      queryClient.invalidateQueries({ queryKey: ['decks', userId] });
      console.log(`Deck ${variables.deckId} deleted successfully`);
    },
    onError: (error, variables) => {
      console.error(`Error deleting deck ${variables.deckId}:`, error);
    },
  });

  return mutation;
};

// --- Update Deck (もし実装する場合も同様に locale を削除) ---