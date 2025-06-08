// src/hooks/useGenerateTts.ts (ts(2739) エラー修正 + _e 修正 適用済み)

import { useMutation, UseMutationOptions } from '@tanstack/react-query';
// ↓↓↓ ERROR_CODES をインポート (初期値設定と AppError で必要) ↓↓↓
import { AppError, ERROR_CODES } from '@/lib/errors';
import { type ApiErrorResponse } from '@/types/api.types';

export interface TtsPayload {
  text: string;
  language: string; // ★ オプショナル (?) を削除して必須に ★
  cardId: string;
  side: 'front' | 'back';
}

// APIから成功時に受け取るデータの型 (signedUrl, gcsPath を含む)
export interface TtsSuccessResponse {
  success: true;
  signedUrl: string;
  gcsPath: string;
  message?: string;
}

// バックエンドAPI (/api/tts) を呼び出す非同期関数
const generateTtsApi = async (
  payload: TtsPayload
): Promise<TtsSuccessResponse> => {
  const apiUrl = '/api/tts';
  console.log(
    '[useGenerateTts] Calling API:',
    apiUrl,
    'with payload:',
    payload
  );

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // API呼び出しが失敗した場合 (HTTPステータスが 2xx 以外)
  if (!response.ok) {
    // --- ↓↓↓ errorData の初期化を修正 (必須プロパティを設定) ↓↓↓ ---
    const errorData: ApiErrorResponse = {
      error: ERROR_CODES.INTERNAL_SERVER_ERROR, // デフォルトのエラーコード
      message: `Failed to generate TTS. Status: ${response.status}`, // デフォルトメッセージ
      details: null,
    };
    // --- ↑↑↑ 修正ここまで ↑↑↑ ---

    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const parsedError: ApiErrorResponse = await response.json();
        // API から返ってきた値があればデフォルトを上書き
        if (parsedError && typeof parsedError.error === 'string') {
          errorData.error = parsedError.error;
        }
        errorData.message = parsedError?.message || errorData.message;
        errorData.details = parsedError?.details;
      }
      // --- ↓↓↓ catch (_e) の修正 (適用済みのはず) ↓↓↓ ---
    } catch (_e) {
      console.warn('[useGenerateTts] Could not parse error response body:', _e);
    }
    // --- ↑↑↑ 修正ここまで ↑↑↑ ---

    // エラーコードの検証 (変更なし)
    const isKnownErrorCode =
      errorData.error &&
      Object.prototype.hasOwnProperty.call(ERROR_CODES, errorData.error);
    const validErrorCode: keyof typeof ERROR_CODES = isKnownErrorCode
      ? (errorData.error as keyof typeof ERROR_CODES)
      : ERROR_CODES.INTERNAL_SERVER_ERROR;

    // AppError を throw (変更なし)
    throw new AppError(
      errorData.message,
      response.status,
      validErrorCode,
      errorData.details
    );
  } // if (!response.ok) の終わり

  // API呼び出しが成功した場合 (変更なし)
  const result: TtsSuccessResponse = await response.json();
  // レスポンス形式検証 (signedUrl と gcsPath をチェック)
  if (
    !result ||
    result.success !== true ||
    typeof result.signedUrl !== 'string' ||
    typeof result.gcsPath !== 'string' // gcsPath もチェック
  ) {
    console.error('[useGenerateTts] Invalid success response format:', result);
    throw new AppError(
      'Received invalid response format from TTS API.',
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
  return result as TtsSuccessResponse;
};

type UseGenerateTtsOptions = Omit<
  UseMutationOptions<TtsSuccessResponse, AppError, TtsPayload>, // variables が TtsPayload に
  'mutationFn'
>;

// --- useGenerateTts フック本体 (変更なし) ---
export const useGenerateTts = (options?: UseGenerateTtsOptions) => {
  return useMutation<
    TtsSuccessResponse, // 成功データ型 (signedUrl, gcsPath 含む)
    AppError,
    TtsPayload
  >({
    mutationFn: generateTtsApi,
    ...options,
  });
};
