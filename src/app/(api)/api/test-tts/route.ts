// src/app/(api)/api/test-tts/route.ts
import { NextResponse } from 'next/server';
import { generateTtsAudio } from '@/services/ai.service'; // 作成した関数をインポート
import { v4 as uuidv4 } from 'uuid'; // ユニークなファイル名生成用 (必要なら bun add uuid @types/uuid)

export async function GET(_request: Request) {
  try {
    const testText = 'こんにちは、これは音声合成のテストです。'; // 音声にしたいテキスト
    // GCS 上でファイル名が重複しないように UUID やタイムスタンプを使う
    const testFilename = `test-audio-${uuidv4()}`; // 例: test-audio-xxxxxxxx-xxxx...

    console.log(`[Test API] Calling generateTtsAudio with text: "${testText}"`);
    const audioUrl = await generateTtsAudio(testText, testFilename);

    if (audioUrl) {
      console.log(`[Test API] Success! Audio URL: ${audioUrl}`);
      return NextResponse.json({
        success: true,
        url: audioUrl,
        message: 'TTS generated and uploaded successfully.',
      });
    } else {
      console.error('[Test API] Failed to generate audio URL.');
      return NextResponse.json(
        { success: false, error: 'Failed to generate TTS audio URL.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Test API] Error occurred:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred during TTS test.',
      },
      { status: 500 }
    );
  }
}
