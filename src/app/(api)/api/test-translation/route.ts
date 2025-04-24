import { NextResponse } from "next/server";
import { z } from "zod"; // Zod をインポート
import { handleApiError, ValidationError } from "@/lib/errors"; // エラーハンドラとバリデーションエラーをインポート
import { generateTranslation } from "@/services/ai.service"; // 作成した翻訳サービス関数をインポート

// リクエストボディのスキーマ定義 (Zod)
const testTranslationSchema = z.object({
  text: z.string().min(1, "Text to translate cannot be empty."),
  sourceLanguage: z
    .string()
    .min(2, 'Source language must be provided (e.g., "en" or "English").'),
  targetLanguage: z
    .string()
    .min(2, 'Target language must be provided (e.g., "ja" or "Japanese").'),
  // modelName: z.string().optional(), // オプションでモデル名を上書きしたい場合
});

// リクエストボディの型 (Zodから推論)
type TestTranslationPayload = z.infer<typeof testTranslationSchema>;

/**
 * POST handler for testing the generateTranslation service.
 * Expects a JSON body with "text", "sourceLanguage", and "targetLanguage".
 */
export async function POST(request: Request) {
  try {
    // 1. リクエストボディのパースとバリデーション
    let body: TestTranslationPayload;
    try {
      const rawBody: unknown = await request.json();
      // Zod を使ってバリデーション
      const validation = testTranslationSchema.safeParse(rawBody);
      if (!validation.success) {
        // Zod のエラー詳細を含めて ValidationError を throw
        throw new ValidationError(
          "Invalid request body.",
          validation.error.flatten(),
        );
      }
      body = validation.data; // バリデーション成功後のデータを格納
    } catch (e) {
      // バリデーションエラーはそのまま rethrow
      if (e instanceof ValidationError) {
        throw e;
      }
      // JSON パースエラーなどの場合
      console.error("Error parsing or validating request body:", e);
      throw new ValidationError("Invalid JSON body or structure.");
    }

    // 2. サービス関数呼び出し
    const { text, sourceLanguage, targetLanguage } = body;
    // const model = body.modelName; // モデル名をリクエストで指定する場合

    // generateTranslation を呼び出し (成功すれば翻訳結果、失敗すればエラーが throw される)
    const translation = await generateTranslation(
      text,
      sourceLanguage,
      targetLanguage,
      // model // モデル名を渡す場合
    );

    // 3. 成功レスポンス
    return NextResponse.json({ success: true, translation: translation });
  } catch (error: unknown) {
    // 4. エラーハンドリング (handleApiError が AppError を処理)
    return handleApiError(error);
  }
}
