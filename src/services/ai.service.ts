// src/services/ai.service.ts (Resultパターン + Lintエラー修正適用版)

import { TextToSpeechClient } from "@google-cloud/text-to-speech";
// ↓↓↓ SafetyRating をインポート、Part は不要なので削除 ↓↓↓
import { VertexAI, SafetyRating } from "@google-cloud/vertexai";
import { Storage } from "@google-cloud/storage";
import { type Result } from '@/types'; // Result 型をインポート
import {
  AppError,
  ExternalApiError,
  ValidationError,
  isAppError,
  // ERROR_CODES, // このファイルでは直接使わないので削除
} from "@/lib/errors";

// --- クライアント初期化 ---
// ↓↓↓ generateTtsAudio以外で使わない変数は _ 付きにリネーム ↓↓↓
let _ttsClient: TextToSpeechClient | null = null;
let _storage: Storage | null = null;
let vertexAI: VertexAI | null = null; // これは generateExplanation/Translation で使う
let _bucketName: string = "";
let vertexAiModelName: string = ""; // これは generateExplanation/Translation で使う

try {
  const projectId = process.env.GCP_PROJECT_ID || '';
  // ↓↓↓ 未使用なので _ 付きにリネーム ↓↓↓
  const _credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'Not Set';
  const location = process.env.VERTEX_AI_REGION || 'us-central1'; // 前回動作した us-central1 をデフォルトに (環境変数で上書き可能)

  // --- デバッグログ (環境変数確認用) ---
  console.log("--- AI Service Initialization ---");
  console.log(`Attempting to initialize Google Cloud clients.`);
  console.log(`Using GCP_PROJECT_ID: "${projectId}"`);
  // ↓↓↓ _credentialsPath を使用 ↓↓↓
  console.log(`Using GOOGLE_APPLICATION_CREDENTIALS: "${_credentialsPath}"`);
  console.log(`Using Vertex AI Region: "${location}" ${!process.env.VERTEX_AI_REGION ? '(Default)' : '(From Env Var)'}`);
  // ↓↓↓ _credentialsPath を使用 ↓↓↓
  if (!projectId || _credentialsPath === 'Not Set') {
       console.error("!!! CRITICAL: GCP_PROJECT_ID or GOOGLE_APPLICATION_CREDENTIALS seems missing !!!");
  }
  // --- デバッグログここまで ---

  // ↓↓↓ _ 付きの変数に代入 ↓↓↓
  _ttsClient = new TextToSpeechClient();
  _storage = new Storage();
  vertexAI = new VertexAI({ project: projectId, location: location });
  _bucketName = process.env.GCS_BUCKET_NAME || "";

  // モデル名設定 (環境変数 VERTEX_AI_MODEL_NAME がなければフォールバック)
  // ↓↓↓ フォールバックも動作確認できたモデルにするのが安全 ↓↓↓
  const fallbackModel = "gemini-2.0-flash-001"; // or "gemini-1.0-pro-002"など、確実なもの
  vertexAiModelName = process.env.VERTEX_AI_MODEL_NAME || fallbackModel;
  console.log(`Using Vertex AI Model: "${vertexAiModelName}" ${!process.env.VERTEX_AI_MODEL_NAME ? '(Fallback)' : '(From Env Var)'}`);

  // TTS Voice 設定
  const defaultTtsVoice = "en-US-Chirp3-HD-Leda";
  const ttsVoiceName = process.env.TTS_VOICE_NAME || defaultTtsVoice;
  console.log(`Using TTS Voice: "${ttsVoiceName}" ${!process.env.TTS_VOICE_NAME ? '(Default)' : '(From Env Var)'}`);

// ↓↓↓ catch の error を _error に変更 ↓↓↓
} catch (_error) {
  console.error("Failed to initialize Google Cloud clients.", _error);
  _ttsClient = null;
  _storage = null;
  vertexAI = null;
}

// src/services/ai.service.ts の generateTtsAudio を修正

// ... (他の import, 初期化) ...

// src/services/ai.service.ts 内 generateTtsAudio (英語デフォルト版)

// src/services/ai.service.ts 内 generateTtsAudio (デバッグログ追加版)

