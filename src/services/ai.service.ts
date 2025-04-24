// src/services/ai.service.ts

import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { VertexAI } from "@google-cloud/vertexai";
import { Storage } from "@google-cloud/storage";
import {
  AppError,
  ExternalApiError,
  isAppError,
  ERROR_CODES,
} from "@/lib/errors";
// クライアント初期化 (前回の指示通り)
let ttsClient: TextToSpeechClient | null = null;
let storage: Storage | null = null;
let vertexAI: VertexAI | null = null;
let bucketName: string = "";

try {
  ttsClient = new TextToSpeechClient();
  storage = new Storage();
  vertexAI = new VertexAI({
    project: process.env.GCP_PROJECT_ID || "",
    location: "asia-northeast1",
  });
  bucketName = process.env.GCS_BUCKET_NAME || "";
  if (!process.env.GCP_PROJECT_ID) console.warn("GCP_PROJECT_ID missing.");
  if (!bucketName && storage) console.warn("GCS_BUCKET_NAME missing.");
} catch (error) {
  console.error("Failed to initialize Google Cloud clients.", error);
  ttsClient = null;
  storage = null;
  vertexAI = null;
}

/**
 * Generates TTS audio from text, saves it to GCS, and returns a Signed URL.
 * @param text The text to synthesize.
 * @param gcsFilename The desired filename (without extension) to save on GCS.
 * @returns A promise resolving to the Signed URL for the audio file, or null on error.
 */
export const generateTtsAudio = async (
  text: string,
  gcsFilename: string,
): Promise<string | null> => {
  // クライアントや必須引数のチェック
  if (!ttsClient || !storage || !bucketName) {
    console.error(
      "generateTtsAudio: TTS client, Storage client, or Bucket Name is not initialized.",
    );
    return null;
  }
  if (!text || !gcsFilename) {
    console.error("generateTtsAudio: Missing text or filename.");
    return null;
  }
  console.log(`[AI Service] Generating TTS for filename: ${gcsFilename}`);

  try {
    // 1. Text-to-Speech リクエスト作成
    const request = {
      input: { text: text },
      // 必要に応じて voice を変更してください
      voice: { languageCode: "ja-JP", name: "ja-JP-Wavenet-B" },
      audioConfig: { audioEncoding: "MP3" as const },
    };

    // 2. 音声合成 API 呼び出し
    console.log(`[AI Service] Calling synthesizeSpeech...`);
    const [response] = await ttsClient.synthesizeSpeech(request);
    const audioContent = response.audioContent;
    if (!audioContent) {
      console.error(
        "generateTtsAudio: Failed to synthesize speech, audioContent is empty.",
      );
      return null;
    }
    console.log(`[AI Service] Speech synthesized successfully.`);

    // 3. GCS にアップロード
    const bucket = storage.bucket(bucketName);
    const filePath = `tts-audio/${gcsFilename}.mp3`; // バケット内のパス
    const file = bucket.file(filePath);

    console.log(
      `[AI Service] Uploading TTS audio to gs://${bucketName}/${filePath}`,
    );
    // Buffer を直接 save する
    await file.save(audioContent, {
      metadata: { contentType: "audio/mpeg" }, // MP3 の MIME タイプ
      // resumable: false, // 小さなファイルなら不要なことが多い
    });
    console.log(`[AI Service] File uploaded successfully.`);

    // 4. 署名付き URL (Signed URL) を生成 ★★★ file.makePublic() の代わり ★★★
    console.log(`[AI Service] Generating Signed URL...`);
    const expiresDate = new Date();
    expiresDate.setFullYear(expiresDate.getFullYear() + 100); // 有効期限を約100年に設定 (事実上の無期限)

    const [signedUrl] = await file.getSignedUrl({
      action: "read", // 読み取り用 URL
      expires: expiresDate, // 有効期限
      // version: 'v4', // v4 を明示的に指定することも可能
    });

    console.log(`[AI Service] Signed URL generated.`);
    return signedUrl; // 生成された URL を返す
  } catch (error) {
    console.error(
      `Error in generateTtsAudio for filename ${gcsFilename}:`,
      error,
    );
    return null; // エラー時は null を返す
  }
};

// --- (generateExplanation と generateTranslation はまだ雛形のまま) ---
/**
 * Generates an explanation for a given text using a specified Gemini model.
 * @param textToExplain - The text (e.g., a word or phrase) to generate an explanation for.
 * @param targetLanguage - The language of the text to explain (e.g., 'en', 'ja'). Helps tailor the prompt.
 * @param modelName - The specific Gemini model to use (e.g., 'gemini-1.5-flash-001'). Defaults to 'gemini-1.5-flash-001'.
 * @returns A promise resolving to the generated explanation string.
 * @throws {ExternalApiError} If the Vertex AI client is not initialized or the API call fails or returns invalid content.
 */
