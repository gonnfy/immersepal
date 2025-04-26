// src/app/(api)/api/tts/route.ts (language を必須に変更)

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { handleApiError, ValidationError, ExternalApiError } from '@/lib/errors';
import { generateTtsAudio } from '@/services/ai.service';

// Zod スキーマ: language を必須に変更
const ttsApiSchema = z.object({
  text: z.string().min(1, { message: 'Text for TTS cannot be empty.' }),
  language: z.string().min(2, { message: 'Language code is required (e.g., en-US, ja-JP).' }), // .optional() を削除
});

type TtsApiPayload = z.infer<typeof ttsApiSchema>;

/**
 * POST handler to generate Text-to-Speech audio and return a signed URL.
 * Expects JSON body: { text: string, language: string }
 */
export async function POST(request: Request) {
  try {
    // 1. Parse and Validate Request Body
    let payload: TtsApiPayload;
    try {
      const rawBody: unknown = await request.json();
      const validation = ttsApiSchema.safeParse(rawBody);
      if (!validation.success) {
        // バリデーション失敗（language が無い場合もここに来る）
        throw new ValidationError('Invalid request body for TTS.', validation.error.flatten());
      }
      payload = validation.data;
    } catch (e) {
      if (e instanceof ValidationError) { throw e; }
      console.error('Error parsing/validating TTS request body:', e);
      throw new ValidationError('Invalid JSON body or structure for TTS.');
    }

    // 2. Generate Unique Filename (変更なし)
    const uniqueFilenameBase = `tts-audio-${uuidv4()}`;

    // 3. Call TTS Service Function (payload.language を渡す)
    const signedUrl = await generateTtsAudio(
        payload.text,
        uniqueFilenameBase,
        payload.language // ★ 必須になった language を渡す ★
    );

    // 4. Handle Service Result (変更なし)
    if (signedUrl) {
      return NextResponse.json({ success: true, url: signedUrl });
    } else {
      throw new ExternalApiError('Failed to generate TTS audio or get signed URL.');
    }

  } catch (error: unknown) {
    return handleApiError(error);
  }
}