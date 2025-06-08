// src/hooks/useTranslateText.ts

import { useMutation } from '@tanstack/react-query';
import { AppError, ERROR_CODES } from '@/lib/errors'; // AppError をインポート

// API リクエストのペイロード型
interface TranslatePayload {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  // modelName?: string; // 必要ならモデル名も指定可能に
}

// API レスポンスの型 (成功時)
interface TranslateSuccessResponse {
  success: true;
  translation: string;
}

// API 呼び出し関数
const translateTextApi = async (
  payload: TranslatePayload
): Promise<TranslateSuccessResponse> => {
  // 注意: この API ルート '/api/translate' はまだ作成していません！
  // 次のステップで作成します。
  const apiUrl = '/api/translate';
  console.log(
    '[useTranslateText] Calling API:',
    apiUrl,
    'with payload:',
    payload
  );

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData: {
      message?: string;
      errorCode?: string;
      details?: unknown;
    } = {
      message: 'Failed to translate text',
      errorCode: 'API_ERROR',
      details: null,
    };
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        // Try to parse specific error structure from API
        const parsedError = await response.json();
        errorData.message = parsedError.message || errorData.message;
        errorData.errorCode = parsedError.errorCode || errorData.errorCode;
        errorData.details = parsedError.details;
      }
    } catch (e) {
      console.warn(
        '[useTranslateText] Could not parse error response body:',
        e
      );
    }
    // Throw AppError using parsed details if possible
    throw new AppError(
      errorData.message || 'Translation request failed',
      response.status,
      ERROR_CODES[errorData.errorCode as keyof typeof ERROR_CODES] ||
        ERROR_CODES.INTERNAL_SERVER_ERROR,
      errorData.details
    );
  }

  // Parse successful response
  const result: TranslateSuccessResponse = await response.json();
  // Validate success response structure
  if (!result.success || typeof result.translation !== 'string') {
    console.error(
      '[useTranslateText] Invalid success response format:',
      result
    );
    throw new AppError(
      'Received invalid response format from translation API.',
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
  return result;
};

// カスタム Mutation フック
export const useTranslateText = (options?: {
  onSuccess?: (data: TranslateSuccessResponse) => void;
  onError?: (error: AppError) => void;
}) => {
  return useMutation<
    TranslateSuccessResponse, // Success data type
    AppError, // Error type
    TranslatePayload // Variables type for mutate function
  >({
    mutationFn: translateTextApi,
    onSuccess: (data) => {
      console.log('Translation successful:', data);
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      // Ensure error is AppError before passing to callback
      if (error instanceof AppError) {
        console.error('Translation error:', error);
        options?.onError?.(error);
      } else {
        // Handle cases where error might not be AppError (shouldn't happen if translateTextApi throws AppError)
        console.error(
          'An unexpected non-AppError occurred during translation:',
          error
        );
        // Optionally wrap it in AppError before calling onError
        const unknownError = new AppError(
          'An unexpected error occurred during translation.',
          500,
          'INTERNAL_SERVER_ERROR',
          error
        );
        options?.onError?.(unknownError);
      }
    },
  });
};
