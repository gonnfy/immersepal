// src/hooks/useSaveAiContent.ts (新規作成)

import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { type ApiErrorResponse, type AICardContentApiResponse } from '@/types/api.types';
import { AiContentType } from '@prisma/client'; // Enum が必要

// mutate 関数に渡すデータの型 (API URLの cardId と body の両方を含む)
export interface SaveAiContentVariables {
  cardId: string;
  contentType: AiContentType;
  language: string;
  content: string; // 保存するテキストまたは GCS パス
}

// API を呼び出す関数
const saveAiContentApi = async (
  variables: SaveAiContentVariables
): Promise<AICardContentApiResponse> => { // 成功時は作成された AICardContent を返す想定
  const { cardId, ...bodyPayload } = variables; // cardId を分離し、残りを body に使う
  const apiUrl = `/api/cards/${cardId}/ai-contents`;
  console.log(`[useSaveAiContent] Calling API: POST ${apiUrl}`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload), // cardId 以外のデータを body に
  });

  if (!response.ok) {
    // エラーハンドリング (useGenerateTts と同様)
    const errorData: ApiErrorResponse = {
        error: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: `Failed to save AI content. Status: ${response.status}`,
        details: null
    };
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
          const parsedError: ApiErrorResponse = await response.json();
          if (parsedError && typeof parsedError.error === 'string') { errorData.error = parsedError.error; }
          errorData.message = parsedError?.message || errorData.message;
          errorData.details = parsedError?.details;
      }
    } catch (_e) { console.warn("[useSaveAiContent] Could not parse error response body:", _e); }

    const isKnownErrorCode = errorData.error && Object.prototype.hasOwnProperty.call(ERROR_CODES, errorData.error);
    const validErrorCode: keyof typeof ERROR_CODES = isKnownErrorCode ? errorData.error as keyof typeof ERROR_CODES : ERROR_CODES.INTERNAL_SERVER_ERROR;
    throw new AppError(errorData.message, response.status, validErrorCode, errorData.details);
  }

  // 成功時 (API は作成された AICardContent を返す想定)
  const result: AICardContentApiResponse = await response.json();
  // 簡単な検証
  if (!result || typeof result.id !== 'string' || !result.contentType || !result.language || typeof result.content !== 'string') {
      console.error('[useSaveAiContent] Invalid success response format:', result);
      throw new AppError('Received invalid response format from save AI content API.', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
  return result;
};

// useMutation のオプションの型 (mutationFn を除く)
type UseSaveAiContentOptions = Omit<
    UseMutationOptions<AICardContentApiResponse, AppError, SaveAiContentVariables>,
    'mutationFn'
>;

/**
 * AIコンテンツ (解説、翻訳、音声パス等) を保存するための React Query Mutation フック
 * POST /api/cards/{cardId}/ai-contents を呼び出す
 */
export const useSaveAiContent = (options?: UseSaveAiContentOptions) => {
  return useMutation<
    AICardContentApiResponse, // 成功時に返されるデータ (作成された AICardContent)
    AppError,                 // エラーの型
    SaveAiContentVariables    // mutate に渡す引数 (variables) の型
  >({
    mutationFn: saveAiContentApi, // 上で定義した API 呼び出し関数
    ...options, // 呼び出し元から渡された onSuccess, onError などを展開
  });
};