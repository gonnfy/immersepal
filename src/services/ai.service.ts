// src/services/ai.service.ts (デバッグログ追加後の完全版)

import { TextToSpeechClient } from "@google-cloud/text-to-speech";
// Import GenerateContentResult along with existing imports
import { VertexAI, GenerateContentRequest, GenerateContentResult } from "@google-cloud/vertexai";
import { Storage } from "@google-cloud/storage";
import {
  AppError,
  ExternalApiError,
  isAppError, // isAppError をインポート (generateExplanation, generateTranslation で使用)
  ERROR_CODES,
} from "@/lib/errors";

// クライアント初期化
let ttsClient: TextToSpeechClient | null = null;
let storage: Storage | null = null;
let vertexAI: VertexAI | null = null;
let bucketName: string = "";
let vertexAiModelName: string = "";
let vertexAiRegion: string = ""; // Add variable for region
let ttsVoiceName: string = ""; // Add variable for TTS voice

try {
  // --- ↓↓↓ デバッグログ追加 ↓↓↓ ---
  const projectId = process.env.GCP_PROJECT_ID || '';
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'Not Set';
  // --- ↑↑↑ デバッグログ追加ここまで ↑↑↑

  // --- Make Region Configurable ---
  const defaultRegion = 'us-central1'; // Changed default region
  vertexAiRegion = process.env.VERTEX_AI_REGION || defaultRegion;
  console.log("--- AI Service Initialization ---");
  console.log(`Attempting to initialize Google Cloud clients.`);
  console.log(`Using GCP_PROJECT_ID: "${projectId}"`);
  console.log(`Using GOOGLE_APPLICATION_CREDENTIALS: "${credentialsPath}"`);
  // --- Update Log for Region ---
  console.log(`Using Vertex AI Region: "${vertexAiRegion}" ${!process.env.VERTEX_AI_REGION ? '(Default)' : '(From Env Var)'}`);
  if (!projectId || credentialsPath === 'Not Set') {
       console.error("!!! CRITICAL: GCP_PROJECT_ID or GOOGLE_APPLICATION_CREDENTIALS seems missing or empty in .env.local !!!");
  }

  // TextToSpeechClient と Storage の初期化 (変更なし)
  ttsClient = new TextToSpeechClient();
  storage = new Storage();

  // VertexAI クライアントの初期化 (Use configured region)
  vertexAI = new VertexAI({
    project: projectId,
    location: vertexAiRegion, // Use configured region
  });

  // GCS バケット名の取得 (変更なし)
  bucketName = process.env.GCS_BUCKET_NAME || "gemini-2.0-flash-001";
  if (!process.env.GCP_PROJECT_ID) console.warn("GCP_PROJECT_ID missing.");
  if (!bucketName && storage) console.warn("GCS_BUCKET_NAME missing.");

  // Determine Vertex AI model name
  const fallbackModel = ""; // Changed fallback model to latest alias
  vertexAiModelName = process.env.VERTEX_AI_MODEL_NAME || fallbackModel;
  console.log(`Using Vertex AI Model: "${vertexAiModelName}" ${!process.env.VERTEX_AI_MODEL_NAME ? '(Fallback)' : '(From Env Var)'}`);

  // --- Make TTS Voice Configurable ---
  const defaultTtsVoice = "ja-JP-Wavenet-B";
  ttsVoiceName = process.env.TTS_VOICE_NAME || defaultTtsVoice;
  console.log(`Using TTS Voice: "${ttsVoiceName}" ${!process.env.TTS_VOICE_NAME ? '(Default)' : '(From Env Var)'}`);


} catch (error) {
  console.error("Failed to initialize Google Cloud clients.", error);
  // 初期化失敗時はクライアントを null に設定 (変更なし)
  ttsClient = null;
  storage = null;
  vertexAI = null;
}

/**
 * Generates TTS audio from text, saves it to GCS, and returns a Signed URL.
 * (Uses configured TTS voice)
 */
