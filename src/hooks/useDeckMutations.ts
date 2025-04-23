// src/hooks/useDeckMutations.ts (API パス修正適用版)
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { AuthError } from '@supabase/supabase-js';
// ★ 必要な型をインポート。パスが /types/api.types.ts に変更されているか確認 ★
import { ApiErrorResponse, DeckApiResponse, DeckCreatePayload, DeckUpdatePayload } from '../types'; // DeckUpdatePayload をインポート

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

// --- Update Deck API Call ---
const updateDeckApi = async ({ deckId, data }: { deckId: string; data: DeckUpdatePayload }): Promise<DeckApiResponse> => {
  const apiUrl = `/api/decks/${deckId}`; // locale なし
  console.log(`[updateDeckApi] Calling PUT ${apiUrl}`);

  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      // 必要に応じて他のヘッダー (Authorization など)
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    // ★ エラー時は ApiError を throw する ★
    const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}` }));
    const message = typeof errorData.message === 'string' ? errorData.message : `HTTP error! status: ${response.status}`;
    // 以前定義した ApiError クラスを使う
    throw new ApiError(message, response.status, errorData.details);
  }
  return response.json(); // 更新後の DeckApiResponse を返す
};


/**
 * Custom hook for updating an existing deck.
 */
export const useUpdateDeck = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Get user ID for cache invalidation key
  const userId = user?.id;

  const mutation = useMutation<
    DeckApiResponse,                      // onSuccess に渡されるデータ型 (更新後のデッキ)
    ApiError | AuthError,                 // onError に渡されるエラー型
    { deckId: string; data: DeckUpdatePayload } // mutate に渡す引数の型
  >({
    mutationFn: updateDeckApi, // 作成した API 呼び出し関数を指定
    onSuccess: (updatedDeck, variables) => {
      console.log(`Deck ${variables.deckId} updated successfully:`, updatedDeck);

      // Invalidate queries to refetch data
      // 1. デッキ一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['decks', userId] });

      // 2. (推奨) 個別デッキのキャッシュも無効化 (もしあれば)
      queryClient.invalidateQueries({ queryKey: ['deck', variables.deckId] });

      // (任意) キャッシュを直接更新して即時反映させる場合
      // queryClient.setQueryData(['deck', variables.deckId], updatedDeck);
      // queryClient.setQueryData(['decks', userId], (oldData: DeckApiResponse[] | undefined) =>
      //   oldData ? oldData.map(deck => deck.id === variables.deckId ? updatedDeck : deck) : []
      // );
    },
    onError: (error, variables) => {
      console.error(`Error updating deck ${variables.deckId}:`, error);
      // UI側で error.message などを表示することを想定
    },
  });

  return mutation;
};