export const generateTtsAudio = async (
  text: string,
  gcsFilename: string,
  languageCode: string = process.env.TTS_LANGUAGE_CODE_EN || "en-US"
): Promise<string | null> => {
  if (!_ttsClient || !_storage || !_bucketName) { /* ... */ return null; }
  if (!text || !gcsFilename) { /* ... */ return null; }

  // --- ↓↓↓ デバッグログ追加 ↓↓↓ ---
  console.log("--- generateTtsAudio Called ---");
  console.log(`Received languageCode argument: "${languageCode}"`);
  const envLangEn = process.env.TTS_LANGUAGE_CODE_EN;
  const envVoiceEn = process.env.TTS_VOICE_NAME_EN;
  const envLangJa = process.env.TTS_LANGUAGE_CODE_JA;
  const envVoiceJa = process.env.TTS_VOICE_NAME_JA;
  console.log(`Env EN: Code="${envLangEn}", Voice="${envVoiceEn}"`);
  console.log(`Env JA: Code="${envLangJa}", Voice="${envVoiceJa}"`);
  // --- ↑↑↑ デバッグログ追加ここまで ↑↑↑ ---

  let voiceSetting: { languageCode: string; name: string };

  // デフォルトは英語設定
  const defaultEnglishLangCode = envLangEn || "en-US";
  const defaultEnglishVoiceName = envVoiceEn || "en-US-Chirp3-HD-Leda";
  voiceSetting = { languageCode: defaultEnglishLangCode, name: defaultEnglishVoiceName };
  console.log(`Initial voice setting (defaulting to English): ${JSON.stringify(voiceSetting)}`);

  // ↓↓↓ 日本語コードかチェック (小文字にして比較) ↓↓↓
  if (languageCode && languageCode.toLowerCase().startsWith('ja')) {
    console.log("-> Detected 'ja' prefix. Attempting to switch to Japanese voice settings.");
    voiceSetting = {
        languageCode: envLangJa || "ja-JP",
        name: envVoiceJa || "ja-JP-Wavenet-B"
    };
  } else {
      console.log("-> Did not detect 'ja' prefix. Using default English voice settings.");
  }
  // ↑↑↑ チェックここまで ↑↑↑

  // 最終的に使われる設定をログに出力
  console.log(`==> Final voice settings to be used: Lang=${voiceSetting.languageCode}, Voice=${voiceSetting.name}`);
  console.log(`[AI Service] Generating TTS for filename: ${gcsFilename}`); // これは元のログ

  try {
    const request = {
      input: { text: text },
      voice: voiceSetting, // ★ 最終的な設定を使用 ★
      audioConfig: { audioEncoding: "MP3" as const },
    };

    console.log(`[AI Service] Calling synthesizeSpeech...`);
    const [response] = await _ttsClient.synthesizeSpeech(request); // _ttsClient を使用
    const audioContent = response.audioContent;
    if (!audioContent) { /* ... */ return null; }
    console.log(`[AI Service] Speech synthesized successfully.`);

    // ... (GCS へのアップロード、署名付き URL 生成は変更なし) ...
     const bucket = _storage.bucket(_bucketName);
     const filePath = `tts-audio/${gcsFilename}.mp3`;
     const file = bucket.file(filePath);
     await file.save(audioContent, { metadata: { contentType: "audio/mpeg" } });
     const expiresDate = new Date();
     expiresDate.setFullYear(expiresDate.getFullYear() + 100);
     const [signedUrl] = await file.getSignedUrl({ action: "read", expires: expiresDate });
     return signedUrl;

  } catch (error) {
    console.error(`Error in generateTtsAudio for ${voiceSetting.languageCode} text "${text}":`, error);
    return null;
  }
};

// (他の関数 generateExplanation, generateTranslation は変更なし)

// ... (generateExplanation, generateTranslation は変更なし) ...


/**
 * Generates an explanation using Gemini stream, returning a Result object.
 * Uses the globally configured vertexAiModelName.
 */