export const generateTtsAudio = async (
  text: string,
  gcsFilename: string,
): Promise<string | null> => {
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
  console.log(`[AI Service] Generating TTS for filename: ${gcsFilename} using voice ${ttsVoiceName}`); // Log voice used
  try {
    const request = {
      input: { text: text },
      // --- Use configured TTS voice ---
      voice: { languageCode: "ja-JP", name: ttsVoiceName },
      audioConfig: { audioEncoding: "MP3" as const },
    };
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
    const bucket = storage.bucket(bucketName);
    const filePath = `tts-audio/${gcsFilename}.mp3`;
    const file = bucket.file(filePath);
    console.log(
      `[AI Service] Uploading TTS audio to gs://${bucketName}/${filePath}`,
    );
    await file.save(audioContent, {
      metadata: { contentType: "audio/mpeg" },
    });
    console.log(`[AI Service] File uploaded successfully.`);
    console.log(`[AI Service] Generating Signed URL...`);
    const expiresDate = new Date();
    expiresDate.setFullYear(expiresDate.getFullYear() + 100);
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: expiresDate,
    });
    console.log(`[AI Service] Signed URL generated.`);
    return signedUrl;
  } catch (error) {
    console.error(
      `Error in generateTtsAudio for filename ${gcsFilename}:`,
      error,
    );
    return null;
  }
};


/**
 * Generates an explanation for a given text using a specified Gemini model via streaming.
 */
