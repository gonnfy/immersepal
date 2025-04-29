// src/hooks/useGetTtsUrl.ts (QueryKey 型修正版)

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { type ApiErrorResponse } from '@/types/api.types';

// APIから成功時に受け取るデータの型 (変更なし)
interface GetTtsUrlSuccessResponse {
  success: true;
  signedUrl: string;
}

// API 呼び出し関数 (変更なし)
const getTtsUrlApi = async (gcsPath: string): Promise<GetTtsUrlSuccessResponse> => {
  if (!gcsPath) { throw new Error("GCS path is required."); }
  const apiUrl = `/api/tts/signed-url?gcsPath=${encodeURIComponent(gcsPath)}`;
  console.log('[useGetTtsUrl] Calling API:', apiUrl);
  const response = await fetch(apiUrl);
  if (!response.ok) {
    const errorData: ApiErrorResponse = { error: ERROR_CODES.INTERNAL_SERVER_ERROR, message: `Failed to get signed URL. Status: ${response.status}`, details: null };
    try { /* ... parse error ... */ } catch (_e) { /* ... */ }
    const isKnownErrorCode = errorData.error && Object.prototype.hasOwnProperty.call(ERROR_CODES, errorData.error);
    const validErrorCode: keyof typeof ERROR_CODES = isKnownErrorCode ? errorData.error as keyof typeof ERROR_CODES : ERROR_CODES.INTERNAL_SERVER_ERROR;
    throw new AppError(errorData.message, response.status, validErrorCode, errorData.details);
  }
  const result: GetTtsUrlSuccessResponse = await response.json();
  if (!result || result.success !== true || typeof result.signedUrl !== 'string') {
    console.error('[useGetTtsUrl] Invalid success response format:', result);
    throw new AppError('Received invalid response format from get signed URL API.', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
  return result;
};

// ↓↓↓ useQuery のオプションの型 (QueryKey 型を修正) ↓↓↓
type UseGetTtsUrlOptions = Omit<
    UseQueryOptions<GetTtsUrlSuccessResponse, AppError, GetTtsUrlSuccessResponse, readonly ["ttsUrl", string | null | undefined]>, // ★ undefined を許容 ★
    'queryKey' | 'queryFn'
>;

/**
 * GCS パスから再生用の署名付き URL を取得するための React Query クエリフック
 */
export const useGetTtsUrl = (
  gcsPath: string | null | undefined, // 引数の型は string | null | undefined
  options?: UseGetTtsUrlOptions
) => {
  // ↓↓↓ useQuery の QueryKey 型を修正 ↓↓↓
  return useQuery<
    GetTtsUrlSuccessResponse,
    AppError,
    GetTtsUrlSuccessResponse,
    readonly ["ttsUrl", string | null | undefined] // ★ undefined を許容 ★
  >({
    queryKey: ["ttsUrl", gcsPath], // ★ ここに string | null | undefined が渡されるため型を合わせる ★
    queryFn: () => {
      if (!gcsPath) { return Promise.reject(new Error("gcsPath is required.")); }
      return getTtsUrlApi(gcsPath);
    },
    enabled: !!gcsPath && typeof gcsPath === 'string' && gcsPath.length > 0 && (options?.enabled !== false),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000,    // 15 minutes
    retry: false,
    ...options,
  });
};