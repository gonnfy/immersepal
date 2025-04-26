// src/hooks/useGenerateTts.ts

import { useMutation } from '@tanstack/react-query';
import { AppError, ERROR_CODES } from '@/lib/errors'; // エラー処理用
import { type ApiErrorResponse } from '@/types/api.types'; // APIのエラー型

// APIに送るデータの型
interface TtsPayload {
  text: string;
  language: string; // Add language property
  // voice?: string;
}

// APIから成功時に受け取るデータの型
interface TtsSuccessResponse {
  success: true;
  url: string; // 音声ファイルの署名付きURL
  message?: string;
}

// バックエンドAPI (/api/tts) を呼び出す非同期関数
const generateTtsApi = async (payload: TtsPayload): Promise<TtsSuccessResponse> => {
  const apiUrl = '/api/tts';
  console.log('[useGenerateTts] Calling API:', apiUrl, 'with text:', payload.text);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // API呼び出しが失敗した場合 (HTTPステータスが 2xx 以外)
  if (!response.ok) {
    const errorData: ApiErrorResponse = {
        error: ERROR_CODES.INTERNAL_SERVER_ERROR, // デフォルト
        message: `Failed to generate TTS. Status: ${response.status}`,
        details: null
    };
    try {
      // エラーレスポンスがJSON形式ならパースを試みる
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
          const parsedError: ApiErrorResponse = await response.json();
          errorData.error = parsedError.error || errorData.error;
          errorData.message = parsedError.message || errorData.message;
          errorData.details = parsedError.details;
      }
    } catch (e) {
      // JSONパース失敗時
      console.warn("[useGenerateTts] Could not parse error response body:", e);
    }

  // Check if the parsed error code string is a valid key in our ERROR_CODES const
    const isKnownErrorCode = errorData.error && Object.prototype.hasOwnProperty.call(ERROR_CODES, errorData.error);

    // Determine the ErrorCode type safely
    const validErrorCode: keyof typeof ERROR_CODES = isKnownErrorCode
                       ? errorData.error as keyof typeof ERROR_CODES // Safe to cast now
                       : ERROR_CODES.INTERNAL_SERVER_ERROR;          //        // 無効ならデフォルト

    // 修正後の throw 文
    throw new AppError(
        errorData.message || 'TTS API request failed', // メッセージ
        response.status,                               // ステータスコード
        validErrorCode,                                // ★ 検証/デフォルト設定したエラーコードを使用
        errorData.details                              // 詳細
    );
  }

  // API呼び出しが成功した場合
  const result: TtsSuccessResponse = await response.json();

  // 成功レスポンスの形式を検証
  if (!result.success || typeof result.url !== 'string') {
    console.error('[useGenerateTts] Invalid success response format:', result);
    // 形式がおかしい場合はエラーとして扱う
    throw new AppError('Received invalid response format from TTS API.', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  // 検証OKなら成功データを返す
  return result;
};


/**
 * 音声合成API (/api/tts) を呼び出すための React Query Mutation フック
 * @param options - onSuccess, onError コールバックなどのオプション
 * @returns React Query Mutation オブジェクト ({ mutate, isPending, error, data, ... })
 */
export const useGenerateTts = (options?: {
  onSuccess?: (data: TtsSuccessResponse, variables: TtsPayload) => void; // variables の型は TtsPayload
  onError?: (error: AppError, variables: TtsPayload) => void; // variables の型は TtsPayload
}) => {
  return useMutation<
    TtsSuccessResponse, // 成功時に返されるデータの型
    AppError,           // エラー発生時に throw されるエラーの型
    TtsPayload          // mutate 関数に渡す引数 (variables) の型
  >({
    mutationFn: generateTtsApi, // API を呼び出す関数
    onSuccess: (data, variables) => {
      console.log('TTS Generation successful, URL:', data.url);
      // 呼び出し元から渡された onSuccess コールバックを実行
      options?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      // generateTtsApi が AppError を throw するので、型は AppError のはず
      console.error('TTS Generation error:', error);
      // 呼び出し元から渡された onError コールバックを実行
      options?.onError?.(error, variables);
    },
    // ここではキャッシュの無効化 (invalidateQueries) は通常不要
  });
};