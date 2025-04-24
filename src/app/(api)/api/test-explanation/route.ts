import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, ValidationError } from "@/lib/errors"; // 必要に応じて AppError もインポート
import { generateExplanation } from "@/services/ai.service"; // 作成したサービス関数をインポート

// リクエストボディのスキーマ定義
const testExplanationSchema = z.object({
  text: z.string().min(1, "Text to explain cannot be empty."),
  language: z
    .string()
    .min(2, "Language code must be at least 2 characters.")
    .max(10), // 簡単な言語コードチェック
  // 必要なら modelName もリクエスト可能にする
  // modelName: z.string().optional(),
});

// リクエストボディの型
type TestExplanationPayload = z.infer<typeof testExplanationSchema>;

/**
 * POST handler for testing the generateExplanation service.
 * Expects a JSON body with "text" and "language".
 */
export async function POST(request: Request) {
  try {
    // 1. Parse Request Body
    let body: TestExplanationPayload;
    try {
      // ★ ボディが空の場合も考慮して unknown で受ける ★
      const rawBody: unknown = await request.json();
      // ★ スキーマでパース＆バリデーション ★
      const validation = testExplanationSchema.safeParse(rawBody);
      if (!validation.success) {
        // バリデーションエラーの詳細を返す
        throw new ValidationError(
          "Invalid request body.",
          validation.error.flatten(),
        );
      }
      body = validation.data; // 型アサーションなしでOK
    } catch (e) {
      // JSON パースエラーまたは Zod バリデーション以外のエラー
      if (e instanceof ValidationError) {
        throw e; // そのままスローして handleApiError で処理
      }
      console.error("Error parsing or validating request body:", e);
      // JSON パース失敗時などは ValidationError を new して投げる
      throw new ValidationError("Invalid JSON body or structure.");
    }

    // 2. Call the Service Function
    const { text, language } = body;
    // const model = body.modelName; // modelName を受け取る場合

    // generateExplanation は成功すれば文字列を、失敗すれば AppError を throw する想定
    const explanation = await generateExplanation(text, language /*, model */);

    // 3. Success Response
    return NextResponse.json({ success: true, explanation: explanation });
  } catch (error: unknown) {
    // 4. Error Handling (Centralized)
    // generateExplanation が throw した AppError や、
    // このハンドラ内で throw した ValidationError を処理
    return handleApiError(error);
  }
}
