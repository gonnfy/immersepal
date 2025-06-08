// src/app/(api)/api/test-translation/route.ts (Result パターン対応版)

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ValidationError } from '@/lib/errors';
import { generateTranslation } from '@/services/ai.service'; // サービス関数 (Result を返す版)
import { type Result } from '@/types';
import { type AppError } from '@/lib/errors';

// Zod スキーマ (変更なし)
const testTranslationSchema = z.object({
  text: z.string().min(1, 'Text to translate cannot be empty.'),
  sourceLanguage: z
    .string()
    .min(2, 'Source language must be provided (e.g., "en" or "English").'),
  targetLanguage: z
    .string()
    .min(2, 'Target language must be provided (e.g., "ja" or "Japanese").'),
});

type TestTranslationPayload = z.infer<typeof testTranslationSchema>;

export async function POST(request: Request) {
  try {
    // 1. Parse and Validate Request Body (変更なし)
    let payload: TestTranslationPayload;
    try {
      const rawBody: unknown = await request.json();
      const validation = testTranslationSchema.safeParse(rawBody);
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
      console.error('Error parsing or validating translation request body:', e);
      throw new ValidationError(
        'Invalid JSON body or structure for translation.'
      );
    }

    // --- ↓↓↓ サービス呼び出しと Result 処理を修正 ↓↓↓ ---
    const { text, sourceLanguage, targetLanguage } = payload;

    // 2. Call Translation Service (returns Result)
    const translationResult: Result<string, AppError> =
      await generateTranslation(text, sourceLanguage, targetLanguage);

    // 3. Check Result
    if (!translationResult.ok) {
      return handleApiError(translationResult.error);
    }

    // 4. Return Success Response
    return NextResponse.json({
      success: true,
      translation: translationResult.value, // Use result.value
    });
    // --- ↑↑↑ 修正ここまで ↑↑↑ ---
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