export const generateExplanation = async (
  textToExplain: string,
  targetLanguage: string, // 例: 'en', 'ja' など、プロンプト調整用
  modelName: string = "gemini-1.5-flash-002", // デフォルトモデル
): Promise<string> => {
  // ★ エラー時は throw するため、戻り値は string (null を返さない)
  if (!vertexAI) {
    console.error("generateExplanation: Vertex AI client is not initialized.");
    throw new ExternalApiError("Vertex AI client failed to initialize.");
  }
  if (!textToExplain) {
    console.warn(
      "generateExplanation: textToExplain is empty, returning empty string.",
    );
    return ""; // 空文字の場合は空文字を返す
  }

  console.log(
    `[AI Service] Generating explanation for: "${textToExplain}" using model ${modelName}`,
  );

  try {
    // 1. Get the generative model instance
    const generativeModel = vertexAI.getGenerativeModel({
      model: modelName, // generationConfig: { ... }, // 必要に応じて設定
      // safetySettings: { ... },  // 必要に応じて設定
    }); // 2. Construct the prompt

    const prompt = `Explain the meaning and usage of the ${targetLanguage} word/phrase "${textToExplain}" concisely for a language learner. Keep it simple and clear.`; // 3. Send the prompt to the model

    const request = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    console.log(`[AI Service] Sending prompt to Vertex AI...`);
    const resp = await generativeModel.generateContent(request); // 4. Process the response - より安全な Optional Chaining を使用

    const generatedText =
      resp.response?.candidates?.[0]?.content?.parts?.[0]?.text; // 厳密にチェックし、テキストが得られなかった場合はエラーとする

    if (typeof generatedText !== "string" || generatedText.length === 0) {
      console.warn(
        "[AI Service] Received no valid text content from Vertex AI response:", // デバッグ用にレスポンス全体を整形してログ出力 (Prettier が整形してくれるはず)
        JSON.stringify(resp.response, null, 2),
      );
      throw new ExternalApiError(
        "Failed to generate explanation: No valid content received from Vertex AI.",
      );
    }

    console.log(`[AI Service] Explanation generated successfully.`);
    return generatedText.trim(); // 前後の空白を除去して返す
  } catch (error: unknown) {
    console.error(
      `[AI Service] Error generating explanation for "${textToExplain}":`,
      error,
    ); // エラーをラップして再スロー (API Route で handleApiError が処理)

    if (isAppError(error)) {
      // 既に AppError (ExternalApiError を含む) ならそのままスロー
      throw error;
    } else {
      // AppError でない場合は ExternalApiError にラップ
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error during Vertex AI call."; // 修正済みの ExternalApiError コンストラクタを使用
      throw new ExternalApiError(
        `Failed to generate explanation via Vertex AI: ${message}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
};

/**
 * Translates text from a source language to a target language using a specified Gemini model.
 * @param textToTranslate - The text to translate.
 * @param sourceLanguage - The language code or name of the source text (e.g., 'en', 'English', 'ja', 'Japanese').
 * @param targetLanguageCode - The language code or name for the target translation (e.g., 'ja', 'Japanese', 'en', 'English').
 * @param modelName - The specific Gemini model to use (e.g., 'gemini-1.0-pro'). Defaults to 'gemini-1.0-pro'.
 * @returns A promise resolving to the translated text string.
 * @throws {AppError} If source or target language is missing.
 * @throws {ExternalApiError} If the Vertex AI client is not initialized or the API call fails or returns invalid content.
 */
export const generateTranslation = async (
  textToTranslate: string,
  sourceLanguage: string, // 例: 'English' または 'en'
  targetLanguageCode: string, // 例: 'Japanese' または 'ja'
  modelName: string = "gemini-1.5-flash-002", // 前回成功したモデルをデフォルトに
): Promise<string> => {
  // クライアントのチェック
  if (!vertexAI) {
    console.error("generateTranslation: Vertex AI client is not initialized.");
    throw new ExternalApiError("Vertex AI client failed to initialize.");
  }
  // 入力テキストのチェック
  if (!textToTranslate) {
    console.warn(
      "generateTranslation: textToTranslate is empty, returning empty string.",
    );
    return ""; // 空文字の場合は空文字を返す
  }
  // 言語指定のチェック
  if (!sourceLanguage || !targetLanguageCode) {
    console.error(
      "generateTranslation: sourceLanguage or targetLanguageCode is missing.",
    );
    // バリデーションエラーとして AppError を throw
    throw new AppError(
      "Source and target language codes are required for translation.",
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  console.log(
    `[AI Service] Generating translation for: "${textToTranslate}" from ${sourceLanguage} to ${targetLanguageCode} using model ${modelName}`,
  );

  try {
    // 1. モデルを取得
    const generativeModel = vertexAI.getGenerativeModel({
      model: modelName,
      // 翻訳タスクに適した設定（任意）
      // generationConfig: { temperature: 0.2 }, // 創造性より正確性重視
      // safetySettings: { ... },
    });

    // 2. 翻訳用のプロンプトを作成
    // 指示を明確にするのがコツです
    const prompt = `Translate the following text accurately from ${sourceLanguage} to ${targetLanguageCode}:\n\n"${textToTranslate}"\n\nTranslated text:`;

    // 3. API リクエストを作成
    const request = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    console.log(`[AI Service] Sending translation prompt to Vertex AI...`);
    // 4. Vertex AI API 呼び出し
    const resp = await generativeModel.generateContent(request);

    // 5. レスポンスから翻訳テキストを抽出
    const translatedText =
      resp.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    // 6. 結果の検証
    if (typeof translatedText !== "string") {
      // 結果が文字列でない場合はエラー
      console.warn(
        "[AI Service] Received no valid text content from Vertex AI translation response:",
        JSON.stringify(resp.response, null, 2),
      );
      throw new ExternalApiError(
        "Failed to generate translation: No valid content received from Vertex AI.",
      );
    }
    // 空文字の翻訳結果を許容するかどうかは要件次第ですが、一旦許容します。

    console.log(`[AI Service] Translation generated successfully.`);
    // 7. 結果を返す (前後の空白を除去)
    return translatedText.trim();
  } catch (error: unknown) {
    // 8. エラーハンドリング
    console.error(
      `[AI Service] Error generating translation for "${textToTranslate}" from ${sourceLanguage} to ${targetLanguageCode}:`,
      error,
    );

    // エラーをラップして再スロー
    if (isAppError(error)) {
      throw error; // AppError はそのまま throw
    } else {
      // それ以外のエラーは ExternalApiError にラップ
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error during Vertex AI call.";
      throw new ExternalApiError(
        `Failed to generate translation via Vertex AI: ${message}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
};
