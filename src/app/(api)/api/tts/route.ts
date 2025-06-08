// src/app/(api)/api/tts/route.ts (Result<{ signedUrl, gcsPath }> 対応版)

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
// ↓↓↓ AppError もインポート ↓↓↓
import { handleApiError, ValidationError, AppError } from '@/lib/errors';
import { generateTtsAudio } from '@/services/ai.service';
// ↓↓↓ Result 型をインポート ↓↓↓
import { type Result } from '@/types';

// Zod スキーマ (language を必須に変更済み)
const ttsApiSchema = z.object({
  text: z.string().min(1, { message: 'Text for TTS cannot be empty.' }),
  language: z
    .string()
    .min(2, { message: 'Language code is required (e.g., en-US, ja-JP).' }),
});

type TtsApiPayload = z.infer<typeof ttsApiSchema>;

/**
 * POST handler to generate Text-to-Speech audio.
 * Returns both a signed URL for playback and the GCS path for potential storage.
 * Handles Result object from the service layer.
 */
export async function POST(request: Request) {
  try {
    // 1. Parse and Validate Request Body (変更なし)
    let payload: TtsApiPayload;
    try {
      const rawBody: unknown = await request.json();
      const validation = ttsApiSchema.safeParse(rawBody);
      if (!validation.success) {
        throw new ValidationError(
          'Invalid request body for TTS.',
          validation.error.flatten()
        );
      }
      payload = validation.data;
    } catch (e) {
      if (e instanceof ValidationError) {
        throw e;
      }
      console.error('Error parsing/validating TTS request body:', e);
      throw new ValidationError('Invalid JSON body or structure for TTS.');
    }

    // 2. Generate Unique Filename Base (変更なし)
    const uniqueFilenameBase = `tts-audio-${uuidv4()}`;

    // --- ↓↓↓ サービス呼び出しと Result 処理を修正 ↓↓↓ ---

    // 3. Call TTS Service Function (returns Result with signedUrl and gcsPath)
    const ttsResult: Result<{ signedUrl: string; gcsPath: string }, AppError> =
      await generateTtsAudio(
        payload.text,
        uniqueFilenameBase,
        payload.language
      );

    // 4. Check the Result
    if (!ttsResult.ok) {
      // If service returned an error Result, handle it
      console.error(
        `TTS Service failed for text "${payload.text}":`,
        ttsResult.error.message
      );
      return handleApiError(ttsResult.error); // エラー Result を処理
    }

    // 5. Return Success Response including both URL and Path
    // 成功 Result から値を取り出す
    const { signedUrl, gcsPath } = ttsResult.value;

    return NextResponse.json({
      success: true,
      signedUrl: signedUrl, // 再生用 URL
      gcsPath: gcsPath, // DB 保存用パス
    });
    // --- ↑↑↑ 修正ここまで ↑↑↑ ---
  } catch (error: unknown) {
    // Handle errors from parsing, validation, or unexpected issues
    return handleApiError(error);
  }
}