export const generateExplanation = async (
  textToExplain: string,
  targetLanguage: string,
): Promise<string> => {
  // Remove modelName parameter, use configured vertexAiModelName
  if (!vertexAI) {
    console.error("generateExplanation: Vertex AI client is not initialized.");
    throw new ExternalApiError("Vertex AI client failed to initialize.");
  }
  if (!textToExplain) {
    console.warn(
      "generateExplanation: textToExplain is empty, returning empty string.",
    );
    return "";
  }

  console.log(
    `[AI Service] Generating explanation for: "${textToExplain}" using model ${vertexAiModelName} (streaming)`, // Indicate streaming
  );

  try {
    const generativeModel = vertexAI.getGenerativeModel({ // Use standard method
      model: vertexAiModelName,
    });
    const prompt = `Explain the meaning and usage of the ${targetLanguage} word/phrase "${textToExplain}" concisely for a language learner. Keep it simple and clear.`;
    const request: GenerateContentRequest = { // Type the request
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    console.log(`[AI Service] Sending prompt to Vertex AI (streaming)...`);
    const streamingResp = await generativeModel.generateContentStream(request);

    // --- Aggregate streamed response ---
    let aggregatedText = "";
    for await (const item of streamingResp.stream) {
        // Check if item and necessary properties exist
        const partText = item?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof partText === 'string') {
            aggregatedText += partText;
        } else {
             console.warn("[AI Service] Received non-text part in stream:", JSON.stringify(item, null, 2));
        }
    }
    // --- End aggregation ---

    // Validate aggregated response
    const generatedText = aggregatedText; // Use aggregated text
    if (typeof generatedText !== "string" || generatedText.length === 0) {
      console.warn(
        "[AI Service] Received no valid text content from Vertex AI streaming response."
        // Avoid logging potentially huge aggregated response if it failed validation
      );
      throw new ExternalApiError(
        "Failed to generate explanation: No valid content received from Vertex AI stream.",
      );
    }
    console.log(`[AI Service] Explanation generated successfully (streaming).`);
    return generatedText.trim();
  } catch (error: unknown) {
    console.error(
      `[AI Service] Error generating explanation for "${textToExplain}" (streaming):`, // Indicate streaming in error
      error,
    );
    if (isAppError(error)) {
      throw error;
    } else {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error during Vertex AI call.";
      throw new ExternalApiError(
        `Failed to generate explanation via Vertex AI stream: ${message}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
};

/**
 * Translates text from a source language to a target language using a specified Gemini model via streaming.
 */
export const generateTranslation = async (
  textToTranslate: string,
  sourceLanguage: string,
  targetLanguageCode: string,
): Promise<string> => {
  // Remove modelName parameter, use configured vertexAiModelName
  if (!vertexAI) {
    console.error("generateTranslation: Vertex AI client is not initialized.");
    throw new ExternalApiError("Vertex AI client failed to initialize.");
  }
  if (!textToTranslate) {
    console.warn(
      "generateTranslation: textToTranslate is empty, returning empty string.",
    );
    return "";
  }
  if (!sourceLanguage || !targetLanguageCode) {
    console.error(
      "generateTranslation: sourceLanguage or targetLanguageCode is missing.",
    );
    throw new AppError(
      "Source and target language codes are required for translation.",
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  console.log(
    `[AI Service] Generating translation for: "${textToTranslate}" from ${sourceLanguage} to ${targetLanguageCode} using model ${vertexAiModelName} (streaming)`, // Indicate streaming
  );

  try {
    const generativeModel = vertexAI.getGenerativeModel({ // Use standard method
      model: vertexAiModelName,
    });
    const prompt = `Translate the following text accurately from ${sourceLanguage} to ${targetLanguageCode}. Return only the translated text, without any introduction, explanation, or formatting like markdown.\n\nText to translate:\n"${textToTranslate}"\n\nTranslated text:`;
    const request: GenerateContentRequest = { // Type the request
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    console.log(`[AI Service] Sending translation prompt to Vertex AI (streaming)...`);
    const streamingResp = await generativeModel.generateContentStream(request);

    // --- Aggregate streamed response ---
    let aggregatedText = "";
     for await (const item of streamingResp.stream) {
        // Check if item and necessary properties exist
        const partText = item?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof partText === 'string') {
            aggregatedText += partText;
        } else {
             console.warn("[AI Service] Received non-text part in stream:", JSON.stringify(item, null, 2));
        }
    }
    // --- End aggregation ---

    // Validate aggregated response
    const translatedText = aggregatedText; // Use aggregated text
    if (typeof translatedText !== "string") {
      console.warn(
        "[AI Service] Received no valid text content from Vertex AI translation streaming response."
         // Avoid logging potentially huge aggregated response if it failed validation
      );
      throw new ExternalApiError(
        "Failed to generate translation: No valid content received from Vertex AI stream.",
      );
    }
    console.log(`[AI Service] Translation generated successfully (streaming).`);
    return translatedText.trim().replace(/^"|"$/g, ''); // Keep quote removal
  } catch (error: unknown) {
    console.error(
      `[AI Service] Error generating translation for "${textToTranslate}" from ${sourceLanguage} to ${targetLanguageCode} (streaming):`, // Indicate streaming in error
      error,
    );
    if (isAppError(error)) {
      throw error;
    } else {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error during Vertex AI call.";
      throw new ExternalApiError(
        `Failed to generate translation via Vertex AI stream: ${message}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
};

/**
 * Generates text content based on a prompt using the configured Vertex AI model (non-streaming).
 */
export const generateText = async (
  prompt: string,
): Promise<string> => {
  if (!vertexAI) {
    console.error("generateText: Vertex AI client is not initialized.");
    throw new ExternalApiError("Vertex AI client failed to initialize.");
  }
  if (!prompt) {
    console.warn("generateText: prompt is empty, returning empty string.");
    return "";
  }

  console.log(
    `[AI Service] Generating text using model ${vertexAiModelName} (non-streaming)`,
  );

  try {
    const generativeModel = vertexAI.getGenerativeModel({
      model: vertexAiModelName,
    });

    const request: GenerateContentRequest = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    console.log(`[AI Service] Sending prompt to Vertex AI (non-streaming)...`);
    // Use non-streaming generateContent
    const result: GenerateContentResult = await generativeModel.generateContent(request);

    // Extract text from the response, checking structure carefully
    const generatedText = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof generatedText !== "string" || generatedText.length === 0) {
      console.warn(
        "[AI Service] Received no valid text content from Vertex AI non-streaming response.",
        JSON.stringify(result?.response, null, 2) // Log the response structure for debugging
      );
      throw new ExternalApiError(
        "Failed to generate text: No valid content received from Vertex AI.",
      );
    }

    console.log(`[AI Service] Text generated successfully (non-streaming).`);
    return generatedText.trim();

  } catch (error: unknown) {
    console.error(
      `[AI Service] Error generating text (non-streaming):`,
      error,
    );
    if (isAppError(error)) {
      throw error;
    } else {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error during Vertex AI call.";
      throw new ExternalApiError(
        `Failed to generate text via Vertex AI: ${message}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
};