// src/app/(api)/api/translate/route.ts (Result パターン対応版)

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ValidationError } from '@/lib/errors'; // 必要なら AppError も
import { generateTranslation } from '@/services/ai.service';
import { type Result } from '@/types'; // Result 型をインポート
import { type AppError } from '@/lib/errors'; // AppError 型もインポート

// Zod スキーマ (変更なし)
const translateApiSchema = z.object({
  text: z.string().min(1, { message: 'Text to translate cannot be empty.' }),
  sourceLanguage: z
    .string()
    .min(2, { message: 'Source language is required.' }),
  targetLanguage: z
    .string()
    .min(2, { message: 'Target language is required.' }),
});

type TranslateApiPayload = z.infer<typeof translateApiSchema>;

export async function POST(request: Request) {
  try {
    // 1. Parse and Validate Request Body (変更なし)
    let payload: TranslateApiPayload;
    try {
      const rawBody: unknown = await request.json();
      const validation = translateApiSchema.safeParse(rawBody);
      if (!validation.success) {
        throw new ValidationError(
          'Invalid request body for translation.',
          validation.error.flatten()
        );
      }
      payload = validation.data;
    } catch (e) {
      if (e instanceof ValidationError) {
        throw e;
      }
      console.error('Error parsing/validating translation request body:', e);
      throw new ValidationError(
        'Invalid JSON body or structure for translation.'
      );
    }

    // --- ↓↓↓ サービス呼び出しと Result 処理を修正 ↓↓↓ ---

    // 2. Call Translation Service (which now returns Result)
    const translationResult: Result<string, AppError> =
      await generateTranslation(
        payload.text,
        payload.sourceLanguage,
        payload.targetLanguage
      );

    // 3. Check the Result
    if (!translationResult.ok) {
      // If not ok, handle the error using handleApiError
      console.warn(
        `Translation API failed for text "${payload.text}":`,
        translationResult.error.message
      );
      return handleApiError(translationResult.error); // Pass the error from the Result
    }

    // 4. Return Success Response using the value from the Result
    return NextResponse.json({
      success: true,
      translation: translationResult.value, // Use result.value here
    });
    // --- ↑↑↑ 修正ここまで ↑↑↑ ---
  } catch (error: unknown) {
    // Catch errors from request parsing/validation or unexpected errors
    // (handleApiError can handle non-AppError errors too)
    return handleApiError(error);
  }
}