export const generateExplanation = async (
  textToExplain: string,
  targetLanguage: string, // This parameter is used in the prompt below
): Promise<Result<string, AppError>> => {
  if (!vertexAI) { return { ok: false, error: new ExternalApiError("Vertex AI client failed to initialize.") }; }
  if (!textToExplain) { return { ok: true, value: "" }; }

  console.log(`[AI Service] Generating explanation for: "${textToExplain}" using model ${vertexAiModelName} (streaming)`);

  try {
    const generativeModel = vertexAI.getGenerativeModel({ model: vertexAiModelName });
    // ↓↓↓ targetLanguage をプロンプトで使用 ↓↓↓
    const prompt = `Explain the meaning and usage of the ${targetLanguage} word/phrase "${textToExplain}" concisely for a language learner. Keep it simple and clear.`;
    const request = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

    console.log(`[AI Service] Sending prompt to Vertex AI (streaming)...`);
    const streamingResp = await generativeModel.generateContentStream(request);

    let aggregatedText = "";
    let finalFinishReason: string | undefined | null = undefined;
    // ↓↓↓ any[] を SafetyRating[] に変更 ↓↓↓
    let finalSafetyRatings: SafetyRating[] | undefined = undefined;

    for await (const item of streamingResp.stream) {
        finalFinishReason = item.candidates?.[0]?.finishReason;
        finalSafetyRatings = item.candidates?.[0]?.safetyRatings;
        const chunk = item.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof chunk === 'string') { aggregatedText += chunk; }
        if (finalFinishReason && finalFinishReason !== 'STOP' && finalFinishReason !== 'MAX_TOKENS') {
             // ↓↓↓ 正しい型で渡す ↓↓↓
             return { ok: false, error: new ExternalApiError(`Explanation generation stopped due to ${finalFinishReason}.`, undefined, finalSafetyRatings) };
        }
    }

    if (aggregatedText.trim().length === 0) {
      console.warn('[AI Service] Aggregated text content from stream is empty.');
      return { ok: false, error: new ExternalApiError("Failed to generate explanation: No content generated from stream.") };
    }

    console.log(`[AI Service] Explanation generated successfully (streaming).`);
    return { ok: true, value: aggregatedText.trim() };

  } catch (error: unknown) {
    console.error(`[AI Service] Error generating explanation for "${textToExplain}" (streaming):`, error);
    if (isAppError(error)) { return { ok: false, error: error }; }
    else {
      const message = error instanceof Error ? error.message : 'Unknown error during Vertex AI stream.';
      return { ok: false, error: new ExternalApiError(`Failed to generate explanation via Vertex AI stream: ${message}`, error instanceof Error ? error : undefined) };
    }
  }
};

/**
 * Translates text using Gemini stream, returning a Result object.
 * Uses the globally configured vertexAiModelName.
 */
export const generateTranslation = async (
  textToTranslate: string,
  sourceLanguage: string,
  targetLanguageCode: string,
): Promise<Result<string, AppError>> => {
   if (!vertexAI) { return { ok: false, error: new ExternalApiError("Vertex AI client failed to initialize.") }; }
   if (!textToTranslate) { return { ok: true, value: "" }; }
   if (!sourceLanguage || !targetLanguageCode) { return { ok: false, error: new ValidationError("Source and target language codes are required.") }; }

   console.log(`[AI Service] Generating translation for: "${textToTranslate}" from ${sourceLanguage} to ${targetLanguageCode} using model ${vertexAiModelName} (streaming)`);

   try {
        const generativeModel = vertexAI.getGenerativeModel({ model: vertexAiModelName });
        const prompt = `Translate the following text accurately from ${sourceLanguage} to ${targetLanguageCode}. Return only the translated text, without any introduction, explanation, or formatting like markdown.\n\nText to translate:\n"${textToTranslate}"\n\nTranslated text:`;
        const request = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
        console.log(`[AI Service] Sending translation prompt to Vertex AI (streaming)...`);
        const streamingResp = await generativeModel.generateContentStream(request);

        let aggregatedText = "";
        let finalFinishReason: string | undefined | null = undefined;
        // ↓↓↓ any[] を SafetyRating[] に変更 ↓↓↓
        let finalSafetyRatings: SafetyRating[] | undefined = undefined;

        for await (const item of streamingResp.stream) {
            finalFinishReason = item.candidates?.[0]?.finishReason;
            finalSafetyRatings = item.candidates?.[0]?.safetyRatings;
            const chunk = item.candidates?.[0]?.content?.parts?.[0]?.text;
            if (typeof chunk === 'string') { aggregatedText += chunk; }
             if (finalFinishReason && finalFinishReason !== 'STOP' && finalFinishReason !== 'MAX_TOKENS') {
                 // ↓↓↓ 正しい型で渡す ↓↓↓
                 return { ok: false, error: new ExternalApiError(`Translation generation stopped due to ${finalFinishReason}.`, undefined, finalSafetyRatings) };
             }
        }

       if (aggregatedText.trim().length === 0) {
         console.warn('[AI Service] Aggregated translation content from stream is empty.');
         return { ok: false, error: new ExternalApiError("Failed to generate translation: No content generated from stream.") };
       }

        console.log(`[AI Service] Translation generated successfully (streaming).`);
        return { ok: true, value: aggregatedText.trim().replace(/^"|"$/g, '') };
    } catch (error: unknown) {
        console.error(`[AI Service] Error generating translation for "${textToTranslate}" from ${sourceLanguage} to ${targetLanguageCode} (streaming):`, error);
         if (isAppError(error)) { return { ok: false, error: error }; }
         else {
           const message = error instanceof Error ? error.message : 'Unknown error during Vertex AI stream.';
           return { ok: false, error: new ExternalApiError(`Failed to generate translation via Vertex AI stream: ${message}`, error instanceof Error ? error : undefined) };
         }
    }
};