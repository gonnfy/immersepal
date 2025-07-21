This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose

This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format

The content is organized as follows:

1. This summary section
2. Repository information
3. Directory structure
4. Multiple file entries, each consisting of:
   a. A header with the file path (## File: path/to/file)
   b. The full contents of the file in a code block

## Usage Guidelines

- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes

- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

## Additional Info

# Directory Structure

```
app/
  (api)/
    api/
      cards/
        [cardId]/
          ai-contents/
            route.ts
      decks/
        [deckId]/
          cards/
            [cardId]/
              route.ts
            route.ts
          route.ts
        route.ts
      test-explanation/
        route.ts
      test-translation/
        route.ts
      test-tts/
        route.ts
      translate/
        route.ts
      tts/
        signed-url/
          route.ts
        route.ts
  [locale]/
    (app)/
      (main)/
        decks/
          [deckId]/
            page.tsx
          page.tsx
      test/
        page.tsx
      layout.tsx
    (auth)/
      login/
        page.tsx
      reset-password/
        page.tsx
      signup/
        page.tsx
    layout.tsx
    page.tsx
  globals.css
  layout.tsx
  NextTamaguiProvider.tsx
  page.tsx
components/
  features/
    CardCreateForm.tsx
    CardEditModal.tsx
    CardList.tsx
    DeckCreateForm.tsx
    DeckCreateModal.tsx
    DeckEditModal.tsx
  providers/
    AuthProvider.tsx
  ui/
    ConfirmationDialog.tsx
  AuthStatus.tsx
  providers.tsx
hooks/
  useAuth.ts
  useCardMutations.ts
  useCards.ts
  useDeckMutations.ts
  useDecks.ts
  useGenerateTts.ts
  useGetTtsUrl.ts
  useSaveAiContent.ts
  useTranslateText.ts
i18n/
  navigation.ts
  request.ts
  routing.ts
lib/
  auth.ts
  db.ts
  errors.ts
  supabase.ts
  zod.ts
services/
  ai.service.ts
  card.service.ts
  deck.service.ts
types/
  api.types.ts
  index.ts
middleware.ts
```

# Files

## File: app/(api)/api/cards/[cardId]/ai-contents/route.ts

```typescript
// src/app/(api)/api/cards/[cardId]/ai-contents/route.ts (新規作成)

import { NextResponse } from "next/server";
import { z } from "zod";
import { AiContentType } from "@prisma/client"; // Prisma Enum をインポート
import { getServerUserId } from "@/lib/auth";
import { saveAiContent } from "@/services/card.service"; // 作成したサービス関数
import {
  handleApiError,
  ValidationError,
  AppError,
  AuthenticationError,
} from "@/lib/errors"; // エラー型
import { type Result } from "@/types";
import { type AICardContent } from "@prisma/client";

// リクエストボディの Zod スキーマ定義
const aiContentCreateApiSchema = z.object({
  contentType: z.nativeEnum(AiContentType), // 正しい Enum か検証
  language: z.string().min(2, { message: "Language code is required." }),
  content: z.string().min(1, { message: "Content cannot be empty." }),
});

type AiContentCreateApiPayload = z.infer<typeof aiContentCreateApiSchema>;

// context.params の型定義
interface Context {
  params: {
    cardId: string;
  };
}

/**
 * POST handler to create a new AICardContent entry for a specific card.
 */
export async function POST(request: Request, context: Context) {
  try {
    // 1. 認証
    const userId = await getServerUserId();
    if (!userId) {
      // 認証エラーは専用のエラークラスを使うか、直接レスポンスを返す
      return handleApiError(new AuthenticationError());
      // または: return NextResponse.json({ error: 'AUTHENTICATION_FAILED', message: 'Authentication required.' }, { status: 401 });
    }

    // 2. cardId を URL パラメータから取得
    // Next.js の挙動に注意しつつ await を使用
    const { cardId } = await context.params;
    if (!cardId) {
      throw new ValidationError("Card ID is missing in the URL path.");
    }

    // 3. リクエストボディのパースと検証
    let payload: AiContentCreateApiPayload;
    try {
      const rawBody: unknown = await request.json();
      const validation = aiContentCreateApiSchema.safeParse(rawBody);
      if (!validation.success) {
        throw new ValidationError(
          "Invalid request body for saving AI content.",
          validation.error.flatten(),
        );
      }
      payload = validation.data;
    } catch (e) {
      if (e instanceof ValidationError) {
        throw e;
      }
      console.error(
        "Error parsing/validating save AI content request body:",
        e,
      );
      throw new ValidationError(
        "Invalid JSON body or structure for saving AI content.",
      );
    }

    // 4. サービス関数呼び出し (Result が返ってくる)
    const saveResult: Result<AICardContent, AppError> = await saveAiContent(
      userId,
      cardId,
      payload, // { contentType, language, content }
    );

    // 5. Result をチェック
    if (!saveResult.ok) {
      // サービス層からのエラー (NotFound, Permission, Conflict, DB Error) を処理
      return handleApiError(saveResult.error);
    }

    // 6. 成功レスポンス (201 Created)
    // 作成された AICardContent オブジェクトを返す
    return NextResponse.json(saveResult.value, { status: 201 });
  } catch (error: unknown) {
    // 認証、パース/バリデーション、予期せぬエラーなどをここで処理
    return handleApiError(error);
  }
}
```

## File: app/(api)/api/decks/[deckId]/cards/[cardId]/route.ts

```typescript
// src/app/(api)/api/decks/[deckId]/cards/[cardId]/route.ts
import { NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth";
import { deleteCard } from "@/services/card.service";
// isAppError, ValidationError, AppError は handleApiError 等で必要になる可能性を考慮し残置。lint で不要と出たら削除。
import { ERROR_CODES, handleApiError } from "@/lib/errors";

interface DeleteParams {
  deckId: string;
  cardId: string;
}

/**
 * Deletes a specific card (DELETE)
 */
export async function DELETE(
  request: Request, // request object is not used but required by the signature
  context: { params: DeleteParams },
) {
  try {
    // 1. Authentication: Get user ID
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json(
        {
          error: ERROR_CODES.AUTHENTICATION_FAILED,
          message: "Authentication required.",
        },
        { status: 401 },
      );
    }

    // 2. Extract parameters
    const { deckId, cardId } = await context.params;
    if (!deckId || !cardId) {
      return NextResponse.json(
        {
          error: ERROR_CODES.VALIDATION_ERROR,
          message: "Missing deckId or cardId in URL.",
        },
        { status: 400 },
      );
    }

    // 3. Service Call: Attempt to delete the card
    await deleteCard(userId, deckId, cardId);

    // 4. Success Response: Return 204 No Content
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // 5. Error Handling: Use the centralized handler
    return handleApiError(error);
  }
}

// --- Imports for PUT ---
import { updateCard } from "@/services/card.service"; // Import the update service
import { cardUpdateSchema, CardUpdatePayload } from "@/lib/zod"; // Import the validation schema and payload type
// import type { Result } from '@/types'; // ★ Removed unused import

// --- Type for PUT context params (can reuse or define specifically) ---
interface PutParams {
  deckId: string;
  cardId: string;
}

/**
 * Updates a specific card (PUT)
 */
export async function PUT(request: Request, context: { params: PutParams }) {
  // No top-level try-catch needed when using Result pattern consistently in service

  // 1. Authentication: Get user ID
  const userId = await getServerUserId();
  if (!userId) {
    return NextResponse.json(
      {
        error: ERROR_CODES.AUTHENTICATION_FAILED,
        message: "Authentication required.",
      },
      { status: 401 },
    );
  }

  // 2. Extract parameters
  const { deckId, cardId } = await context.params;
  if (!deckId || !cardId) {
    return NextResponse.json(
      {
        error: ERROR_CODES.VALIDATION_ERROR,
        message: "Missing deckId or cardId in URL.",
      },
      { status: 400 },
    );
  }

  // 3. Get and Parse Request Body
  let body: unknown;
  try {
    body = await request.json();
  } catch (_e) {
    // _e は使わないが、catch 節は必要 (Removed unused eslint-disable comment)
    return NextResponse.json(
      { error: ERROR_CODES.VALIDATION_ERROR, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  // 4. Input Validation (Zod)
  const validation = cardUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: ERROR_CODES.VALIDATION_ERROR,
        message: "Invalid input data.",
        details: validation.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  // Type assertion after successful validation
  const validatedData = validation.data as CardUpdatePayload;

  // 5. Service Call: Attempt to update the card using the Result pattern
  const result = await updateCard(userId, deckId, cardId, validatedData);

  // 6. Handle Result
  if (result.ok) {
    return NextResponse.json(result.value, { status: 200 });
  } else {
    return handleApiError(result.error);
  }
}
```

## File: app/(api)/api/decks/[deckId]/cards/route.ts

```typescript
// src/app/[locale]/(api)/api/decks/[deckId]/cards/route.ts (修正後の完全なコード)

import { NextResponse } from "next/server";
import { z, ZodError } from "zod"; // Import ZodError
import { createCard, getCardsByDeckId } from "@/services/card.service";
import { handleApiError, AppError, ERROR_CODES } from "@/lib/errors"; // Import AppError and ERROR_CODES
import { getServerUserId } from "@/lib/auth";

// Define the expected request body schema
const createCardSchema = z.object({
  front: z.string().min(1, "Front text cannot be empty"),
  back: z.string().min(1, "Back text cannot be empty"),
});

// --- POST Handler (カード作成) ---
export async function POST(
  request: Request,
  context: { params: { deckId: string } },
) {
  try {
    const { deckId } = await context.params;

    if (!deckId) {
      return NextResponse.json(
        { error: "Deck ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validation = createCardSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.errors },
        { status: 400 },
      );
    }

    const { front, back } = validation.data;

    // Get user ID
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Call the service function to create the card, passing the userId
    const newCard = await createCard(userId, { deckId, front, back });

    return NextResponse.json(newCard, { status: 201 });
  } catch (error) {
    // Use your centralized error handler
    return handleApiError(error);
  }
}

// --- GET Handler (カード一覧取得) ---
export async function GET(
  request: Request,
  context: { params: { deckId: string } },
) {
  try {
    // --- 4.1. クエリパラメータの読み取りと検証 ---
    const { searchParams } = new URL(request.url);

    const querySchema = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(10), // デフォルト10, 最大100
      offset: z.coerce.number().int().min(0).default(0), // デフォルト0
    });

    let validatedQuery: { limit: number; offset: number };
    try {
      validatedQuery = querySchema.parse({
        limit: searchParams.get("limit"),
        offset: searchParams.get("offset"),
      });
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: ERROR_CODES.VALIDATION_ERROR,
            message: "Invalid query parameters for pagination.",
            details: err.flatten().fieldErrors,
          },
          { status: 400 },
        );
      }
      // Use handleApiError for other parsing errors
      return handleApiError(
        new AppError(
          "Failed to parse pagination query parameters",
          400,
          ERROR_CODES.VALIDATION_ERROR,
        ),
      );
    }

    // --- ここまでで limit と offset が検証済み ---
    const { limit, offset } = validatedQuery; // Define variables *after* validation

    // ★★★ context.params を await してから deckId を取得 ★★★
    const { deckId } = await context.params;

    if (!deckId) {
      return NextResponse.json(
        { error: "Deck ID is required" },
        { status: 400 },
      );
    }

    // 1. Authentication/Authorization
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // 2. Call Service Function
    // --- 4.2. Service 関数の呼び出し変更 ---
    const { data: cards, totalItems } = await getCardsByDeckId(userId, deckId, {
      limit,
      offset,
    });

    // 3. Success Response
    // --- 4.3. ページネーションレスポンスの構築 ---
    const baseUrl = `/api/decks/${deckId}/cards`;
    const selfLink = `${baseUrl}?offset=${offset}&limit=${limit}`;
    let nextLink: string | null = null;
    if (offset + limit < totalItems) {
      nextLink = `${baseUrl}?offset=${offset + limit}&limit=${limit}`;
    }
    let previousLink: string | null = null;
    if (offset > 0) {
      const prevOffset = Math.max(0, offset - limit);
      previousLink = `${baseUrl}?offset=${prevOffset}&limit=${limit}`;
    }

    const responseBody = {
      data: cards,
      pagination: {
        offset: offset,
        limit: limit,
        totalItems: totalItems,
        _links: {
          self: selfLink,
          next: nextLink,
          previous: previousLink,
        },
      },
    };

    // --- 4.4. レスポンスの返却変更 ---
    return NextResponse.json(responseBody, { status: 200 });
  } catch (error) {
    // 4. Error Handling
    return handleApiError(error);
  }
}
```

## File: app/(api)/api/decks/[deckId]/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth";
import {
  handleApiError,
  ValidationError,
  AuthenticationError,
  AppError,
} from "@/lib/errors";
import { deckUpdateSchema } from "@/lib/zod";
import { getDeckById, updateDeck, deleteDeck } from "@/services/deck.service";
import {
  type DeckUpdatePayload,
  type DeckApiResponse,
} from "@/types/api.types";
import { type Result } from "@/types";
interface Context {
  params: {
    deckId: string;
  };
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      throw new AuthenticationError();
    }
    const { deckId } = await context.params;
    if (!deckId) {
      throw new ValidationError("Deck ID is missing in the URL path.");
    }
    const deck: DeckApiResponse = await getDeckById(userId, deckId);

    return NextResponse.json(deck);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      throw new AuthenticationError();
    }

    const { deckId } = await context.params;
    if (!deckId) {
      throw new ValidationError("Deck ID is missing in the URL path.");
    }

    let payload: DeckUpdatePayload;
    try {
      const rawBody: unknown = await request.json();
      const validation = deckUpdateSchema.safeParse(rawBody);
      if (!validation.success) {
        throw new ValidationError(
          "Invalid request body for updating deck.",
          validation.error.flatten(),
        );
      }
      payload = validation.data;
    } catch (e) {
      if (e instanceof ValidationError) {
        throw e;
      }
      console.error("Error parsing/validating update deck request body:", e);
      throw new ValidationError(
        "Invalid JSON body or structure for updating deck.",
      );
    }

    const updateResult: Result<DeckApiResponse, AppError> = await updateDeck(
      userId,
      deckId,
      payload,
    );

    if (!updateResult.ok) {
      return handleApiError(updateResult.error);
    }

    return NextResponse.json(updateResult.value);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      throw new AuthenticationError();
    }

    const { deckId } = await context.params;
    if (!deckId) {
      throw new ValidationError("Deck ID is missing in the URL path.");
    }

    await deleteDeck(userId, deckId);

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
```

## File: app/(api)/api/decks/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth";
import {
  handleApiError,
  ValidationError,
  AuthenticationError,
} from "@/lib/errors";
import { deckCreateSchema } from "@/lib/zod";
import { getDecks, createDeck } from "@/services/deck.service";
import { type DeckCreatePayload } from "@/types/api.types";

export async function GET(request: NextRequest) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      throw new AuthenticationError();
    }

    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (isNaN(offset) || offset < 0 || isNaN(limit) || limit < 1) {
      throw new ValidationError("Invalid pagination parameters.");
    }

    const result = await getDecks(userId, { offset, limit });

    const baseUrl = request.nextUrl.pathname;
    result.pagination._links.self = `${baseUrl}?offset=${offset}&limit=${limit}`;
    if (offset + limit < result.pagination.totalItems) {
      result.pagination._links.next = `${baseUrl}?offset=${offset + limit}&limit=${limit}`;
    }
    if (offset > 0) {
      result.pagination._links.previous = `${baseUrl}?offset=${Math.max(0, offset - limit)}&limit=${limit}`;
    }

    // 5. Return Success Response
    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      throw new AuthenticationError();
    }

    let payload: DeckCreatePayload;
    try {
      const rawBody: unknown = await request.json();
      const validation = deckCreateSchema.safeParse(rawBody);
      if (!validation.success) {
        throw new ValidationError(
          "Invalid request body for creating deck.",
          validation.error.flatten(),
        );
      }
      payload = validation.data;
    } catch (e) {
      if (e instanceof ValidationError) {
        throw e;
      }
      console.error("Error parsing/validating create deck request body:", e);
      throw new ValidationError(
        "Invalid JSON body or structure for creating deck.",
      );
    }

    const newDeck = await createDeck(userId, payload);

    return NextResponse.json(newDeck, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
```

## File: app/(api)/api/test-explanation/route.ts

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, ValidationError } from "@/lib/errors";
import { generateExplanation } from "@/services/ai.service"; // サービス関数 (Result を返す版)
import { type Result } from "@/types";
import { type AppError } from "@/lib/errors";

const testExplanationSchema = z.object({
  text: z.string().min(1, "Text to explain cannot be empty."),
  language: z
    .string()
    .min(2, "Language code must be at least 2 characters.")
    .max(10),
});

type TestExplanationPayload = z.infer<typeof testExplanationSchema>;

export async function POST(request: Request) {
  try {
    let body: TestExplanationPayload;
    try {
      const rawBody: unknown = await request.json();
      const validation = testExplanationSchema.safeParse(rawBody);
      if (!validation.success) {
        throw new ValidationError(
          "Invalid request body.",
          validation.error.flatten(),
        );
      }
      body = validation.data;
    } catch (e) {
      if (e instanceof ValidationError) {
        throw e;
      }
      console.error("Error parsing or validating request body:", e);
      throw new ValidationError("Invalid JSON body or structure.");
    }

    const { text, language } = body;

    // 2. Call Service Function (returns Result)
    const explanationResult: Result<string, AppError> =
      await generateExplanation(text, language);

    // 3. Check Result
    if (!explanationResult.ok) {
      return handleApiError(explanationResult.error);
    }

    // 4. Success Response
    return NextResponse.json({
      success: true,
      explanation: explanationResult.value, // Use result.value
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
```

## File: app/(api)/api/test-translation/route.ts

```typescript
// src/app/(api)/api/test-translation/route.ts (Result パターン対応版)

import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, ValidationError } from "@/lib/errors";
import { generateTranslation } from "@/services/ai.service"; // サービス関数 (Result を返す版)
import { type Result } from "@/types";
import { type AppError } from "@/lib/errors";

// Zod スキーマ (変更なし)
const testTranslationSchema = z.object({
  text: z.string().min(1, "Text to translate cannot be empty."),
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
          "Invalid request body for translation.",
          validation.error.flatten(),
        );
      }
      payload = validation.data;
    } catch (e) {
      if (e instanceof ValidationError) {
        throw e;
      }
      console.error("Error parsing or validating translation request body:", e);
      throw new ValidationError(
        "Invalid JSON body or structure for translation.",
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
```

## File: app/(api)/api/test-tts/route.ts

```typescript
// src/app/(api)/api/test-tts/route.ts
import { NextResponse } from "next/server";
import { generateTtsAudio } from "@/services/ai.service"; // 作成した関数をインポート
import { v4 as uuidv4 } from "uuid"; // ユニークなファイル名生成用 (必要なら bun add uuid @types/uuid)

export async function GET(_request: Request) {
  try {
    const testText = "こんにちは、これは音声合成のテストです。"; // 音声にしたいテキスト
    // GCS 上でファイル名が重複しないように UUID やタイムスタンプを使う
    const testFilename = `test-audio-${uuidv4()}`; // 例: test-audio-xxxxxxxx-xxxx...

    console.log(`[Test API] Calling generateTtsAudio with text: "${testText}"`);
    const audioUrl = await generateTtsAudio(testText, testFilename);

    if (audioUrl) {
      console.log(`[Test API] Success! Audio URL: ${audioUrl}`);
      return NextResponse.json({
        success: true,
        url: audioUrl,
        message: "TTS generated and uploaded successfully.",
      });
    } else {
      console.error("[Test API] Failed to generate audio URL.");
      return NextResponse.json(
        { success: false, error: "Failed to generate TTS audio URL." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[Test API] Error occurred:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred during TTS test.",
      },
      { status: 500 },
    );
  }
}
```

## File: app/(api)/api/translate/route.ts

```typescript
// src/app/(api)/api/translate/route.ts (Result パターン対応版)

import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, ValidationError } from "@/lib/errors"; // 必要なら AppError も
import { generateTranslation } from "@/services/ai.service";
import { type Result } from "@/types"; // Result 型をインポート
import { type AppError } from "@/lib/errors"; // AppError 型もインポート

// Zod スキーマ (変更なし)
const translateApiSchema = z.object({
  text: z.string().min(1, { message: "Text to translate cannot be empty." }),
  sourceLanguage: z
    .string()
    .min(2, { message: "Source language is required." }),
  targetLanguage: z
    .string()
    .min(2, { message: "Target language is required." }),
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
          "Invalid request body for translation.",
          validation.error.flatten(),
        );
      }
      payload = validation.data;
    } catch (e) {
      if (e instanceof ValidationError) {
        throw e;
      }
      console.error("Error parsing/validating translation request body:", e);
      throw new ValidationError(
        "Invalid JSON body or structure for translation.",
      );
    }

    // --- ↓↓↓ サービス呼び出しと Result 処理を修正 ↓↓↓ ---

    // 2. Call Translation Service (which now returns Result)
    const translationResult: Result<string, AppError> =
      await generateTranslation(
        payload.text,
        payload.sourceLanguage,
        payload.targetLanguage,
      );

    // 3. Check the Result
    if (!translationResult.ok) {
      // If not ok, handle the error using handleApiError
      console.warn(
        `Translation API failed for text "${payload.text}":`,
        translationResult.error.message,
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
```

## File: app/(api)/api/tts/signed-url/route.ts

```typescript
// src/app/(api)/api/tts/signed-url/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import {
  handleApiError,
  ValidationError,
  ExternalApiError,
} from "@/lib/errors";

// 注意: Storage クライアントと bucketName は ai.service.ts と重複初期化している状態。
// 本来は共通の初期化処理を呼び出すか、シングルトンにするのが望ましい。
let storage: Storage | null = null;
let bucketName: string = "";
try {
  storage = new Storage(); // GOOGLE_APPLICATION_CREDENTIALS が必要
  bucketName = process.env.GCS_BUCKET_NAME || "";
  if (!bucketName) {
    console.error(
      "GCS_BUCKET_NAME missing in environment for signed URL generation.",
    );
    storage = null;
  }
} catch (error) {
  console.error(
    "Failed to initialize Storage client for signed URL generation.",
    error,
  );
  storage = null;
}

/**
 * GET handler to generate a short-lived signed URL for a given GCS path.
 * Expects gcsPath as a query parameter.
 */
export async function GET(request: NextRequest) {
  if (!storage || !bucketName) {
    return handleApiError(
      new ExternalApiError(
        "Storage client is not initialized or bucket name is missing.",
      ),
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const gcsPath = searchParams.get("gcsPath");

    // 1. 入力検証 (gcsPath が必須で、特定の形式か)
    if (
      !gcsPath ||
      typeof gcsPath !== "string" ||
      !gcsPath.startsWith("tts-audio/")
    ) {
      throw new ValidationError("Missing or invalid gcsPath query parameter.");
    }
    // パストラバーサル防止 (簡易チェック)
    if (gcsPath.includes("..")) {
      throw new ValidationError("Invalid characters in gcsPath.");
    }

    console.log(`[API /tts/signed-url] Request for path: ${gcsPath}`);

    // 2. 署名付き URL 生成 (有効期限は短め、例: 15分)
    const options = {
      version: "v4" as const,
      action: "read" as const,
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    const file = storage.bucket(bucketName).file(gcsPath);

    // (オプション) ファイル存在確認 - 存在しない場合に 404 を返す場合
    // const [exists] = await file.exists();
    // if (!exists) {
    //   console.warn(`[API /tts/signed-url] File not found at: ${gcsPath}`);
    //   throw new NotFoundError(`Audio file not found.`);
    // }

    const [url] = await file.getSignedUrl(options);
    console.log(`[API /tts/signed-url] Generated signed URL for ${gcsPath}`);

    // 3. 成功レスポンス
    return NextResponse.json({ success: true, signedUrl: url });
  } catch (error: unknown) {
    // バリデーションエラーや getSignedUrl のエラーを処理
    console.error(`[API /tts/signed-url] Error:`, error);
    return handleApiError(error); // handleApiError に処理を委譲
  }
}
```

## File: app/(api)/api/tts/route.ts

```typescript
// src/app/(api)/api/tts/route.ts (Result<{ signedUrl, gcsPath }> 対応版)

import { NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
// ↓↓↓ AppError もインポート ↓↓↓
import { handleApiError, ValidationError, AppError } from "@/lib/errors";
import { generateTtsAudio } from "@/services/ai.service";
// ↓↓↓ Result 型をインポート ↓↓↓
import { type Result } from "@/types";

// Zod スキーマ (language を必須に変更済み)
const ttsApiSchema = z.object({
  text: z.string().min(1, { message: "Text for TTS cannot be empty." }),
  language: z
    .string()
    .min(2, { message: "Language code is required (e.g., en-US, ja-JP)." }),
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
          "Invalid request body for TTS.",
          validation.error.flatten(),
        );
      }
      payload = validation.data;
    } catch (e) {
      if (e instanceof ValidationError) {
        throw e;
      }
      console.error("Error parsing/validating TTS request body:", e);
      throw new ValidationError("Invalid JSON body or structure for TTS.");
    }

    // 2. Generate Unique Filename Base (変更なし)
    const uniqueFilenameBase = `tts-audio-${uuidv4()}`;

    // --- ↓↓↓ サービス呼び出しと Result 処理を修正 ↓↓↓ ---

    // 3. Call TTS Service Function (returns Result with signedUrl and gcsPath)
    const ttsResult: Result<{ signedUrl: string; gcsPath: string }, AppError> =
      await generateTtsAudio(
        payload.text,
        uniqueFilenameBase,
        payload.language,
      );

    // 4. Check the Result
    if (!ttsResult.ok) {
      // If service returned an error Result, handle it
      console.error(
        `TTS Service failed for text "${payload.text}":`,
        ttsResult.error.message,
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
```

## File: app/[locale]/(app)/(main)/decks/[deckId]/page.tsx

```typescript
import { notFound } from 'next/navigation'; // Import notFound for 404 handling
import { getServerUserId } from '@/lib/auth'; // Import function to get user ID
import { getDeckById } from '@/services/deck.service'; // Import the service function
import {
  NotFoundError,
  PermissionError,
  DatabaseError,
  isAppError,
} from '@/lib/errors';
import { CardList } from '@/components/features/CardList'; // Import the CardList component
import { CardCreateForm } from '@/components/features/CardCreateForm'; // Import the CardCreateForm component

// Define the expected type based on the *updated* service function (no cards included)
type DeckData = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  // 'cards' property is removed
};

interface DeckDetailPageProps {
  // Indicate that params might be a promise that needs resolving
  params:
    | Promise<{
        deckId: string;
        locale: string; // Locale might be needed for translations later
      }>
    | {
        deckId: string;
        locale: string;
      };
}

export default async function DeckDetailPage({ params }: DeckDetailPageProps) {
  // Await params before accessing its properties
  const resolvedParams = await params;
  const { deckId } = resolvedParams;

  let deck: DeckData | null = null; // Use DeckData type (without cards)
  let errorInfo: { message: string; code?: string } | null = null;

  try {
    // 1. Get User ID directly in the RSC
    const userId = await getServerUserId();
    if (!userId) {
      // Handle unauthenticated user - maybe redirect or show a specific message
      // For now, treating as a permission error for simplicity
      throw new PermissionError('Authentication required to view this deck.');
    }

    // Fetch deck data (without cards)
    deck = await getDeckById(userId, deckId);
  } catch (error) {
    console.error('Error in DeckDetailPage:', error); // Log the error

    // --- Error Handling (Directly from Service Errors) ---
    if (error instanceof NotFoundError) {
      notFound(); // Trigger Next.js 404 page
    } else if (error instanceof PermissionError) {
      errorInfo = { message: error.message, code: 'FORBIDDEN' };
    } else if (error instanceof DatabaseError) {
      errorInfo = {
        message: 'A database error occurred while loading the deck.',
        code: 'DATABASE_ERROR',
      };
    } else if (isAppError(error)) {
      // Catch other AppErrors
      errorInfo = { message: error.message, code: error.name };
    } else {
      // Handle unexpected errors
      errorInfo = {
        message: 'An unexpected error occurred.',
        code: 'INTERNAL_SERVER_ERROR',
      };
    }
  }

  // --- Render Error State ---
  if (errorInfo) {
    return (
      <div className="p-4 text-red-600">
        Error loading deck: {errorInfo.message}{' '}
        {errorInfo.code ? `(Code: ${errorInfo.code})` : ''}
      </div>
    );
  }

  // --- Render Success State ---
  // If we reach here and deck is still null, something went wrong (should be caught above)
  if (!deck) {
    return (
      <div className="p-4 text-red-600">
        Error loading deck: Deck data is unavailable.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Deck Details */}
      <h1 className="text-3xl font-bold mb-2">{deck.name}</h1>
      <p className="text-gray-600 mb-6">
        {deck.description || 'No description provided.'}
      </p>

      {/* Separator or spacing */}
      <hr className="my-6" />

      {/* Add New Card Form (Client Component) */}
      <div className="mb-8">
        {' '}
        {/* Add some margin below the form */}
        <h2 className="text-2xl font-semibold mb-4">Add New Card</h2>
        <CardCreateForm deckId={deck.id} />
      </div>

      {/* Render the CardList component (Client Component) */}
      <h2 className="text-2xl font-semibold mb-4">Cards in this Deck</h2>
      <CardList deckId={deck.id} />

      {/* Card rendering is now handled by the CardList component */}
    </div>
  );
}
```

## File: app/[locale]/(app)/(main)/decks/page.tsx

```typescript
"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDecks } from "@/hooks/useDecks";
import { useDeleteDeck } from "@/hooks/useDeckMutations";
import { DeckCreateForm } from "@/components/features/DeckCreateForm";
import { DeckEditModal } from "@/components/features/DeckEditModal";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { type DeckApiResponse } from "@/types";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

function DecksPage() {
  const { isLoading: authLoading } = useAuth();
  const ITEMS_PER_PAGE = 10;
  const [offset, setOffset] = useState(0);

  const {
    decks,
    pagination,
    isLoading: decksIsLoading,
    isFetching: decksIsFetching,
    error: decksError,
  } = useDecks({
    offset: offset,
    limit: ITEMS_PER_PAGE,
  });

  const {
    mutate: deleteDeckMutate,
    isPending: isDeletingDeck,
    error: deleteDeckError,
  } = useDeleteDeck();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<DeckApiResponse | null>(
    null,
  );
  const [editingDeck, setEditingDeck] = useState<DeckApiResponse | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleDeleteClick = (deck: DeckApiResponse) => {
    setDeckToDelete(deck);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deckToDelete) {
      deleteDeckMutate({ deckId: deckToDelete.id });
      setIsConfirmOpen(false);
      setDeckToDelete(null);
    }
  };

  const handleEditClick = (deck: DeckApiResponse) => {
    console.log("handleEditがクリックされました", deck);
    setEditingDeck(deck);
    setIsEditModalOpen(true);
  };

  const Spinner = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
  );

  const isLoading = authLoading || (decksIsLoading && !pagination);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  }

  if (!decksIsLoading && decksError) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-red-600">
          Error Loading Decks
        </h1>
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Failed to load your decks.</strong>
          <span className="block sm:inline ml-2">
            {decksError instanceof Error
              ? decksError.message
              : "An unknown error occurred."}
          </span>
          <p className="text-sm mt-2">
            Please try refreshing the page. If the problem persists, contact
            support.
          </p>
          {}
        </div>
      </div>
    );
  }

  // 正常系のレンダリング
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Decks</h1>
      {/* デバッグ用: ログインユーザーID表示 */}
      {/* <p className="text-xs text-gray-500 mb-4">Logged in as: {user?.id ?? 'No user'}</p> */}

      {/* デッキ作成フォーム */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Create New Deck</h2>
        <DeckCreateForm
          onSuccess={() => console.log("Deck created callback!")}
        />
      </div>

      <h2 className="text-2xl font-semibold mb-4">Existing Decks</h2>

      {/* デッキ一覧 */}
      {decks && ( // decks が存在する（エラーではない）場合
        <>
          {decks.length === 0 &&
            offset === 0 &&
            !decksIsFetching && ( // 初回ロードでデッキがない場合
              <p className="text-gray-500 dark:text-gray-400">
                You haven&apos;t created any decks yet.
              </p>
            )}
          {decks.length > 0 && ( // デッキが存在する場合
            <ul className="space-y-3 mb-6">
              {decks.map((deck: DeckApiResponse) => (
                <li
                  key={deck.id}
                  className="p-4 border rounded-md shadow-sm bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  <div className="flex justify-between items-center">
                    <Link
                      href={`/decks/${deck.id}`}
                      className="text-lg font-medium hover:underline"
                    >
                      {deck.name}
                    </Link>
                    <div className="space-x-2 flex-shrink-0">
                      <Link
                        href={`/decks/${deck.id}`}
                        className="text-blue-500 hover:underline text-sm"
                      >
                        View
                      </Link>
                      <button
                        type="button" // Ensure type="button"
                        className="text-yellow-500 hover:underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleEditClick(deck)}
                        disabled={isDeletingDeck || decksIsFetching} // データ取得中や削除中も無効化
                      >
                        Edit
                      </button>
                      <button
                        type="button" // Ensure type="button"
                        className="text-red-500 hover:underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleDeleteClick(deck)}
                        disabled={isDeletingDeck || decksIsFetching} // データ取得中や他の削除処理中も無効化
                      >
                        {isDeletingDeck && deckToDelete?.id === deck.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                  {deck.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {deck.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Cards: {deck.cardCount ?? 0}
                  </p>{" "}
                  {/* カード数表示 */}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* データ取得中のスピナー表示 (初回ロード後) */}
      {decksIsFetching && !decksIsLoading && (
        <div className="flex justify-center items-center mt-4">
          <Spinner /> <span className="ml-2">Loading decks...</span>
        </div>
      )}

      {/* ページネーション */}
      {!isLoading &&
        !decksError &&
        pagination &&
        pagination.totalItems > ITEMS_PER_PAGE && (
          <div className="mt-6 flex items-center justify-center space-x-4">
            <button
              type="button" // Ensure type="button"
              onClick={() => setOffset(Math.max(0, offset - ITEMS_PER_PAGE))}
              disabled={
                !pagination._links.previous || decksIsFetching || isDeletingDeck
              } // 条件追加
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {`Showing ${pagination.totalItems > 0 ? offset + 1 : 0} - ${Math.min(pagination.totalItems, offset + ITEMS_PER_PAGE)} of ${pagination.totalItems}`}
            </span>
            <button
              type="button" // Ensure type="button"
              onClick={() => setOffset(offset + ITEMS_PER_PAGE)}
              disabled={
                !pagination._links.next || decksIsFetching || isDeletingDeck
              } // 条件追加
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        )}

      {/* ★ デッキ削除エラー表示 ★ */}
      {deleteDeckError && (
        <div
          className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md"
          role="alert"
        >
          <p className="font-semibold">Error Deleting Deck</p>
          <p>{deleteDeckError.message}</p>
          {/* 必要なら詳細情報を表示 */}
        </div>
      )}

      {/* --- Modals (変更なし) --- */}
      {isMounted &&
        deckToDelete &&
        createPortal(
          <ConfirmationDialog
            isOpen={isConfirmOpen}
            onOpenChange={setIsConfirmOpen}
            onConfirm={handleConfirmDelete}
            title="Delete Deck"
            description={`Are you sure you want to delete "${deckToDelete.name}"? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            isConfirming={isDeletingDeck}
          />,
          document.body,
        )}

      {/* {isMounted &&
        editingDeck &&
        createPortal(
          <DeckEditModal
            isOpen={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            deck={editingDeck}
            onSuccess={() => {
              setIsEditModalOpen(false);
              setEditingDeck(null);
              console.log("Deck update successful, modal closed.");
            }}
          />,
          document.body,
        )} */}

      {isEditModalOpen &&
        createPortal(
          <DeckEditModal
            isOpen={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            deck={editingDeck}
            onSuccess={() => {
              setIsEditModalOpen(false);
              setEditingDeck(null);
            }}
          />,
          document.body,
        )}
    </div>
  );
}

export default DecksPage;
```

## File: app/[locale]/(app)/test/page.tsx

```typescript
// src/app/[locale]/(app)/test/page.tsx
'use client';

import React, { useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

export default function DialogTestPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  const handleConfirm = () => {
    alert('Confirmed!');
    setIsDialogOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setIsDialogOpen(isOpen);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Confirmation Dialog Isolation Test</h1>
      <p>
        If the dialog below appears correctly centered on the screen, the
        positioning issue is likely caused by interactions with other components
        or styles in its original context (e.g., within CardList).
      </p>
      <p>
        If the dialog below is still misplaced or cut off, the issue might be
        with the dialog&apos;s internal styles, Tailwind setup,{' '}
        {/* ★★★ Fixed ' */}
        or global CSS conflicts.
      </p>

      <ConfirmationDialog
        isOpen={isDialogOpen}
        onOpenChange={handleOpenChange}
        onConfirm={handleConfirm}
        title="Test Dialog: Is this centered?"
        description="This dialog should appear fixed and centered within the browser viewport, regardless of this text."
        confirmText="Confirm Test"
        cancelText="Cancel Test"
      />

      <div style={{ height: '150vh', background: '#eee', marginTop: '20px' }}>
        Scrollable area below the dialog trigger point (dialog should stay
        centered).
      </div>
    </div>
  );
}
```

## File: app/[locale]/(app)/layout.tsx

```typescript
// src/app/[locale]/(app)/layout.tsx (params await + import path 修正版)
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
// ↓↓↓ パスエイリアス (@/) を使用するように修正 ↓↓↓
import { createSupabaseServerComponentClient } from "@/lib/supabase";
import { AuthStatus } from "@/components/AuthStatus";
// ↑↑↑ パスエイリアス (@/) を使用するように修正 ↑↑↑

export default async function AuthenticatedLayout({
  children,
  // ↓↓↓ params をそのまま Promise として受け取るように修正 ↓↓↓
  params: paramsPromise,
}: {
  children: React.ReactNode;
  // ↓↓↓ 型定義も Promise<{ locale: string }> に修正 ↓↓↓
  params: Promise<{ locale: string }>;
}) {
  // ↓↓↓ 関数内で params を await してから locale を取得 ↓↓↓
  // このレイアウトでは locale は直接使用していませんが、正しいパターンに修正します。
  const { locale: _locale } = await paramsPromise;
  console.log(
    `[AuthenticatedLayout](${new Date().toISOString()}) Check triggered for path (locale: ${_locale})...`,
  );
  // ↑↑↑ await 処理を追加 ↑↑↑

  let user = null;
  let authError = null;

  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerComponentClient(cookieStore);
    const {
      data: { user: fetchedUser },
      error: fetchError,
    } = await supabase.auth.getUser();
    user = fetchedUser;
    authError = fetchError;
    console.log(
      `[AuthenticatedLayout](${new Date().toISOString()}) getUser result:`,
      { userId: user?.id, email: user?.email },
    );
    if (authError) {
      console.error(
        `[AuthenticatedLayout](${new Date().toISOString()}) getUser authError:`,
        authError.message,
      );
    }
  } catch (error) {
    console.error(
      `[AuthenticatedLayout](${new Date().toISOString()}) Error during Supabase client/getUser:`,
      error,
    );
    const loginPath = "/login"; // 必要ならロケールを考慮 `/${_locale}/login`
    console.log(
      `[AuthenticatedLayout](${new Date().toISOString()}) Error in setup, redirecting to ${loginPath}...`,
    );
    redirect(loginPath);
  }

  if (!user) {
    const loginPath = "/login"; // 必要ならロケールを考慮 `/${_locale}/login`
    console.log(
      `[AuthenticatedLayout](${new Date().toISOString()}) No user found (or error occurred), redirecting to ${loginPath}...`,
    );
    redirect(loginPath);
  }

  console.log(
    `[AuthenticatedLayout](${new Date().toISOString()}) User found, rendering children for user: ${user.id}`,
  );

  return (
    <div className="flex flex-col min-h-screen">
      <AuthStatus />
      <main className="flex-grow container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
```

## File: app/[locale]/(auth)/login/page.tsx

```typescript
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@/i18n/navigation";
import { Button, Form, H2, Input, Paragraph, Spinner, YStack } from "tamagui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { signIn, isLoading } = useAuth();

  const handleSignIn = async () => {
    setError(null);
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError.message);
    }
  };

  return (
    <YStack
      flex={1}
      justifyContent="center"
      alignItems="center"
      space="$4"
      padding="$4"
      maxWidth={400}
      marginHorizontal="auto"
    >
      <H2>Log In</H2>
      <Form
        onSubmit={handleSignIn}
        width="100%"
        space="$3"
        padding="$4"
        borderRadius="$4"
        backgroundColor="$background"
        elevation="$2"
      >
        <Input
          size="$4"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          size="$4"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error && (
          <Paragraph theme="red" textAlign="center">
            {error}
          </Paragraph>
        )}

        <Form.Trigger asChild>
          <Button
            theme="active"
            size="$4"
            icon={isLoading ? () => <Spinner /> : undefined}
          >
            {isLoading ? "Logging In..." : "Log In"}
          </Button>
        </Form.Trigger>

        <YStack alignItems="center" space="$2" paddingTop="$2">
          <Link href="/reset-password">
            <Paragraph theme="blue_alt2" cursor="pointer">
              Forgot Password?
            </Paragraph>
          </Link>
          <Link href="/signup">
            <Paragraph>
              Don't have an account?{" "}
              <Paragraph as="span" theme="blue_alt2">
                Sign Up
              </Paragraph>
            </Paragraph>
          </Link>
        </YStack>
      </Form>
    </YStack>
  );
}
```

## File: app/[locale]/(auth)/reset-password/page.tsx

```typescript
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { Link } from "@/i18n/navigation";
import { Button, Form, H2, Input, Paragraph, Spinner, YStack } from "tamagui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handlePasswordReset = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage("Password reset link sent! Please check your email.");
    }
    setLoading(false);
  };

  return (
    <YStack
      flex={1}
      justifyContent="center"
      alignItems="center"
      space="$4"
      padding="$4"
      maxWidth={400}
      marginHorizontal="auto"
    >
      <H2>Reset Password</H2>
      <Paragraph textAlign="center">
        Enter your email address and we will send you a link to reset your
        password.
      </Paragraph>
      <Form
        onSubmit={handlePasswordReset}
        width="100%"
        space="$3"
        padding="$4"
        borderRadius="$4"
        backgroundColor="$background"
        elevation="$2"
      >
        <Input
          size="$4"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {error && <Paragraph theme="red">{error}</Paragraph>}
        {message && <Paragraph theme="green">{message}</Paragraph>}

        <Form.Trigger asChild>
          <Button
            theme="active"
            size="$4"
            icon={loading ? () => <Spinner /> : undefined}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </Form.Trigger>

        <Link href="/login" style={{ textAlign: "center", paddingTop: 10 }}>
          <Paragraph theme="blue_alt2">Back to Log In</Paragraph>
        </Link>
      </Form>
    </YStack>
  );
}
```

## File: app/[locale]/(auth)/signup/page.tsx

```typescript
// src/app/[locale]/(app)/(auth)/signup/page.tsx
'use client';

import { useState } from 'react';
// import { useRouter } from 'next/navigation' // ★ Removed unused import
import { useAuth } from '@/hooks/useAuth';
import { Link } from '@/i18n/navigation';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // const router = useRouter() // ★ Removed unused variable
  const { signUp } = useAuth();

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error: signUpError } = await signUp(email, password);

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setMessage(
        'Sign up successful! Please check your email for verification.'
      );
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', paddingTop: '50px' }}>
      <h2>Sign Up</h2>
      <form onSubmit={handleSignUp}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '8px', marginBottom: '20px' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 20px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
      </form>
      {error && (
        <p style={{ color: 'red', marginTop: '10px' }}>Error: {error}</p>
      )}
      {message && (
        <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>
      )}
      <p style={{ marginTop: '20px' }}>
        Already have an account? <Link href="/login">Log In</Link>
      </p>
    </div>
  );
}
```

## File: app/[locale]/layout.tsx

```typescript
// src/app/[locale]/layout.tsx (修正版 - ルートレイアウトが存在する場合)
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

// ★ Providers はここではインポート・使用しない ★
// import { Providers } from '@/components/providers';

// ロケール検証関数
const locales = ['en', 'ja'];
function isValidLocale(locale: string): boolean {
  return locales.includes(locale);
}

// (任意) メタデータ生成 (ルートレイアウトと別に定義する場合) ...

export default async function LocaleLayout({
  children,
  params: paramsPromise, // 引数名を変更 (任意だが推奨)
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>; // ★ 型を Promise に ★
}) {
  const { locale } = await paramsPromise; // ★ await で解決 ★

  if (!isValidLocale(locale)) {
    notFound();
  }

  let messages;
  try {
    messages = await getMessages({ locale });
  } catch (error) {
    console.error('Failed to load messages for locale:', locale, error);
    notFound();
  }
  if (!messages) {
    notFound();
  }

  // ★★★ <html> と <body> は削除し、Provider のみがトップレベル ★★★
  return (
    // NextIntlClientProvider はロケールごとに必要
    <NextIntlClientProvider locale={locale} messages={messages}>
      {/* Providers は既に上位の RootLayout で適用されているので不要 */}
      {children}
    </NextIntlClientProvider>
  );
}
```

## File: app/[locale]/page.tsx

```typescript
// src/app/[locale]/page.tsx (ボタン/リンク分離版)
"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("LandingPage");
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();

  const locale = Array.isArray(params?.locale)
    ? params.locale[0]
    : params?.locale || "en";

  useEffect(() => {
    if (!isLoading && user) {
      console.log("User is already logged in, redirecting to /decks...");
      router.push(`decks`);
    }
  }, [user, isLoading, router, locale]);

  if (isLoading || (!isLoading && user)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-900">
      <div className="z-10 w-full max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
          {t("welcome")}
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300 whitespace-pre-line">
          {t("subtitle")}
        </p>

        {/* ★★★ このdivブロックを修正 ★★★ */}
        <div className="mt-10 flex flex-col items-center justify-center gap-y-4">
          {/* プライマリーボタン (サインアップ) */}
          <Link
            href="/signup"
            className="w-full max-w-xs rounded-md bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {t("signupNow")}
          </Link>
          {/* セカンダリーリンク (ログイン) */}
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            {t("alreadyHaveAccount")}{" "}
            <Link
              href="/login"
              className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {t("loginHere")}
            </Link>
          </p>
        </div>
        {/* ★★★ 修正ここまで ★★★ */}
      </div>
    </main>
  );
}
```

## File: app/NextTamaguiProvider.tsx

```typescript
"use client";

import "@tamagui/core/reset.css";
import "@tamagui/polyfill-dev";

import { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { useServerInsertedHTML } from "next/navigation";
import { NextThemeProvider } from "@tamagui/next-theme";
import { TamaguiProvider } from "tamagui";
import tamaguiConfig from "../../tamagui.config";

export const NextTamaguiProvider = ({ children }: { children: ReactNode }) => {
  useServerInsertedHTML(() => {
    // @ts-expect-error - React Native WebのSSRで必要なため
    const rnwStyle = StyleSheet.getSheet();
    return (
      <>
        <style
          dangerouslySetInnerHTML={{ __html: rnwStyle.textContent }}
          id={rnwStyle.id}
        />
        <style
          dangerouslySetInnerHTML={{
            // the first time this runs you'll get the full CSS including all themes
            // after that, it will only return CSS generated since the last call
            __html: tamaguiConfig.getNewCSS(),
          }}
        />
      </>
    );
  });

  return (
    <NextThemeProvider skipNextHead>
      <TamaguiProvider config={tamaguiConfig} disableRootThemeClass>
        {children}
      </TamaguiProvider>
    </NextThemeProvider>
  );
};
```

## File: components/features/CardCreateForm.tsx

```typescript
// src/components/features/CardCreateForm.tsx (手動翻訳ボタン版)

'use client';

import React, { useState } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateCard } from '@/hooks/useCardMutations';
import { useTranslations } from 'next-intl';
import { useTranslateText } from '@/hooks/useTranslateText'; // 作成済みのフックをインポート
// AppError はこのファイルでは直接使わないのでインポート不要

// Validation schema (変更なし)
const cardSchema = z.object({
  front: z.string().min(1, 'Front text cannot be empty'),
  back: z.string().min(1, 'Back text cannot be empty'),
});
type CardFormData = z.infer<typeof cardSchema>;

interface CardCreateFormProps {
  deckId: string;
  onCardCreated?: () => void;
}

export const CardCreateForm: React.FC<CardCreateFormProps> = ({
  deckId,
  onCardCreated,
}) => {
  const t = useTranslations('cardCreateForm'); // i18n用 (必要なら)
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setValue, // Backフィールド更新用
    getValues,
    watch,
  } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: { front: '', back: '' },
  });

  // --- 翻訳関連の State ---
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // --- 翻訳実行フック ---
  const { mutate: translateText, isPending: translateIsPending } =
    useTranslateText({
      onSuccess: (data) => {
        console.log('Translation successful:', data.translation);
        // 翻訳結果を Back フィールドにセット
        setValue('back', data.translation, {
          shouldValidate: true,
          shouldDirty: true,
        });
        setIsTranslating(false);
        setTranslationError(null); // エラーをクリア
      },
      onError: (error) => {
        console.error('Translation failed:', error);
        setTranslationError(
          error.message || 'Translation failed. Please try again.'
        );
        setIsTranslating(false);
      },
    });

  // --- カード作成フック (変更なし) ---
  const {
    mutate: createCard,
    isPending: createIsPending,
    error: createError,
  } = useCreateCard(deckId, {
    onSuccess: () => {
      console.log('Card created, resetting form.');
      reset(); // フォームをリセット
      setTranslationError(null); // 翻訳エラーもクリア
      onCardCreated?.(); // 親コンポーネントへの通知
    },
    onError: (err) => {
      console.error('Card creation failed:', err);
    },
  });

  const watchedFront = watch('front');

  // --- イベントハンドラ ---
  const onSubmit: SubmitHandler<CardFormData> = (data) => {
    createCard(data);
  };

  // ★ 手動翻訳ボタンのクリックハンドラ ★
  const handleTranslateClick = () => {
    const frontValue = getValues('front'); // Front の現在の値を取得
    if (frontValue && frontValue.trim().length > 0) {
      setTranslationError(null); // 前のエラーをクリア
      setIsTranslating(true); // ローディング開始
      // 翻訳を実行 (言語はハードコード)
      translateText({
        text: frontValue,
        sourceLanguage: 'en', // Front は英語と仮定
        targetLanguage: 'ja', // Back は日本語と仮定
      });
    } else {
      // Front が空の場合のフィードバック (任意)
      setTranslationError('Front に翻訳するテキストを入力してください。');
    }
  };

  // 全体の処理中状態 (カード作成中 or 翻訳API呼び出し中)
  const isPending = createIsPending || isTranslating || translateIsPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Front Input */}
      <div className="space-y-1">
        <label
          htmlFor="front"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {t?.('frontLabel') || 'Front'} <span className="text-red-500">*</span>
        </label>
        <Controller
          name="front"
          control={control}
          render={({ field }) => (
            <textarea
              id="front"
              placeholder={
                t?.('frontPlaceholder') || 'Enter front text (English)...'
              }
              {...field}
              rows={3}
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.front
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60`} // disabled スタイル追加
              aria-invalid={errors.front ? 'true' : 'false'}
              // onBlur={handleFrontBlur} // onBlur は削除
              disabled={isPending} // 処理中は無効化
            />
          )}
        />
        {errors.front && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {' '}
            {errors.front.message}{' '}
          </p>
        )}

        {/* ★ 手動翻訳ボタンを追加 ★ */}
        <div className="pt-1 text-right">
          <button
            type="button" // フォーム送信を防ぐ
            onClick={handleTranslateClick}
            disabled={isPending || !watchedFront} // 処理中か Front が空なら無効
            className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* アイコンを追加しても良い (例: Heroicons の LanguageIcon) */}
            {isTranslating || translateIsPending
              ? '翻訳中...'
              : `Translate to ${t?.('backLabel') || 'Back'} (JA)`}
          </button>
        </div>
      </div>

      {/* Back Input (修正版) */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label
            htmlFor="back"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t?.('backLabel') || 'Back'} <span className="text-red-500">*</span>
          </label>
        </div>
        {/* ↓↓↓ Controller の name を "back" に修正 ↓↓↓ */}
        <Controller
          name="back" // ★ "back" に修正 ★
          control={control}
          render={({ field }) => (
            <textarea
              id="back" // ★ "back" に修正 ★
              placeholder={
                t?.('backPlaceholder') ||
                'Enter back text (Japanese)... or click translate'
              }
              {...field} // ★ これで "back" フィールドの状態が正しく反映される ★
              rows={3}
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.back
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60`}
              aria-invalid={errors.back ? 'true' : 'false'}
              disabled={isPending}
            />
          )}
        />
        {/* 翻訳エラー表示 */}
        {translationError && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {' '}
            {translationError}{' '}
          </p>
        )}
        {/* バリデーションエラー表示 (翻訳エラーがない時だけ) */}
        {errors.back && !translationError && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {' '}
            {errors.back.message}{' '}
          </p>
        )}
      </div>

      {/* カード作成APIエラー表示 (変更なし) */}
      {createError && (
        <div
          className="mt-2 p-2 border border-red-300 bg-red-50 dark:bg-red-900/30 rounded-md"
          role="alert"
        >
          <p className="text-sm text-red-700 dark:text-red-300">
            {/* Consider a more specific error message or use createError.message */}
            {t?.('creationError', { message: createError.message }) ||
              `Error creating card: ${createError.message}`}
          </p>
        </div>
      )}

      {/* 送信ボタン (変更なし) */}
      <div>
        <button
          type="submit"
          disabled={isPending} // 全体の処理中状態を反映
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createIsPending
            ? t?.('creatingButton') || 'Creating...'
            : t?.('createButton') || 'Add Card'}
        </button>
      </div>
    </form>
  );
};
```

## File: components/features/CardEditModal.tsx

```typescript
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cardUpdateSchema, CardUpdatePayload } from '@/lib/zod';
import { useUpdateCard, Card } from '@/hooks/useCardMutations'; // Use Card type from mutations (string dates)
import { AppError, isAppError } from '@/lib/errors';

interface CardEditModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  card: Card | null; // Expects Card with string dates
  deckId: string;
  onSuccess?: (updatedCard: Card) => void; // Callback on successful update
}

export const CardEditModal: React.FC<CardEditModalProps> = ({
  isOpen,
  onOpenChange,
  card,
  deckId,
  onSuccess,
}) => {
  const [apiError, setApiError] = useState<AppError | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CardUpdatePayload>({
    resolver: zodResolver(cardUpdateSchema),
    defaultValues: {
      front: '',
      back: '',
    },
  });

  const updateCardMutation = useUpdateCard(deckId, {
    onSuccess: (updatedCard) => {
      // Remove unused variables parameter
      console.log('Card updated successfully:', updatedCard);
      setApiError(null);
      onSuccess?.(updatedCard); // Call the prop onSuccess
      onOpenChange(false); // Close modal
    },
    onError: (error) => {
      // Remove unused _variables parameter
      // Use error directly
      console.error(`Error updating card:`, error);
      setApiError(error);
    },
  });

  // Effect to handle modal display state and reset form
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      setApiError(null); // Clear previous API errors when opening
      if (card) {
        // Reset form with current card data when modal opens or card changes
        reset({ front: card.front, back: card.back });
      } else {
        // Reset to empty if no card is provided (should ideally not happen if opened correctly)
        reset({ front: '', back: '' });
      }
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
        // Optionally reset form when closing, though reset on open might be sufficient
        // reset({ front: '', back: '' });
      }
    }
  }, [isOpen, card, reset]);

  // Effect to handle closing via Escape key or backdrop click
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onOpenChange(false);
      setApiError(null); // Clear API error on close
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (event.target === dialog) {
        handleClose();
      }
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('click', handleClickOutside);

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('click', handleClickOutside);
    };
  }, [onOpenChange]);

  const onSubmit: SubmitHandler<CardUpdatePayload> = (data) => {
    if (!card) {
      console.error('Attempted to submit edit form without a card.');
      setApiError(
        new AppError('No card selected for editing.', 400, 'VALIDATION_ERROR')
      );
      return;
    }
    setApiError(null); // Clear previous API error before new submission
    console.log('Submitting card update:', { cardId: card.id, data });
    updateCardMutation.mutate({ cardId: card.id, data });
  };

  const handleCancel = () => {
    onOpenChange(false);
    setApiError(null); // Clear API error on cancel
  };

  const isPending = updateCardMutation.isPending || isSubmitting;

  // Stringify details outside JSX to satisfy TypeScript
  const detailsString =
    apiError && isAppError(apiError) && apiError.details
      ? JSON.stringify(apiError.details, null, 2)
      : null;

  return (
    <dialog
      ref={dialogRef}
      className="p-6 rounded-lg shadow-xl bg-white dark:bg-gray-800 w-full max-w-md backdrop:bg-black backdrop:opacity-50"
    >
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Edit Card
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <label
            htmlFor="front"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Front
          </label>
          <textarea
            id="front"
            {...register('front')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
            aria-invalid={errors.front ? 'true' : 'false'}
          />
          {errors.front && (
            <p
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {errors.front.message}
            </p>
          )}
        </div>

        <div className="mb-6">
          <label
            htmlFor="back"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Back
          </label>
          <textarea
            id="back"
            {...register('back')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
            aria-invalid={errors.back ? 'true' : 'false'}
          />
          {errors.back && (
            <p
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {errors.back.message}
            </p>
          )}
        </div>

        {/* Display API Error */}
        {apiError && (
          <div
            className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900 dark:border-red-700 dark:text-red-200"
            role="alert"
          >
            <p className="font-semibold">Error Updating Card</p>
            <p>{apiError.message}</p>
            {detailsString && (
              <pre className="mt-2 text-xs overflow-auto">{detailsString}</pre>
            )}
          </div>
        )}
        {/* Display Zod refine error */}
        {errors.root && ( // Check for root errors from refine
          <p
            className="mt-1 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {errors.root.message}
          </p>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500 dark:focus:ring-offset-gray-800"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800"
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </dialog>
  );
};
```

## File: components/features/CardList.tsx

```typescript
"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useCards, Card } from "@/hooks/useCards";
import { AiContentType } from "@prisma/client";
import {
  useDeleteCard,
  Card as CardWithStringDates,
} from "@/hooks/useCardMutations";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { CardEditModal } from "./CardEditModal";
import {
  useGenerateTts,
  type TtsPayload,
  type TtsSuccessResponse,
} from "@/hooks/useGenerateTts";
import {
  useSaveAiContent,
  type SaveAiContentVariables,
} from "@/hooks/useSaveAiContent";
import { useGetTtsUrl } from "@/hooks/useGetTtsUrl";
import { SpeakerWaveIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { AppError } from "@/lib/errors";
import { type AICardContentApiResponse } from "@/types/api.types";

interface CardListProps {
  deckId: string;
}

export function CardList({ deckId }: CardListProps) {
  const ITEMS_PER_PAGE = 10;
  const [offset, setOffset] = useState(0);

  const {
    cards,
    pagination,
    isLoading,
    isFetching,
    error: fetchCardsError,
  } = useCards(deckId, { offset: offset, limit: ITEMS_PER_PAGE });

  // Component State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [editingCard, setEditingCard] = useState<CardWithStringDates | null>(
    null,
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [gcsPathToFetch, setGcsPathToFetch] = useState<string | null>(null);
  const [urlToPlay, setUrlToPlay] = useState<string | null>(null);
  const [ttsErrorMsg, setTtsErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const queryClient = useQueryClient();

  const deleteCardMutation = useDeleteCard(deckId, {
    onSuccess: (deletedCardId: string) => {
      console.log(`Successfully deleted card ${deletedCardId}`);
      setIsDeleteDialogOpen(false);
      setCardToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["cards", deckId] });
    },
    onError: (error: AppError, cardId: string) => {
      console.error(`Failed to delete card ${cardId}:`, error.message);
      setIsDeleteDialogOpen(false);
      setCardToDelete(null);
      alert(`Error deleting card: ${error.message}`);
    },
  });

  const { mutate: saveAiContentMutate, isPending: isSavingContent } =
    useSaveAiContent({
      onSuccess: (
        _data: AICardContentApiResponse,
        variables: SaveAiContentVariables,
      ) => {
        console.log(`[CardList] AI Content saved for card ${variables.cardId}`);
        queryClient.invalidateQueries({ queryKey: ["cards", deckId] });
        setLoadingAudioId(null);
      },
      onError: (error: AppError, variables: SaveAiContentVariables) => {
        console.error(
          `[CardList] Failed to save AI content for card ${variables.cardId}:`,
          error,
        );
        setTtsErrorMsg(`Failed to save audio info: ${error.message}`);
        setLoadingAudioId(null);
      },
    });

  const { mutate: generateTtsMutate, isPending: ttsIsPending } = useGenerateTts(
    {
      onSuccess: (
        data: TtsSuccessResponse,
        variables: TtsPayload,
        _context: unknown,
      ) => {
        console.log("[CardList] TTS generated:", data.signedUrl, data.gcsPath);
        setUrlToPlay(data.signedUrl);
        saveAiContentMutate({
          cardId: variables.cardId,
          contentType:
            variables.side === "front"
              ? AiContentType.AUDIO_PRIMARY
              : AiContentType.AUDIO_SECONDARY,
          language:
            variables.language ||
            (variables.side === "front" ? "en-US" : "ja-JP"),
          content: data.gcsPath,
        });
      },
      onError: (error: AppError, variables: TtsPayload, _context: unknown) => {
        console.error(
          `[CardList] TTS generation failed for card ${variables.cardId}:`,
          error,
        );
        setTtsErrorMsg(`Audio generation failed: ${error.message}`);
        setLoadingAudioId(null);
      },
    },
  );

  const {
    data: signedUrlData,
    isLoading: isFetchingUrl,
    error: fetchUrlError,
  } = useGetTtsUrl(gcsPathToFetch);

  useEffect(() => {
    if (signedUrlData?.signedUrl) {
      setUrlToPlay(signedUrlData.signedUrl);
      setGcsPathToFetch(null);
    }
  }, [signedUrlData]);
  useEffect(() => {
    if (fetchUrlError) {
      console.error(
        "[CardList] Failed to get signed URL via hook:",
        fetchUrlError,
      );
      setTtsErrorMsg(`Failed to get audio URL: ${fetchUrlError.message}`);
      setLoadingAudioId(null);
      setGcsPathToFetch(null);
    }
  }, [fetchUrlError]);
  useEffect(() => {
    if (urlToPlay) {
      console.log("[CardList] Playing audio:", urlToPlay);
      try {
        const audio = new Audio(urlToPlay);
        audio.play();
        audio.onended = () => setLoadingAudioId(null);
        audio.onerror = () => {
          console.error("Audio element error");
          setTtsErrorMsg("Audio playback failed.");
          setLoadingAudioId(null);
        };
      } catch (audioError) {
        console.error("Error initiating audio playback:", audioError);
        setTtsErrorMsg("Audio playback failed.");
        setLoadingAudioId(null);
      } finally {
        setUrlToPlay(null);
      }
    }
  }, [urlToPlay]);

  // Event Handlers
  const handleDeleteClick = (cardId: string) => {
    setCardToDelete(cardId);
    setIsDeleteDialogOpen(true);
  };
  const handleConfirmDelete = () => {
    if (cardToDelete) {
      deleteCardMutation.mutate({ cardId: cardToDelete });
    }
  };
  const handleEditClick = (card: Card) => {
    const cardForModal: CardWithStringDates = {
      ...card,
      createdAt: String(card.createdAt ?? ""),
      updatedAt: String(card.updatedAt ?? ""),
      nextReviewAt: String(card.nextReviewAt ?? ""),
    };
    setEditingCard(cardForModal);
    setIsEditModalOpen(true);
  };
  const handlePlayAudio = (card: Card, side: "front" | "back") => {
    const languageCode =
      side === "front"
        ? process.env.NEXT_PUBLIC_TTS_LANGUAGE_CODE_EN || "en-US"
        : process.env.NEXT_PUBLIC_TTS_LANGUAGE_CODE_JA || "ja-JP";
    const contentTypeToFind =
      side === "front"
        ? AiContentType.AUDIO_PRIMARY
        : AiContentType.AUDIO_SECONDARY;
    const loadingId = `${card.id}-${side}`;
    if (loadingAudioId) return;
    setTtsErrorMsg(null);
    const existingAudio = card.aiContents?.find(
      (c) => c.contentType === contentTypeToFind && c.language === languageCode,
    );
    const gcsPath = existingAudio?.content;
    if (gcsPath) {
      setLoadingAudioId(loadingId);
      setGcsPathToFetch(gcsPath);
    } else {
      const text = side === "front" ? card.front : card.back;
      if (text && text.trim().length > 0) {
        setLoadingAudioId(loadingId);
        generateTtsMutate({
          text,
          language: languageCode,
          cardId: card.id,
          side,
        });
      } else {
        setTtsErrorMsg("No text available to synthesize.");
      }
    }
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading cards...</div>;
  }
  if (fetchCardsError) {
    return (
      <div className="p-4 text-red-600 bg-red-100 border border-red-400 rounded">
        Error: {fetchCardsError.message}
      </div>
    );
  }
  const hasCards = cards && cards.length > 0;
  if (!hasCards) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
        No cards found in this deck yet.
      </p>
    );
  }

  return (
    <div>
      {ttsErrorMsg && (
        <div
          className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
          role="alert"
        >
          Audio Error: {ttsErrorMsg}
        </div>
      )}
      <ul className="space-y-4">
        {cards.map((card: Card) => {
          const isLoadingFront = loadingAudioId === `${card.id}-front`;
          const isLoadingBack = loadingAudioId === `${card.id}-back`;
          const isDeleting =
            deleteCardMutation.isPending && cardToDelete === card.id;
          const isAnyAudioProcessing =
            isFetchingUrl || ttsIsPending || isSavingContent;
          const disablePlayButton = isAnyAudioProcessing || isDeleting;
          const disableEditDeleteButton = isDeleting;

          return (
            <li
              key={card.id}
              className="p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700 transition hover:shadow-md"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-grow">
                  {/* Front + Play Button */}
                  <div className="mb-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">
                        Front
                      </p>
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(card, "front")}
                        disabled={disablePlayButton || !card.front}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed p-0.5"
                        aria-label="Play front audio"
                        title="Play front audio"
                      >
                        {isLoadingFront ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <SpeakerWaveIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap mt-1">
                      {card.front}
                    </p>
                  </div>
                  {/* Back + Play Button */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">
                        Back
                      </p>
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(card, "back")}
                        disabled={disablePlayButton || !card.back}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed p-0.5"
                        aria-label="Play back audio"
                        title="Play back audio"
                      >
                        {isLoadingBack ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <SpeakerWaveIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap mt-1">
                      {card.back}
                    </p>
                  </div>
                  {/* AI Content Display */}
                  {card.aiContents && card.aiContents.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                        AI Content:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {card.aiContents.map((content) => (
                          <span
                            key={content.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                            title={`Type: ${content.contentType}, Lang: ${content.language}`}
                          >
                            {content.contentType === AiContentType.EXPLANATION
                              ? "Expl."
                              : content.contentType ===
                                  AiContentType.TRANSLATION
                                ? "Transl."
                                : content.contentType.replace(
                                    "AUDIO_",
                                    "Aud.",
                                  )}{" "}
                            ({content.language})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* Action Buttons Area */}
                <div className="flex flex-col space-y-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEditClick(card)}
                    disabled={disableEditDeleteButton}
                    className="px-2.5 py-1 text-xs font-medium text-center text-yellow-700 bg-yellow-100 rounded hover:bg-yellow-200 focus:ring-4 focus:outline-none focus:ring-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:hover:bg-yellow-800/50 dark:focus:ring-yellow-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {" "}
                    Edit{" "}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(card.id)}
                    disabled={disableEditDeleteButton}
                    className="px-2.5 py-1 text-xs font-medium text-center text-red-700 bg-red-100 rounded hover:bg-red-200 focus:ring-4 focus:outline-none focus:ring-red-300 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-800/50 dark:focus:ring-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {" "}
                    {isDeleting ? "..." : "Delete"}{" "}
                  </button>
                </div>
              </div>
              {/* SRS Info */}
              <div className="text-right text-xs text-gray-400 dark:text-gray-500 mt-1">
                {" "}
                Next: {new Date(card.nextReviewAt).toLocaleDateString()} (I:
                {card.interval}, EF:{card.easeFactor.toFixed(1)}){" "}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Pagination Controls */}
      {isMounted && pagination && pagination.totalItems > ITEMS_PER_PAGE && (
        <div className="mt-6 flex items-center justify-center space-x-4">
          <button
            onClick={() => setOffset(Math.max(0, offset - ITEMS_PER_PAGE))}
            disabled={!pagination._links.previous || isFetching}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {" "}
            Previous{" "}
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {" "}
            Page {Math.floor(offset / ITEMS_PER_PAGE) + 1} /{" "}
            {Math.ceil(pagination.totalItems / ITEMS_PER_PAGE)} (
            {pagination.totalItems} items){" "}
          </span>
          <button
            onClick={() => setOffset(offset + ITEMS_PER_PAGE)}
            disabled={!pagination._links.next || isFetching}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {" "}
            Next{" "}
          </button>
        </div>
      )}

      {/* Modals */}
      {isMounted &&
        createPortal(
          <ConfirmationDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onConfirm={handleConfirmDelete}
            title="Delete Card"
            description="Are you sure you want to delete this card? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            isConfirming={deleteCardMutation.isPending}
          />,
          document.body,
        )}
      {isMounted &&
        editingCard &&
        createPortal(
          <CardEditModal
            isOpen={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            card={editingCard}
            deckId={deckId}
            onSuccess={() => {
              setIsEditModalOpen(false);
              setEditingCard(null);
            }}
          />,
          document.body,
        )}
    </div>
  );
}
```

## File: components/features/DeckCreateForm.tsx

```typescript
'use client';

import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { deckCreateSchema, type DeckCreatePayload } from '@/lib/zod';
import { useCreateDeck, ApiError } from '@/hooks/useDeckMutations'; // Import ApiError
import { AuthError } from '@supabase/supabase-js'; // Import AuthError if needed for specific handling

interface DeckCreateFormProps {
  /** Optional callback function triggered on successful deck creation. */
  onSuccess?: () => void;
}

export const DeckCreateForm: React.FC<DeckCreateFormProps> = ({
  onSuccess,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DeckCreatePayload>({
    resolver: zodResolver(deckCreateSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const { mutate, isPending, error } = useCreateDeck();

  const onSubmit: SubmitHandler<DeckCreatePayload> = (data) => {
    const payload = {
      ...data,
      description: data.description === '' ? null : data.description,
    };
    mutate(payload, {
      onSuccess: () => {
        reset();
        onSuccess?.();
      },
      onError: (err) => {
        console.error('Form submission error:', err);
      },
    });
  };

  let errorMessage: string | null = null;
  if (error) {
    if (error instanceof ApiError) {
      errorMessage = `Error: ${error.message} (Status: ${error.status})`;
      // Safely access the machine-readable code from the details property
      if (
        typeof error.details === 'object' &&
        error.details !== null &&
        'error' in error.details
      ) {
        // Now we know error.details is an object with an 'error' property
        // We might still want to check the type of error.details.error if needed
        const errorCode = (error.details as { error?: unknown }).error; // Cast to access
        if (errorCode) {
          // Check if errorCode is truthy
          errorMessage += ` [Code: ${errorCode}]`;
        }
      }
    } else if (error instanceof AuthError) {
      errorMessage = `Authentication Error: ${error.message}`;
    } else {
      errorMessage = 'An unexpected error occurred.';
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label
          htmlFor="deck-name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Deck Name <span className="text-red-500">*</span>
        </label>
        <input
          id="deck-name"
          type="text"
          {...register('name')}
          className={`mt-1 block w-full px-3 py-2 border ${
            errors.name
              ? 'border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
          aria-invalid={errors.name ? 'true' : 'false'}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="deck-description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Description (Optional)
        </label>
        <textarea
          id="deck-description"
          {...register('description')}
          rows={3}
          className={`mt-1 block w-full px-3 py-2 border ${
            errors.description
              ? 'border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
          aria-invalid={errors.description ? 'true' : 'false'}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Display API Error Message */}
      {errorMessage && (
        <div
          className="mt-2 p-2 border border-red-300 bg-red-50 dark:bg-red-900/30 rounded-md"
          role="alert"
        >
          <p className="text-sm text-red-700 dark:text-red-300">
            {errorMessage}
          </p>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? '作成中...' : 'Create Deck'}
        </button>
      </div>
    </form>
  );
};
```

## File: components/features/DeckCreateModal.tsx

```typescript
// src/components/features/DeckCreateModal.tsx
import React from 'react';
import { DeckCreateForm } from './DeckCreateForm';

interface DeckCreateModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess?: () => void;
}

export function DeckCreateModal({
  isOpen,
  onOpenChange,
  onSuccess,
}: DeckCreateModalProps) {
  const handleSuccess = () => {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm" // Added background/blur to overlay div
      aria-labelledby="deck-create-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={handleOverlayClick} // Close on overlay click
    >
      {/* Modal Content - Stop propagation */}
      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transform transition-all sm:my-8"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className="p-6 space-y-4">
          <h2
            id="deck-create-modal-title"
            className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100"
          >
            Create New Deck
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {/* ★★★ Fixed ' */}
            Enter the name for your new deck. Click save when you&apos;re done.
          </p>
          <DeckCreateForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}
```

## File: components/features/DeckEditModal.tsx

```typescript
"use client";

import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { deckUpdateSchema, DeckUpdatePayload } from "src/lib/zod";
import { useUpdateDeck, ApiError } from "src/hooks/useDeckMutations";
import type { DeckApiResponse } from "src/types";
import type { AppError } from "src/lib/errors";
import { AuthError } from "@supabase/supabase-js";

interface DeckEditModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  deck: DeckApiResponse | null;
  onSuccess?: () => void;
}

export const DeckEditModal: React.FC<DeckEditModalProps> = ({
  isOpen,
  onOpenChange,
  deck,
  onSuccess,
}) => {
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DeckUpdatePayload>({
    resolver: zodResolver(deckUpdateSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (isOpen && deck) {
      reset({
        name: deck.name,
        description: deck.description ?? "",
      });
      setApiError(null);
    }
    // Optional: Clear form when modal closes (uncomment if needed)
    // if (!isOpen) {
    //   reset({ name: '', description: '' });
    //   setApiError(null);
    // }
  }, [isOpen, deck, reset]);

  const handleSuccess = (updatedDeck: DeckApiResponse) => {
    console.log("Deck updated successfully:", updatedDeck);
    setApiError(null);
    onSuccess?.();
    onOpenChange(false);
  };

  const handleError = (error: ApiError | AuthError | AppError) => {
    console.error("Error updating deck:", error);
    const message =
      "message" in error ? error.message : "An unexpected error occurred.";
    setApiError(message);
  };

  const {
    mutate: updateDeckMutate,
    isPending: updateIsPending,
    error: mutationError,
  } = useUpdateDeck();

  const onSubmit: SubmitHandler<DeckUpdatePayload> = (data) => {
    if (!deck) {
      setApiError("Error: No deck selected for editing.");
      return;
    }

    const dataToSubmit: DeckUpdatePayload = {
      ...data,
      description: data.description === "" ? null : data.description,
    };

    const hasChanges =
      dataToSubmit.name !== deck.name ||
      dataToSubmit.description !== deck.description;
    if (!hasChanges) {
      onOpenChange(false);
    }

    setApiError(null);
    updateDeckMutate(
      { deckId: deck.id, data: dataToSubmit },
      { onSuccess: handleSuccess, onError: handleError },
    );
    // Early return if modal is not open
    if (!isOpen) {
      return null;
    }

    // Determine if the submit button should be disabled
    const isProcessing = isSubmitting || updateIsPending;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm  bg-red-500 border-8 border-lime-400">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md relative">
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Edit Deck
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="mb-4">
              <label
                htmlFor="deck-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Deck Name
              </label>
              <input
                id="deck-name"
                type="text"
                {...register("name")}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.name
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                aria-invalid={errors.name ? "true" : "false"}
              />
              {errors.name && (
                <p
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="deck-description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Description (Optional)
              </label>
              <textarea
                id="deck-description"
                rows={3}
                {...register("description")}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.description
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                aria-invalid={errors.description ? "true" : "false"}
              />
              {errors.description && (
                <p
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* API Error Display */}
            {apiError && (
              <div
                className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md dark:bg-red-900 dark:border-red-700 dark:text-red-200"
                role="alert"
              >
                <p className="text-sm">{apiError}</p>
              </div>
            )}
            {/* Display mutation error if not handled by apiError state already */}
            {mutationError && !apiError && (
              <div
                className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md dark:bg-red-900 dark:border-red-700 dark:text-red-200"
                role="alert"
              >
                <p className="text-sm">
                  {"message" in mutationError
                    ? mutationError.message
                    : "An unexpected error occurred during submission."}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  isProcessing
                    ? "bg-indigo-400 cursor-not-allowed dark:bg-indigo-700"
                    : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                }`}
                disabled={isProcessing}
              >
                {isProcessing ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
};
```

## File: components/providers/AuthProvider.tsx

```typescript
// src/components/providers/AuthProvider.tsx (ルーティングフック修正版)
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Session, User, AuthChangeEvent } from "@supabase/supabase-js"; // SupabaseClient は直接使わないので削除
import { createClient } from "@/lib/supabase";
// ★ 標準の next/navigation からフックをインポート ★
import { useRouter, usePathname, useParams } from "next/navigation";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ★ 標準の next/navigation フックを使用 ★
  const router = useRouter();
  const currentFullPath = usePathname(); // 例: /ja/login, /en, /decks
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";

  useEffect(() => {
    setIsLoading(true);
    console.log(
      "AuthProvider: useEffect triggered. Current full path:",
      currentFullPath,
      "Current locale:",
      locale,
    );

    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        console.log("AuthProvider: Initial session fetched:", initialSession);
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setIsLoading(false);

        if (initialSession) {
          const publicFullPaths = [
            `/${locale}`,
            `/${locale}/login`,
            `/${locale}/signup`,
            `/`, // ルートも考慮 (デフォルトロケールでプレフィックスなしの場合)
            `/login`,
            `/signup`,
          ];
          if (publicFullPaths.includes(currentFullPath)) {
            console.log(
              `AuthProvider: User initially signed in and on public path "<span class="math-inline">\{currentFullPath\}"\. Redirecting to /</span>{locale}/decks`,
            );
            router.push(`/decks`);
          }
        }
      })
      .catch((error) => {
        console.error("AuthProvider: Error getting initial session:", error);
        setIsLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, newSession: Session | null) => {
        console.log(
          `AuthProvider: Auth state changed: Event: ${_event}, New Session:`,
          newSession,
        );
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsLoading(false);

        if (_event === "SIGNED_IN" && newSession) {
          const publicFullPaths = [
            `/${locale}`,
            `/${locale}/login`,
            `/${locale}/signup`,
            `/`,
            `/login`,
            `/signup`,
          ];
          console.log(
            `AuthProvider: SIGNED_IN event. Current full path: "${currentFullPath}". User: ${newSession.user.email}`,
          );

          if (publicFullPaths.includes(currentFullPath)) {
            console.log(
              `AuthProvider: User signed in via <span class="math-inline">\{\_event\} and on public path "</span>{currentFullPath}". Redirecting to /${locale}/decks`,
            );
            router.push(`/${locale}/decks`);
          } else {
            console.log(
              `AuthProvider: User signed in via <span class="math-inline">\{\_event\}, already on an app path "</span>{currentFullPath}". No redirect needed from AuthProvider.`,
            );
          }
        } else if (_event === "PASSWORD_RECOVERY" && newSession) {
          console.log(
            `AuthProvider: PASSWORD_RECOVERY event. User: ${newSession.user.email}. Current path: ${currentFullPath}`,
          );
          // Supabase URL Configuration で /reset-password にリダイレクト設定されていれば、
          // そのページにいるはず。そうでなければリダイレクト。
          const resetPasswordPath = `/${locale}/reset-password`;
          if (currentFullPath !== resetPasswordPath) {
            console.log(`Redirecting to ${resetPasswordPath}`);
            router.push(resetPasswordPath);
          }
        } else if (_event === "SIGNED_OUT") {
          console.log(
            "AuthProvider: SIGNED_OUT event. Redirecting to login page.",
          );
          router.push(`/${locale}/login`);
        }
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router, currentFullPath, locale]); // currentFullPath, locale を依存配列に追加

  const value = {
    session,
    user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
```

## File: components/ui/ConfirmationDialog.tsx

```typescript
"use client";

import React from "react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean; // Confirmation processing loading state
}

export function ConfirmationDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm", // Default value
  cancelText = "Cancel", // Default value
  isConfirming = false,
}: ConfirmationDialogProps) {
  // Handle closing the modal when clicking the overlay
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  if (!isOpen) {
    return null; // Don't render anything if the modal is closed
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-500 border-8 border-lime-400"
      aria-labelledby="confirmation-dialog-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        aria-hidden="true"
        onClick={handleOverlayClick} // Close on overlay click
      ></div>

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transform transition-all sm:my-8">
        <div className="p-6 space-y-4">
          {" "}
          {/* Replaced YStack */}
          <h2
            id="confirmation-dialog-title"
            className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100"
          >
            {" "}
            {/* Replaced Dialog.Title */}
            {title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {" "}
            {/* Replaced Dialog.Description/Paragraph */}
            {description}
          </p>
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            {" "}
            {/* Replaced XStack */}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-label={cancelText}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isConfirming}
              className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={confirmText}
            >
              {isConfirming ? "Processing..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## File: components/AuthStatus.tsx

```typescript
"use client";

import { useAuth } from "../hooks/useAuth";
import { Link } from "../i18n/navigation";
import { useRouter } from "../i18n/navigation";

export function AuthStatus() {
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    console.log("Attempting to sign out..."); // ログアウト試行ログ
    const { error } = await signOut();
    if (error) {
      console.error("Error signing out:", error);
      // オプション: ユーザーにエラーメッセージを表示
      alert(`Logout failed: ${error.message}`);
    } else {
      // ログアウト成功後、ホームページやログインページにリダイレクト
      console.log("Successfully signed out. Redirecting to /login...");
      router.push("/login"); // ログインページへ
      // セッション状態がサーバー側でクリアされるのを待ってからリフレッシュする方が良い場合がある
      // 少し待ってからリフレッシュするか、リダイレクト先で状態を再確認する
      setTimeout(() => router.refresh(), 100); // わずかに遅延させてリフレッシュ
    }
  };

  // 認証状態をロード中はシンプルな表示
  if (isLoading) {
    return (
      <div className="p-2 border-b text-sm text-center text-gray-500 dark:text-gray-400">
        Loading user status...
      </div>
    );
  }

  // ログイン状態に応じた表示
  return (
    <div className="p-2 border-b mb-4 text-sm bg-gray-50 dark:bg-gray-800">
      {user ? (
        // ログイン中の表示
        <div className="container mx-auto flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-200">
            Logged in as: <strong>{user.email}</strong>
          </span>
          <button
            onClick={handleSignOut}
            className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Log Out
          </button>
        </div>
      ) : (
        // 未ログインの表示
        <div className="container mx-auto flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-200">
            You are not logged in.
          </span>
          <div>
            <Link href="/login" className="text-blue-600 hover:underline mr-4">
              Log In
            </Link>
            <Link href="/signup" className="text-blue-600 hover:underline">
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
```

## File: components/providers.tsx

```typescript
'use client'; // Mark this as a Client Component

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './providers/AuthProvider'; // Import AuthProvider

// Create a React Query client instance (only once per app load)
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Default options for queries if needed
        staleTime: 60 * 1000, // 1 minute
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Initialize queryClient using state to ensure it's stable across re-renders
  // NOTE: useState ensures the client is created only once per component instance.
  // Use getQueryClient to handle server/client differences.
  const [queryClient] = useState(() => getQueryClient());

  return (
    // Wrap with AuthProvider
    <AuthProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AuthProvider>
  );
}
```

## File: hooks/useAuth.ts

```typescript
import { createClient } from "@/lib/supabase";
import { AuthError, User, Session } from "@supabase/supabase-js";
import { useAuthContext } from "@/components/providers/AuthProvider";

interface AuthHookValue {
  // Auth state from context
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  // Auth functions
  signUp: (
    email: string,
    password: string,
  ) => Promise<{
    data: { user: User | null; session: Session | null };
    error: AuthError | null;
  }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    data: { user: User | null; session: Session | null };
    error: AuthError | null;
  }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

export const useAuth = (): AuthHookValue => {
  const { session, user, isLoading } = useAuthContext();
  const supabase = createClient();

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      console.error("Sign up error:", error.message);
    }
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error("Sign in error:", error.message);
    }
    return { data, error };
  };

  const signOut = async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out error:", error.message);
    }
    return { error };
  };

  return { session, user, isLoading, signUp, signIn, signOut };
};

export function isAuthError(error: unknown): error is AuthError {
  if (error && typeof error === "object") {
    return "message" in error && "status" in error;
  }
  return false;
}
```

## File: hooks/useCardMutations.ts

```typescript
// src/hooks/useCardMutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppError, ERROR_CODES } from "@/lib/errors";
// import { useLocale } from 'next-intl'; // Removed
import { type CardUpdatePayload } from "@/lib/zod";

// Define or import Card type
export interface Card {
  id: string;
  front: string;
  back: string;
  deckId: string;
  interval: number;
  easeFactor: number;
  nextReviewAt: string | Date; // Use string if API returns string, Date if objects are preferred
  createdAt: string | Date;
  updatedAt: string | Date;
  explanation?: string | null;
  translation?: string | null;
}

type CreateCardData = {
  front: string;
  back: string;
};

type CreateCardContext = {
  deckId: string;
};

// --- Create Card API Call ---
const createCardApi = async (
  { deckId }: CreateCardContext,
  newData: CreateCardData,
): Promise<Card> => {
  const apiUrl = `/api/decks/${deckId}/cards`; // locale-independent
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new AppError(
      errorData.message || "Failed to create card",
      response.status,
      errorData.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      errorData.details,
    );
  }
  return response.json();
};

// --- useCreateCard Hook ---
export const useCreateCard = (
  deckId: string,
  options?: {
    onSuccess?: (data: Card) => void;
    onError?: (error: AppError) => void;
  },
) => {
  const queryClient = useQueryClient();
  return useMutation<Card, AppError, CreateCardData>({
    mutationFn: (newData) => createCardApi({ deckId }, newData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cards", deckId] });
      console.log("Card created successfully:", data);
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error("Error creating card:", error);
      options?.onError?.(error);
    },
  });
};

// --- Delete Card API Call ---
const deleteCardApi = async (deckId: string, cardId: string): Promise<void> => {
  const apiUrl = `/api/decks/${deckId}/cards/${cardId}`; // locale-independent
  const response = await fetch(apiUrl, { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    let errorData = {
      message: "Failed to delete card",
      errorCode: "API_ERROR",
      details: null,
    };
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        errorData = await response.json();
      }
    } catch (_e) {
      // _e is unused
      console.warn(
        "Could not parse error response body for DELETE card request.",
      );
    }
    throw new AppError(
      errorData.message || "Failed to delete card",
      response.status,
      ERROR_CODES[errorData.errorCode as keyof typeof ERROR_CODES] ||
        ERROR_CODES.INTERNAL_SERVER_ERROR,
      errorData.details,
    );
  }
};

// --- useDeleteCard Hook ---
export const useDeleteCard = (
  deckId: string,
  options?: {
    onSuccess?: (cardId: string) => void;
    onError?: (error: AppError, cardId: string) => void;
  },
) => {
  const queryClient = useQueryClient();
  return useMutation<void, AppError, { cardId: string }>({
    mutationFn: ({ cardId }) => deleteCardApi(deckId, cardId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cards", deckId] });
      console.log(
        `Card ${variables.cardId} deleted successfully from deck ${deckId}`,
      );
      options?.onSuccess?.(variables.cardId);
    },
    onError: (error, variables) => {
      console.error(`Error deleting card ${variables.cardId}:`, error);
      options?.onError?.(error, variables.cardId);
    },
  });
};

// --- Update Card API Call ---
const updateCardApi = async (
  deckId: string,
  cardId: string,
  updateData: CardUpdatePayload,
): Promise<Card> => {
  const apiUrl = `/api/decks/${deckId}/cards/${cardId}`; // locale-independent
  console.log(`[updateCardApi] Calling PUT ${apiUrl}`);
  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData),
  });
  if (!response.ok) {
    let errorData = {
      message: `Failed to update card (Status: ${response.status})`,
      errorCode: "API_ERROR",
      details: null,
    };
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        errorData = await response.json();
      }
    } catch (e) {
      console.warn("[updateCardApi] Could not parse error response body:", e);
    }
    throw new AppError(
      errorData.message,
      response.status,
      ERROR_CODES[errorData.errorCode as keyof typeof ERROR_CODES] ||
        ERROR_CODES.INTERNAL_SERVER_ERROR,
      errorData.details,
    );
  }
  return response.json();
};

// --- useUpdateCard Hook ---
export const useUpdateCard = (
  deckId: string,
  options?: {
    onSuccess?: (
      updatedCard: Card,
      variables: { cardId: string; data: CardUpdatePayload },
    ) => void;
    onError?: (
      error: AppError,
      variables: { cardId: string; data: CardUpdatePayload },
    ) => void;
  },
) => {
  const queryClient = useQueryClient();
  return useMutation<
    Card,
    AppError,
    { cardId: string; data: CardUpdatePayload }
  >({
    mutationFn: ({ cardId, data }) => updateCardApi(deckId, cardId, data),
    onSuccess: (updatedCard, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cards", deckId] });
      console.log(
        `Card ${variables.cardId} updated successfully:`,
        updatedCard,
      );
      options?.onSuccess?.(updatedCard, variables);
    },
    onError: (error, variables) => {
      console.error(`Error updating card ${variables.cardId}:`, error);
      options?.onError?.(error, variables);
    },
  });
};
```

## File: hooks/useCards.ts

```typescript
// src/hooks/useCards.ts (Updated for aiContents and explicit return type)

import { useQuery } from "@tanstack/react-query";
import { AppError, isAppError } from "@/lib/errors";
// Import types needed for pagination and the card data structure (including aiContents)
import {
  type PaginatedCardsResponse, // Contains CardApiResponse[] with aiContents
  type CardApiResponse, // Card type including aiContents
  type PaginationMeta, // Pagination metadata type
} from "@/types/api.types";

// Interface for potential error object structure from the API
// Consider using ApiErrorResponse from api.types.ts if it matches the actual error structure
interface ApiErrorLike {
  message?: string;
  errorCode?: string; // Assuming AppError might add this
  details?: unknown;
}

// --- API function to fetch paginated cards ---
// Logic remains largely the same, types are updated via imports
const fetchPaginatedCards = async (
  deckId: string,
  offset: number,
  limit: number,
): Promise<PaginatedCardsResponse> => {
  if (!deckId) {
    // This check is important, although 'enabled' should prevent calls without deckId
    throw new Error("Deck ID is required to fetch cards.");
  }

  // Construct URL with pagination query parameters
  const params = new URLSearchParams({
    offset: offset.toString(),
    limit: limit.toString(),
  });
  const apiUrl = `/api/decks/${deckId}/cards?${params.toString()}`; // Use locale-independent path
  console.log(`[useCards fetcher] Fetching cards from: ${apiUrl}`);

  const response = await fetch(apiUrl);

  if (!response.ok) {
    // --- Error Handling (Existing logic) ---
    let errorData: ApiErrorLike = {
      message: `Failed to fetch cards for deck ${deckId}. Status: ${response.status}`,
    };
    try {
      const contentType = response.headers.get("content-type");
      if (
        response.body &&
        contentType &&
        contentType.includes("application/json")
      ) {
        // Try to parse JSON error, potentially matching ApiErrorResponse or AppError structure
        errorData = await response.json();
      } else if (response.body) {
        const textResponse = await response.text();
        console.warn(
          `[useCards fetcher] Received non-JSON error response: ${textResponse.substring(0, 100)}`,
        );
        // Ensure errorData is an object before assigning message
        if (typeof errorData === "object" && errorData !== null) {
          errorData.message = textResponse.substring(0, 100); // Use part of the text as the message
        }
      }
    } catch (e) {
      console.warn(
        "[useCards fetcher] Could not parse error response body:",
        e,
      );
    }

    // Throw specific AppError if possible, otherwise a generic Error
    if (isAppError(errorData)) {
      // If errorData matches AppError structure (checked by type guard)
      throw new AppError(
        errorData.message, // Guaranteed string by AppError
        response.status,
        errorData.errorCode, // Guaranteed ErrorCode by AppError
        errorData.details,
      );
    } else {
      // Handle cases where errorData is not a structured AppError
      const errorMessage =
        typeof errorData === "object" &&
        errorData !== null &&
        "message" in errorData &&
        typeof errorData.message === "string"
          ? errorData.message // Use message if available
          : `Failed to fetch cards for deck ${deckId}. Status: ${response.status}`; // Fallback message
      // Consider throwing AppError with a default code if appropriate
      // throw new AppError(errorMessage, response.status, 'INTERNAL_SERVER_ERROR');
      throw new Error(errorMessage); // Stick to generic Error for now
    }
    // --- End Error Handling ---
  }

  // Assume the API returns the PaginatedCardsResponse structure directly
  const data: PaginatedCardsResponse = await response.json();
  // Optional: Add validation here if needed (e.g., using Zod)
  if (!data || !Array.isArray(data.data) || !data.pagination) {
    console.error("[useCards fetcher] Invalid response format received:", data);
    throw new Error("Invalid response format from cards API.");
  }
  return data;
};

// --- useCards Custom Hook ---

// Define options for the hook
interface UseCardsOptions {
  offset?: number;
  limit?: number;
}

// ↓↓↓ Define the explicit return type for the hook ↓↓↓
interface UseCardsReturn {
  /** Array of cards. Each card object conforms to CardApiResponse, including the `aiContents` array. */
  cards: CardApiResponse[];
  /** Pagination metadata, or null if no data. */
  pagination: PaginationMeta | null;
  /** True if the initial query is loading (no data yet). */
  isLoading: boolean;
  /** True if the query is fetching, including background fetching and refetching. */
  isFetching: boolean;
  /** Error object if the query failed, otherwise null. */
  error: Error | AppError | null;
}

// Update hook signature to accept pagination options and return the defined type
export const useCards = (
  deckId: string | null,
  options: UseCardsOptions = {},
): UseCardsReturn => {
  // Get pagination options with default values
  const { offset = 0, limit = 10 } = options;

  // Use React Query's useQuery hook
  // Type arguments use the imported, updated types
  const queryResult = useQuery<PaginatedCardsResponse, Error | AppError>({
    // Update queryKey to include pagination parameters for unique caching per page
    queryKey: ["cards", deckId, { offset, limit }],
    // Update queryFn to call the paginated fetcher
    queryFn: () => {
      // Double-check deckId existence (though 'enabled' handles this)
      if (!deckId) {
        // Should not happen if 'enabled' is working, return rejected promise
        // Use AppError for consistency if desired
        return Promise.reject(
          new AppError("Deck ID is required.", 400, "VALIDATION_ERROR"),
        );
      }
      // Call the updated fetcher with deckId and pagination params
      return fetchPaginatedCards(deckId, offset, limit);
    },
    // Ensure the query only runs when a valid deckId is provided
    enabled: !!deckId,

    // Optional: Keep previous data while fetching new page for smoother UX
    // keepPreviousData: true,
    // Optional: Define staleTime if needed
    // staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Return the structured data conforming to UseCardsReturn
  return {
    // Access the nested 'data' array within the API response. Elements are CardApiResponse.
    cards: queryResult.data?.data ?? [], // Default to empty array
    // Access the 'pagination' object from the API response
    pagination: queryResult.data?.pagination ?? null, // Default to null
    // Pass through React Query status flags
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error, // Pass through any error object
  };
};

// ↓↓↓ Re-export CardApiResponse as Card with updated JSDoc ↓↓↓
/**
 * Re-exporting CardApiResponse as Card for component usage.
 * This Card type includes the `aiContents` array, reflecting the latest API structure.
 */
export type { CardApiResponse as Card };
```

## File: hooks/useDeckMutations.ts

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { AuthError } from "@supabase/supabase-js";
import {
  ApiErrorResponse,
  DeckApiResponse,
  DeckCreatePayload,
  DeckUpdatePayload,
} from "../types";

export class ApiError extends Error {
  status: number;
  details?: unknown; // Changed from any

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const createDeckApi = async ({
  deckData,
}: {
  deckData: DeckCreatePayload;
}): Promise<DeckApiResponse> => {
  const apiUrl = `/api/decks`; // ★ locale なし ★
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(deckData),
  });

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({
      message: "Failed to parse error response",
      error: "PARSE_ERROR",
    }));
    throw new ApiError(
      errorData.message || `HTTP error! status: ${response.status}`,
      response.status,
      errorData.details,
    );
  }
  return response.json();
};

export const useCreateDeck = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const mutation = useMutation<
    DeckApiResponse,
    ApiError | AuthError,
    DeckCreatePayload
  >({
    mutationFn: (deckData: DeckCreatePayload) => createDeckApi({ deckData }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["decks", userId] });
      console.log("Deck created successfully:", data);
    },
    onError: (error) => {
      console.error("Error creating deck:", error);
    },
  });

  return mutation;
};

const deleteDeckApi = async ({ deckId }: { deckId: string }): Promise<void> => {
  const apiUrl = `/api/decks/${deckId}`; // ★ locale なし ★
  const response = await fetch(apiUrl, {
    method: "DELETE",
  });
  if (response.status !== 204) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({
      message: "Failed to parse error response",
      error: "PARSE_ERROR",
    }));
    throw new ApiError(
      errorData.message || `HTTP error! status: ${response.status}`,
      response.status,
      errorData.details,
    );
  }
};

export const useDeleteDeck = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const mutation = useMutation<void, ApiError | AuthError, { deckId: string }>({
    mutationFn: ({ deckId }: { deckId: string }) => deleteDeckApi({ deckId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["decks", userId] });
      console.log(`Deck ${variables.deckId} deleted successfully`);
    },
    onError: (error, variables) => {
      console.error(`Error deleting deck ${variables.deckId}:`, error);
    },
  });

  return mutation;
};

const updateDeckApi = async ({
  deckId,
  data,
}: {
  deckId: string;
  data: DeckUpdatePayload;
}): Promise<DeckApiResponse> => {
  const apiUrl = `/api/decks/${deckId}`;
  console.log(`[updateDeckApi] Calling PUT ${apiUrl}`);

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: `HTTP error ${response.status}` }));
    const message =
      typeof errorData.message === "string"
        ? errorData.message
        : `HTTP error! status: ${response.status}`;
    throw new ApiError(message, response.status, errorData.details);
  }
  return response.json();
};

/**
 * Custom hook for updating an existing deck.
 */
export const useUpdateDeck = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const mutation = useMutation<
    DeckApiResponse,
    ApiError | AuthError,
    { deckId: string; data: DeckUpdatePayload }
  >({
    mutationFn: updateDeckApi,
    onSuccess: (updatedDeck, variables) => {
      console.log(
        `Deck ${variables.deckId} updated successfully:`,
        updatedDeck,
      );

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["decks", userId] });

      queryClient.invalidateQueries({ queryKey: ["deck", variables.deckId] });
    },
    onError: (error, variables) => {
      console.error(`Error updating deck ${variables.deckId}:`, error);
    },
  });

  return mutation;
};
```

## File: hooks/useDecks.ts

```typescript
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import {
  DeckApiResponse,
  ApiErrorResponse,
  PaginatedDecksResponse,
  PaginationMeta,
} from "../types/api.types";

interface UseDecksOptions {
  offset?: number;
  limit?: number;
}

interface UseDecksReturn {
  decks: DeckApiResponse[];
  pagination: PaginationMeta | null;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
}

const fetchPaginatedDecks = async (
  userId: string,
  offset: number,
  limit: number,
): Promise<PaginatedDecksResponse> => {
  const params = new URLSearchParams({
    offset: offset.toString(),
    limit: limit.toString(),
  });
  const apiUrl = `/api/decks?${params.toString()}`;
  console.log(`[useDecks fetcher] Fetching decks from: ${apiUrl}`);

  const response = await fetch(apiUrl);

  if (!response.ok) {
    const errorData: { message?: string } = {
      message: `Failed to fetch decks. Status: ${response.status}`,
    };
    try {
      if (response.headers.get("content-length") !== "0" && response.body) {
        const parsedError: ApiErrorResponse | { message: string } =
          await response.json();
        if (parsedError && typeof parsedError.message === "string") {
          errorData.message = parsedError.message;
        }
      }
    } catch (e) {
      console.warn(
        "Could not parse error response body for fetchPaginatedDecks:",
        e,
      );
    }
    throw new Error(errorData.message);
  }
  return response.json() as Promise<PaginatedDecksResponse>;
};

export const useDecks = (options: UseDecksOptions = {}): UseDecksReturn => {
  const { offset = 0, limit = 10 } = options;
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;

  const queryResult = useQuery<PaginatedDecksResponse, Error>({
    queryKey: ["decks", userId, { offset, limit }],
    queryFn: () => {
      if (!userId) return Promise.reject(new Error("User not authenticated"));
      return fetchPaginatedDecks(userId, offset, limit);
    },
    enabled: !!userId && !isAuthLoading,
  });

  return {
    decks: queryResult.data?.data ?? [],
    pagination: queryResult.data?.pagination ?? null,
    isLoading: queryResult.isLoading || isAuthLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error,
  };
};
```

## File: hooks/useGenerateTts.ts

```typescript
// src/hooks/useGenerateTts.ts (ts(2739) エラー修正 + _e 修正 適用済み)

import { useMutation, UseMutationOptions } from "@tanstack/react-query";
// ↓↓↓ ERROR_CODES をインポート (初期値設定と AppError で必要) ↓↓↓
import { AppError, ERROR_CODES } from "@/lib/errors";
import { type ApiErrorResponse } from "@/types/api.types";

export interface TtsPayload {
  text: string;
  language: string; // ★ オプショナル (?) を削除して必須に ★
  cardId: string;
  side: "front" | "back";
}

// APIから成功時に受け取るデータの型 (signedUrl, gcsPath を含む)
export interface TtsSuccessResponse {
  success: true;
  signedUrl: string;
  gcsPath: string;
  message?: string;
}

// バックエンドAPI (/api/tts) を呼び出す非同期関数
const generateTtsApi = async (
  payload: TtsPayload,
): Promise<TtsSuccessResponse> => {
  const apiUrl = "/api/tts";
  console.log(
    "[useGenerateTts] Calling API:",
    apiUrl,
    "with payload:",
    payload,
  );

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // API呼び出しが失敗した場合 (HTTPステータスが 2xx 以外)
  if (!response.ok) {
    // --- ↓↓↓ errorData の初期化を修正 (必須プロパティを設定) ↓↓↓ ---
    const errorData: ApiErrorResponse = {
      error: ERROR_CODES.INTERNAL_SERVER_ERROR, // デフォルトのエラーコード
      message: `Failed to generate TTS. Status: ${response.status}`, // デフォルトメッセージ
      details: null,
    };
    // --- ↑↑↑ 修正ここまで ↑↑↑ ---

    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const parsedError: ApiErrorResponse = await response.json();
        // API から返ってきた値があればデフォルトを上書き
        if (parsedError && typeof parsedError.error === "string") {
          errorData.error = parsedError.error;
        }
        errorData.message = parsedError?.message || errorData.message;
        errorData.details = parsedError?.details;
      }
      // --- ↓↓↓ catch (_e) の修正 (適用済みのはず) ↓↓↓ ---
    } catch (_e) {
      console.warn("[useGenerateTts] Could not parse error response body:", _e);
    }
    // --- ↑↑↑ 修正ここまで ↑↑↑ ---

    // エラーコードの検証 (変更なし)
    const isKnownErrorCode =
      errorData.error &&
      Object.prototype.hasOwnProperty.call(ERROR_CODES, errorData.error);
    const validErrorCode: keyof typeof ERROR_CODES = isKnownErrorCode
      ? (errorData.error as keyof typeof ERROR_CODES)
      : ERROR_CODES.INTERNAL_SERVER_ERROR;

    // AppError を throw (変更なし)
    throw new AppError(
      errorData.message,
      response.status,
      validErrorCode,
      errorData.details,
    );
  } // if (!response.ok) の終わり

  // API呼び出しが成功した場合 (変更なし)
  const result: TtsSuccessResponse = await response.json();
  // レスポンス形式検証 (signedUrl と gcsPath をチェック)
  if (
    !result ||
    result.success !== true ||
    typeof result.signedUrl !== "string" ||
    typeof result.gcsPath !== "string" // gcsPath もチェック
  ) {
    console.error("[useGenerateTts] Invalid success response format:", result);
    throw new AppError(
      "Received invalid response format from TTS API.",
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
    );
  }
  return result as TtsSuccessResponse;
};

type UseGenerateTtsOptions = Omit<
  UseMutationOptions<TtsSuccessResponse, AppError, TtsPayload>, // variables が TtsPayload に
  "mutationFn"
>;

// --- useGenerateTts フック本体 (変更なし) ---
export const useGenerateTts = (options?: UseGenerateTtsOptions) => {
  return useMutation<
    TtsSuccessResponse, // 成功データ型 (signedUrl, gcsPath 含む)
    AppError,
    TtsPayload
  >({
    mutationFn: generateTtsApi,
    ...options,
  });
};
```

## File: hooks/useGetTtsUrl.ts

```typescript
// src/hooks/useGetTtsUrl.ts (QueryKey 型修正版)

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { AppError, ERROR_CODES } from "@/lib/errors";
import { type ApiErrorResponse } from "@/types/api.types";

// APIから成功時に受け取るデータの型 (変更なし)
interface GetTtsUrlSuccessResponse {
  success: true;
  signedUrl: string;
}

// API 呼び出し関数 (変更なし)
const getTtsUrlApi = async (
  gcsPath: string,
): Promise<GetTtsUrlSuccessResponse> => {
  if (!gcsPath) {
    throw new Error("GCS path is required.");
  }
  const apiUrl = `/api/tts/signed-url?gcsPath=${encodeURIComponent(gcsPath)}`;
  console.log("[useGetTtsUrl] Calling API:", apiUrl);
  const response = await fetch(apiUrl);
  if (!response.ok) {
    const errorData: ApiErrorResponse = {
      error: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: `Failed to get signed URL. Status: ${response.status}`,
      details: null,
    };
    try {
      /* ... parse error ... */
    } catch (_e) {
      /* ... */
    }
    const isKnownErrorCode =
      errorData.error &&
      Object.prototype.hasOwnProperty.call(ERROR_CODES, errorData.error);
    const validErrorCode: keyof typeof ERROR_CODES = isKnownErrorCode
      ? (errorData.error as keyof typeof ERROR_CODES)
      : ERROR_CODES.INTERNAL_SERVER_ERROR;
    throw new AppError(
      errorData.message,
      response.status,
      validErrorCode,
      errorData.details,
    );
  }
  const result: GetTtsUrlSuccessResponse = await response.json();
  if (
    !result ||
    result.success !== true ||
    typeof result.signedUrl !== "string"
  ) {
    console.error("[useGetTtsUrl] Invalid success response format:", result);
    throw new AppError(
      "Received invalid response format from get signed URL API.",
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
    );
  }
  return result;
};

// ↓↓↓ useQuery のオプションの型 (QueryKey 型を修正) ↓↓↓
type UseGetTtsUrlOptions = Omit<
  UseQueryOptions<
    GetTtsUrlSuccessResponse,
    AppError,
    GetTtsUrlSuccessResponse,
    readonly ["ttsUrl", string | null | undefined]
  >, // ★ undefined を許容 ★
  "queryKey" | "queryFn"
>;

/**
 * GCS パスから再生用の署名付き URL を取得するための React Query クエリフック
 */
export const useGetTtsUrl = (
  gcsPath: string | null | undefined, // 引数の型は string | null | undefined
  options?: UseGetTtsUrlOptions,
) => {
  // ↓↓↓ useQuery の QueryKey 型を修正 ↓↓↓
  return useQuery<
    GetTtsUrlSuccessResponse,
    AppError,
    GetTtsUrlSuccessResponse,
    readonly ["ttsUrl", string | null | undefined] // ★ undefined を許容 ★
  >({
    queryKey: ["ttsUrl", gcsPath], // ★ ここに string | null | undefined が渡されるため型を合わせる ★
    queryFn: () => {
      if (!gcsPath) {
        return Promise.reject(new Error("gcsPath is required."));
      }
      return getTtsUrlApi(gcsPath);
    },
    enabled:
      !!gcsPath &&
      typeof gcsPath === "string" &&
      gcsPath.length > 0 &&
      options?.enabled !== false,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: false,
    ...options,
  });
};
```

## File: hooks/useSaveAiContent.ts

```typescript
// src/hooks/useSaveAiContent.ts (新規作成)

import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { AppError, ERROR_CODES } from "@/lib/errors";
import {
  type ApiErrorResponse,
  type AICardContentApiResponse,
} from "@/types/api.types";
import { AiContentType } from "@prisma/client"; // Enum が必要

// mutate 関数に渡すデータの型 (API URLの cardId と body の両方を含む)
export interface SaveAiContentVariables {
  cardId: string;
  contentType: AiContentType;
  language: string;
  content: string; // 保存するテキストまたは GCS パス
}

// API を呼び出す関数
const saveAiContentApi = async (
  variables: SaveAiContentVariables,
): Promise<AICardContentApiResponse> => {
  // 成功時は作成された AICardContent を返す想定
  const { cardId, ...bodyPayload } = variables; // cardId を分離し、残りを body に使う
  const apiUrl = `/api/cards/${cardId}/ai-contents`;
  console.log(`[useSaveAiContent] Calling API: POST ${apiUrl}`);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyPayload), // cardId 以外のデータを body に
  });

  if (!response.ok) {
    // エラーハンドリング (useGenerateTts と同様)
    const errorData: ApiErrorResponse = {
      error: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: `Failed to save AI content. Status: ${response.status}`,
      details: null,
    };
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const parsedError: ApiErrorResponse = await response.json();
        if (parsedError && typeof parsedError.error === "string") {
          errorData.error = parsedError.error;
        }
        errorData.message = parsedError?.message || errorData.message;
        errorData.details = parsedError?.details;
      }
    } catch (_e) {
      console.warn(
        "[useSaveAiContent] Could not parse error response body:",
        _e,
      );
    }

    const isKnownErrorCode =
      errorData.error &&
      Object.prototype.hasOwnProperty.call(ERROR_CODES, errorData.error);
    const validErrorCode: keyof typeof ERROR_CODES = isKnownErrorCode
      ? (errorData.error as keyof typeof ERROR_CODES)
      : ERROR_CODES.INTERNAL_SERVER_ERROR;
    throw new AppError(
      errorData.message,
      response.status,
      validErrorCode,
      errorData.details,
    );
  }

  // 成功時 (API は作成された AICardContent を返す想定)
  const result: AICardContentApiResponse = await response.json();
  // 簡単な検証
  if (
    !result ||
    typeof result.id !== "string" ||
    !result.contentType ||
    !result.language ||
    typeof result.content !== "string"
  ) {
    console.error(
      "[useSaveAiContent] Invalid success response format:",
      result,
    );
    throw new AppError(
      "Received invalid response format from save AI content API.",
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
    );
  }
  return result;
};

// useMutation のオプションの型 (mutationFn を除く)
type UseSaveAiContentOptions = Omit<
  UseMutationOptions<
    AICardContentApiResponse,
    AppError,
    SaveAiContentVariables
  >,
  "mutationFn"
>;

/**
 * AIコンテンツ (解説、翻訳、音声パス等) を保存するための React Query Mutation フック
 * POST /api/cards/{cardId}/ai-contents を呼び出す
 */
export const useSaveAiContent = (options?: UseSaveAiContentOptions) => {
  return useMutation<
    AICardContentApiResponse, // 成功時に返されるデータ (作成された AICardContent)
    AppError, // エラーの型
    SaveAiContentVariables // mutate に渡す引数 (variables) の型
  >({
    mutationFn: saveAiContentApi, // 上で定義した API 呼び出し関数
    ...options, // 呼び出し元から渡された onSuccess, onError などを展開
  });
};
```

## File: hooks/useTranslateText.ts

```typescript
// src/hooks/useTranslateText.ts

import { useMutation } from "@tanstack/react-query";
import { AppError, ERROR_CODES } from "@/lib/errors"; // AppError をインポート

// API リクエストのペイロード型
interface TranslatePayload {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  // modelName?: string; // 必要ならモデル名も指定可能に
}

// API レスポンスの型 (成功時)
interface TranslateSuccessResponse {
  success: true;
  translation: string;
}

// API 呼び出し関数
const translateTextApi = async (
  payload: TranslatePayload,
): Promise<TranslateSuccessResponse> => {
  // 注意: この API ルート '/api/translate' はまだ作成していません！
  // 次のステップで作成します。
  const apiUrl = "/api/translate";
  console.log(
    "[useTranslateText] Calling API:",
    apiUrl,
    "with payload:",
    payload,
  );

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData: {
      message?: string;
      errorCode?: string;
      details?: unknown;
    } = {
      message: "Failed to translate text",
      errorCode: "API_ERROR",
      details: null,
    };
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        // Try to parse specific error structure from API
        const parsedError = await response.json();
        errorData.message = parsedError.message || errorData.message;
        errorData.errorCode = parsedError.errorCode || errorData.errorCode;
        errorData.details = parsedError.details;
      }
    } catch (e) {
      console.warn(
        "[useTranslateText] Could not parse error response body:",
        e,
      );
    }
    // Throw AppError using parsed details if possible
    throw new AppError(
      errorData.message || "Translation request failed",
      response.status,
      ERROR_CODES[errorData.errorCode as keyof typeof ERROR_CODES] ||
        ERROR_CODES.INTERNAL_SERVER_ERROR,
      errorData.details,
    );
  }

  // Parse successful response
  const result: TranslateSuccessResponse = await response.json();
  // Validate success response structure
  if (!result.success || typeof result.translation !== "string") {
    console.error(
      "[useTranslateText] Invalid success response format:",
      result,
    );
    throw new AppError(
      "Received invalid response format from translation API.",
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
    );
  }
  return result;
};

// カスタム Mutation フック
export const useTranslateText = (options?: {
  onSuccess?: (data: TranslateSuccessResponse) => void;
  onError?: (error: AppError) => void;
}) => {
  return useMutation<
    TranslateSuccessResponse, // Success data type
    AppError, // Error type
    TranslatePayload // Variables type for mutate function
  >({
    mutationFn: translateTextApi,
    onSuccess: (data) => {
      console.log("Translation successful:", data);
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      // Ensure error is AppError before passing to callback
      if (error instanceof AppError) {
        console.error("Translation error:", error);
        options?.onError?.(error);
      } else {
        // Handle cases where error might not be AppError (shouldn't happen if translateTextApi throws AppError)
        console.error(
          "An unexpected non-AppError occurred during translation:",
          error,
        );
        // Optionally wrap it in AppError before calling onError
        const unknownError = new AppError(
          "An unexpected error occurred during translation.",
          500,
          "INTERNAL_SERVER_ERROR",
          error,
        );
        options?.onError?.(unknownError);
      }
    },
  });
};
```

## File: i18n/navigation.ts

```typescript
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Lightweight wrappers around Next.js' navigation
// APIs that consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

## File: i18n/request.ts

```typescript
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // Typically corresponds to the `[locale]` segment
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

## File: i18n/routing.ts

```typescript
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ["en", "ja"],

  // Used when no locale matches
  defaultLocale: "en",
});
```

## File: lib/auth.ts

```typescript
import { cookies } from "next/headers";
import { createSupabaseServerComponentClient } from "@/lib/supabase"; // Use the server-side client creator
import { User } from "@supabase/supabase-js";
import { AuthError } from "@supabase/supabase-js"; // Import AuthError type

// Define a more specific error type if needed, or use AuthError directly
// Define a simpler error type for the catch block
type ServerAuthCatchError = { name: string; message: string; status: number };

interface ServerUserResult {
  user: User | null;
  error: AuthError | ServerAuthCatchError | null; // Allow AuthError or our custom catch error
}

/**
 * Retrieves the authenticated user on the server-side (Server Components, API Routes, Server Actions).
 * Uses cookies from the incoming request to get the session.
 *
 * @returns {Promise<ServerUserResult>} An object containing the user or an error.
 */
export const getServerUser = async (): Promise<ServerUserResult> => {
  try {
    // 1. Get cookie store
    const resolvedCookieStore = await cookies(); // Await the promise

    // 2. Create Supabase client for server actions/components
    const supabase = createSupabaseServerComponentClient(resolvedCookieStore);
    // 3. Get user session
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Error getting server user:", error.message);
      return { user: null, error };
    }

    return { user, error: null };
  } catch (err: unknown) {
    // Catch potential errors during client creation or cookie access
    console.error("Unexpected error in getServerUser:", err);
    // Determine the error message safely
    let errorMessage = "An unexpected error occurred retrieving server user.";
    if (
      typeof err === "object" &&
      err !== null &&
      "message" in err &&
      typeof err.message === "string"
    ) {
      errorMessage = err.message;
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }
    // Return a simpler error object
    const error: ServerAuthCatchError = {
      name: "ServerAuthCatchError",
      message: errorMessage,
      status: 500, // Internal Server Error
    };
    return { user: null, error };
  }
};

// Optional: Helper to get just the user ID
export const getServerUserId = async (): Promise<string | null> => {
  const { user, error } = await getServerUser();
  if (error || !user) {
    return null;
  }
  return user.id;
};
```

## File: lib/db.ts

```typescript
import { PrismaClient } from ".prisma/client";

// Declare a global variable to hold the Prisma client instance
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Instantiate PrismaClient, reusing the instance in development
// or creating a new one in production
const prisma =
  global.prisma ||
  new PrismaClient({
    // Optional: Log Prisma queries
    // log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

// In development, assign the instance to the global variable
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
```

## File: lib/errors.ts

```typescript
// 標準エラーコードの例 (プロジェクトに合わせて定義)
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  RESOURCE_CONFLICT: "RESOURCE_CONFLICT", // ★ 既存リソースとの衝突 (例: Unique制約)
  EXTERNAL_API_FAILURE: "EXTERNAL_API_FAILURE",
  DATABASE_ERROR: "DATABASE_ERROR", // ★ データベース関連エラー
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
} as const; // Readonlyにする

type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// アプリケーション共通のベースエラークラス
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    errorCode: ErrorCode,
    details?: unknown,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.name = this.constructor.name; // エラークラス名を設定
    Object.setPrototypeOf(this, new.target.prototype);
    // Error.captureStackTrace(this, this.constructor); // Node.js 環境なら有効
  }
}

// --- 具体的なエラークラス ---

export class ValidationError extends AppError {
  constructor(message: string = "Invalid input data.", details?: unknown) {
    super(message, 400, ERROR_CODES.VALIDATION_ERROR, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed.") {
    super(message, 401, ERROR_CODES.AUTHENTICATION_FAILED);
  }
}

export class PermissionError extends AppError {
  constructor(message: string = "Permission denied.") {
    super(message, 403, ERROR_CODES.PERMISSION_DENIED);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found.") {
    super(message, 404, ERROR_CODES.RESOURCE_NOT_FOUND);
  }
}

// ★ デッキ作成時のユニーク制約違反などに使用 ★
export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict.") {
    super(message, 409, ERROR_CODES.RESOURCE_CONFLICT);
  }
}

// lib/errors.ts の ExternalApiError クラスを修正

// (他の import やクラス定義はそのまま)

export class ExternalApiError extends AppError {
  /**
   * Constructs an ExternalApiError.
   * @param message - Human-readable description. Defaults to 'External API request failed.'.
   * @param originalError - Optional: The original error caught.
   * @param details - Optional: Additional details (like safety ratings). // ← details を追加
   */
  constructor(
    message: string = "External API request failed.",
    originalError?: Error,
    details?: unknown, // ★ オプションの details 引数を追加 ★
  ) {
    // ★ AppError の第4引数 (details) に渡すように修正 ★
    //    details があればそれを、なければ originalError を渡す例
    super(
      message,
      503,
      ERROR_CODES.EXTERNAL_API_FAILURE,
      details ?? originalError,
    );
  }
}

// (他のエラークラスや isAppError などはそのまま)

// ★ 予期せぬデータベースエラーなどに使用 ★
export class DatabaseError extends AppError {
  constructor(
    message: string = "Database operation failed.",
    originalError?: Error,
  ) {
    // DBエラーの詳細はログには出すが、クライアントには返さない想定
    super(message, 500, ERROR_CODES.DATABASE_ERROR, originalError);
  }
}

// 予期せぬサーバー内部エラー
export class InternalServerError extends AppError {
  constructor(
    message: string = "An unexpected internal server error occurred.",
    originalError?: Error,
  ) {
    super(message, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, originalError);
  }
}

// Type guard to check if an error is an AppError
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};
import { NextResponse } from "next/server";
// Note: Assuming AppError, ERROR_CODES, InternalServerError, isAppError are defined above in the same file.
// If Prisma errors need specific handling, import Prisma from '@prisma/client'

/**
 * Centralized API error handler for Next.js API routes.
 * Logs the error and returns a standardized JSON response.
 * @param error - The error caught in the try-catch block.
 * @returns A NextResponse object with the appropriate status code and error details.
 */
export const handleApiError = (error: unknown): NextResponse => {
  console.error("API Error:", error); // Log the error for server-side debugging

  if (isAppError(error)) {
    // Handle known application errors
    return NextResponse.json(
      {
        message: error.message,
        errorCode: error.errorCode,
        details: error.details,
      },
      { status: error.statusCode },
    );
  }

  // Example: Handle Prisma specific errors (Uncomment and adjust if needed)
  // import { Prisma } from '@prisma/client';
  // import { ConflictError, DatabaseError } from './errors'; // Assuming these are defined
  // if (error instanceof Prisma.PrismaClientKnownRequestError) {
  //   if (error.code === 'P2002') { // Unique constraint violation
  //     const conflictError = new ConflictError('Resource already exists.');
  //     return NextResponse.json(
  //       { message: conflictError.message, errorCode: conflictError.errorCode },
  //       { status: conflictError.statusCode }
  //     );
  //   }
  //   // Handle other known Prisma errors
  //   const dbError = new DatabaseError('Database request failed.', error);
  //   return NextResponse.json(
  //     { message: dbError.message, errorCode: dbError.errorCode },
  //     { status: dbError.statusCode }
  //   );
  // }

  // Handle unexpected errors
  // Ensure InternalServerError is defined above or imported
  const internalError = new InternalServerError(
    "An unexpected error occurred.",
    error instanceof Error ? error : undefined,
  );
  return NextResponse.json(
    {
      message: internalError.message,
      errorCode: internalError.errorCode,
    },
    { status: internalError.statusCode },
  );
};
```

## File: lib/supabase.ts

```typescript
// src/lib/supabase.ts (最終修正版)
import {
  createBrowserClient,
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { type NextRequest, type NextResponse } from "next/server";

// Ensure environment variables are defined
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
}
// if (!supabaseServiceRoleKey) { console.warn(...) }

// --- Client Components Client ---
export const createClient = () =>
  createBrowserClient(supabaseUrl!, supabaseAnonKey!);

// --- Server Component Client (Read-Only Cookies) ---
export const createSupabaseServerComponentClient = (
  cookieStore: ReadonlyRequestCookies,
) => {
  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
};

// --- Server Action / Route Handler Client (Read/Write Cookies) ---
export const createSupabaseServerActionClient = (
  cookieStoreAccessor: () => ReadonlyRequestCookies,
) => {
  const cookieStore = cookieStoreAccessor();
  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStoreAccessor().set(name, value, options);
        } catch (error) {
          console.error(
            `ServerActionClient: Failed to set cookie '${name}'.`,
            error,
          );
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStoreAccessor().set({ name, value: "", ...options, maxAge: 0 });
        } catch (error) {
          console.error(
            `ServerActionClient: Failed to remove cookie '${name}'.`,
            error,
          );
        }
      },
    },
  });
};

// --- Middleware Client ---
export const createMiddlewareClient = (req: NextRequest, res: NextResponse) => {
  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        req.cookies.set({ name, value, ...options });
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        req.cookies.delete(name);
        res.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
};

// --- Server-Side Admin Client (Optional) ---
export const createAdminClient = () => {
  if (!supabaseServiceRoleKey) {
    throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY for admin client.");
  }
  return createServerClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    cookies: {
      get(_name: string) {
        return undefined;
      },
      set(_name: string, _value: string, _options: CookieOptions) {}, // Removed unused eslint-disable comment
      remove(_name: string, _options: CookieOptions) {}, // Removed unused eslint-disable comment
    },
  });
};
```

## File: lib/zod.ts

```typescript
import { z } from "zod";

// --- デッキ作成用スキーマと型 ---
export const deckCreateSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Deck name is required." }) // 日本語メッセージはi18n対応を後で検討
    .max(100, { message: "Deck name must be 100 characters or less." }),
  description: z
    .string()
    .max(500, { message: "Description must be 500 characters or less." })
    .optional() // 任意入力
    .nullable(), // null も許容 (フォーム未入力時に null になる場合を考慮)
});

// スキーマから TypeScript 型を生成してエクスポート
export type DeckCreatePayload = z.infer<typeof deckCreateSchema>;

// --- 他のスキーマ (例: 学習結果更新用) ---
export const cardRatingSchema = z.object({
  cardId: z.string().cuid(), // cuid形式を期待する場合
  rating: z.enum(["AGAIN", "HARD", "GOOD", "EASY"]), // Enumの値と一致
});

export type CardRatingPayload = z.infer<typeof cardRatingSchema>;

// --- パスワード変更用スキーマ (例) ---
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6), // 必要ならより複雑なルールを追加
});
export type ChangePasswordPayload = z.infer<typeof changePasswordSchema>;

// --- 他に必要な Zod スキーマをここに追加 ---
// --- カード作成用スキーマ ---
export const cardCreateSchema = z.object({
  front: z
    .string()
    .min(1, { message: "Front content is required." })
    .max(1000, { message: "Front content must be 1000 characters or less." }),
  back: z
    .string()
    .min(1, { message: "Back content is required." })
    .max(1000, { message: "Back content must be 1000 characters or less." }),
  // deckId は API ルートハンドラでパスパラメータから取得するため、ここには含めない
});
export type CardCreatePayload = z.infer<typeof cardCreateSchema>;

// --- カード更新用スキーマ ---
export const cardUpdateSchema = z
  .object({
    front: z
      .string()
      .min(1, { message: "Front content cannot be empty if provided." }) // 空文字での更新を防ぐ場合
      .max(1000, { message: "Front content must be 1000 characters or less." })
      .optional(), // 任意入力
    back: z
      .string()
      .min(1, { message: "Back content cannot be empty if provided." }) // 空文字での更新を防ぐ場合
      .max(1000, { message: "Back content must be 1000 characters or less." })
      .optional(), // 任意入力
  })
  .refine((data) => data.front !== undefined || data.back !== undefined, {
    message: "At least one field (front or back) must be provided for update.",
    path: ["front", "back"], // エラーメッセージを関連付けるフィールド
  }); // front か back のどちらかは必須とする

// スキーマから TypeScript 型を生成してエクスポート
export type CardUpdatePayload = z.infer<typeof cardUpdateSchema>;
// --- デッキ更新用スキーマ ---
export const deckUpdateSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: "Deck name cannot be empty if provided." })
      .max(100, { message: "Deck name must be 100 characters or less." })
      .optional(),
    description: z
      .string()
      .max(500, { message: "Description must be 500 characters or less." })
      .nullable() // Allow null for clearing description
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message:
      "At least one field (name or description) must be provided for update.",
    // Zod 3.23+ では refine の第二引数で path を指定可能
    // path: ["name", "description"], // 関連フィールドを指定
  });

// スキーマから TypeScript 型を生成してエクスポート
export type DeckUpdatePayload = z.infer<typeof deckUpdateSchema>;
```

## File: services/ai.service.ts

```typescript
// src/services/ai.service.ts (Resultパターン + Lintエラー修正適用版)

import { TextToSpeechClient } from "@google-cloud/text-to-speech";
// ↓↓↓ SafetyRating をインポート、Part は不要なので削除 ↓↓↓
import { VertexAI, SafetyRating } from "@google-cloud/vertexai";
import { Storage } from "@google-cloud/storage";
import { type Result } from "@/types"; // Result 型をインポート
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
  const projectId = process.env.GCP_PROJECT_ID || "";
  // ↓↓↓ 未使用なので _ 付きにリネーム ↓↓↓
  const _credentialsPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS || "Not Set";
  const location = process.env.VERTEX_AI_REGION || "us-central1"; // 前回動作した us-central1 をデフォルトに (環境変数で上書き可能)

  // --- デバッグログ (環境変数確認用) ---

  // ↓↓↓ _credentialsPath を使用 ↓↓↓

  // ↓↓↓ _credentialsPath を使用 ↓↓↓

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
  console.log(
    `Using Vertex AI Model: "${vertexAiModelName}" ${!process.env.VERTEX_AI_MODEL_NAME ? "(Fallback)" : "(From Env Var)"}`,
  );

  // TTS Voice 設定
  const defaultTtsVoice = "en-US-Chirp3-HD-Leda";
  const ttsVoiceName = process.env.TTS_VOICE_NAME || defaultTtsVoice;
  console.log(
    `Using TTS Voice: "${ttsVoiceName}" ${!process.env.TTS_VOICE_NAME ? "(Default)" : "(From Env Var)"}`,
  );

  // ↓↓↓ catch の error を _error に変更 ↓↓↓
} catch (_error) {
  console.error("Failed to initialize Google Cloud clients.", _error);
  _ttsClient = null;
  _storage = null;
  vertexAI = null;
}

// src/services/ai.service.ts 内 generateTtsAudio (Result + gcsPath 対応版)

/**
 * Generates TTS audio, saves to GCS, and returns a Result containing
 * the GCS path and a signed URL for playback.
 * Uses globally configured TTS voice based on languageCode.
 * @param text The text to synthesize.
 * @param gcsFilenameBase The desired unique filename base (without extension).
 * @param languageCode The language code for TTS voice selection (e.g., "en-US", "ja-JP").
 * @returns A Promise resolving to a Result object with { signedUrl, gcsPath } on success.
 */
export const generateTtsAudio = async (
  text: string,
  gcsFilenameBase: string, // 引数名を変更 (より明確に)
  languageCode: string = process.env.TTS_LANGUAGE_CODE_EN || "en-US",
): Promise<Result<{ signedUrl: string; gcsPath: string }, AppError>> => {
  // ★ 戻り値の型を変更 ★
  // --- クライアント初期化チェック ---
  if (!_ttsClient || !_storage || !_bucketName) {
    const error = new ExternalApiError("TTS/Storage client not initialized.");
    console.error(`[generateTtsAudio] Error: ${error.message}`);
    return { ok: false, error }; // ★ エラー Result を返す ★
  }
  // --- 引数チェック ---
  if (!text || !gcsFilenameBase) {
    const error = new ValidationError("Missing text or filename base for TTS.");
    console.error(`[generateTtsAudio] Error: ${error.message}`);
    return { ok: false, error }; // ★ エラー Result を返す ★
  }

  // --- 音声設定の選択 (変更なし) ---
  let voiceSetting: { languageCode: string; name: string };
  const defaultEnglishLangCode = process.env.TTS_LANGUAGE_CODE_EN || "en-US";
  const defaultEnglishVoiceName =
    process.env.TTS_VOICE_NAME_EN || "en-US-Chirp3-HD-Leda";
  voiceSetting = {
    languageCode: defaultEnglishLangCode,
    name: defaultEnglishVoiceName,
  };
  if (languageCode && languageCode.toLowerCase().startsWith("ja")) {
    voiceSetting = {
      languageCode: process.env.TTS_LANGUAGE_CODE_JA || "ja-JP",
      name: process.env.TTS_VOICE_NAME_JA || "ja-JP-Wavenet-B",
    };
  }
  // ... (他の言語の else if) ...

  // ★ GCS パスを定義 ★
  const gcsPath = `tts-audio/${gcsFilenameBase}.mp3`;

  console.log(
    `[AI Service] Generating TTS: Lang=${voiceSetting.languageCode}, Voice=${voiceSetting.name}, Path=gs://${_bucketName}/${gcsPath}`,
  );

  try {
    // 1. 音声合成 (変更なし)
    const request = {
      input: { text: text },
      voice: voiceSetting,
      audioConfig: { audioEncoding: "MP3" as const },
    };
    console.log(`[AI Service] Calling synthesizeSpeech...`);
    const [response] = await _ttsClient.synthesizeSpeech(request);
    const audioContent = response.audioContent;
    if (!audioContent) {
      // synthesizeSpeech 自体の失敗はエラーとして扱う
      throw new ExternalApiError(
        "Failed to synthesize speech, audioContent is empty.",
      );
    }
    console.log(`[AI Service] Speech synthesized successfully.`);

    // 2. GCS へアップロード (gcsPath を使用)
    const bucket = _storage.bucket(_bucketName);
    const file = bucket.file(gcsPath); // ★ gcsPath を使用
    console.log(
      `[AI Service] Uploading TTS audio to gs://${_bucketName}/${gcsPath}`,
    );
    await file.save(audioContent, { metadata: { contentType: "audio/mpeg" } });
    console.log(`[AI Service] File uploaded successfully to ${gcsPath}.`);

    // 3. 署名付き URL 生成 (有効期限を短く変更 - 例: 60分)
    console.log(`[AI Service] Generating Signed URL for ${gcsPath}...`);
    const expiresDate = new Date();
    expiresDate.setMinutes(expiresDate.getMinutes() + 60); // ★ 60分後に設定 ★
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: expiresDate,
    });
    console.log(`[AI Service] Signed URL generated.`);

    // 4. 成功 Result を返す (signedUrl と gcsPath を両方含む) ★
    return { ok: true, value: { signedUrl, gcsPath } };
  } catch (error: unknown) {
    console.error(`Error in generateTtsAudio for ${gcsPath}:`, error);
    // ★ エラー Result を返す ★
    if (isAppError(error)) {
      // synthesizeSpeech が AppError を throw した場合など
      return { ok: false, error: error };
    } else {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error during TTS generation/upload.";
      return {
        ok: false,
        error: new ExternalApiError(
          `TTS process failed: ${message}`,
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }
};

// (generateExplanation, generateTranslation は変更なし)
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
  if (!vertexAI) {
    return {
      ok: false,
      error: new ExternalApiError("Vertex AI client failed to initialize."),
    };
  }
  if (!textToExplain) {
    return { ok: true, value: "" };
  }

  console.log(
    `[AI Service] Generating explanation for: "${textToExplain}" using model ${vertexAiModelName} (streaming)`,
  );

  try {
    const generativeModel = vertexAI.getGenerativeModel({
      model: vertexAiModelName,
    });
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
      if (typeof chunk === "string") {
        aggregatedText += chunk;
      }
      if (
        finalFinishReason &&
        finalFinishReason !== "STOP" &&
        finalFinishReason !== "MAX_TOKENS"
      ) {
        // ↓↓↓ 正しい型で渡す ↓↓↓
        return {
          ok: false,
          error: new ExternalApiError(
            `Explanation generation stopped due to ${finalFinishReason}.`,
            undefined,
            finalSafetyRatings,
          ),
        };
      }
    }

    if (aggregatedText.trim().length === 0) {
      console.warn(
        "[AI Service] Aggregated text content from stream is empty.",
      );
      return {
        ok: false,
        error: new ExternalApiError(
          "Failed to generate explanation: No content generated from stream.",
        ),
      };
    }

    console.log(`[AI Service] Explanation generated successfully (streaming).`);
    return { ok: true, value: aggregatedText.trim() };
  } catch (error: unknown) {
    console.error(
      `[AI Service] Error generating explanation for "${textToExplain}" (streaming):`,
      error,
    );
    if (isAppError(error)) {
      return { ok: false, error: error };
    } else {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error during Vertex AI stream.";
      return {
        ok: false,
        error: new ExternalApiError(
          `Failed to generate explanation via Vertex AI stream: ${message}`,
          error instanceof Error ? error : undefined,
        ),
      };
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
  if (!vertexAI) {
    return {
      ok: false,
      error: new ExternalApiError("Vertex AI client failed to initialize."),
    };
  }
  if (!textToTranslate) {
    return { ok: true, value: "" };
  }
  if (!sourceLanguage || !targetLanguageCode) {
    return {
      ok: false,
      error: new ValidationError(
        "Source and target language codes are required.",
      ),
    };
  }

  console.log(
    `[AI Service] Generating translation for: "${textToTranslate}" from ${sourceLanguage} to ${targetLanguageCode} using model ${vertexAiModelName} (streaming)`,
  );

  try {
    const generativeModel = vertexAI.getGenerativeModel({
      model: vertexAiModelName,
    });
    const prompt = `Translate the following text accurately from ${sourceLanguage} to ${targetLanguageCode}. Return only the translated text, without any introduction, explanation, or formatting like markdown.\n\nText to translate:\n"${textToTranslate}"\n\nTranslated text:`;
    const request = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
    console.log(
      `[AI Service] Sending translation prompt to Vertex AI (streaming)...`,
    );
    const streamingResp = await generativeModel.generateContentStream(request);

    let aggregatedText = "";
    let finalFinishReason: string | undefined | null = undefined;
    // ↓↓↓ any[] を SafetyRating[] に変更 ↓↓↓
    let finalSafetyRatings: SafetyRating[] | undefined = undefined;

    for await (const item of streamingResp.stream) {
      finalFinishReason = item.candidates?.[0]?.finishReason;
      finalSafetyRatings = item.candidates?.[0]?.safetyRatings;
      const chunk = item.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof chunk === "string") {
        aggregatedText += chunk;
      }
      if (
        finalFinishReason &&
        finalFinishReason !== "STOP" &&
        finalFinishReason !== "MAX_TOKENS"
      ) {
        // ↓↓↓ 正しい型で渡す ↓↓↓
        return {
          ok: false,
          error: new ExternalApiError(
            `Translation generation stopped due to ${finalFinishReason}.`,
            undefined,
            finalSafetyRatings,
          ),
        };
      }
    }

    if (aggregatedText.trim().length === 0) {
      console.warn(
        "[AI Service] Aggregated translation content from stream is empty.",
      );
      return {
        ok: false,
        error: new ExternalApiError(
          "Failed to generate translation: No content generated from stream.",
        ),
      };
    }

    console.log(`[AI Service] Translation generated successfully (streaming).`);
    return { ok: true, value: aggregatedText.trim().replace(/^"|"$/g, "") };
  } catch (error: unknown) {
    console.error(
      `[AI Service] Error generating translation for "${textToTranslate}" from ${sourceLanguage} to ${targetLanguageCode} (streaming):`,
      error,
    );
    if (isAppError(error)) {
      return { ok: false, error: error };
    } else {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error during Vertex AI stream.";
      return {
        ok: false,
        error: new ExternalApiError(
          `Failed to generate translation via Vertex AI stream: ${message}`,
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }
};
```

## File: services/card.service.ts

```typescript
// src/services/card.service.ts (全ての修正を反映した完全版)

import prisma from "@/lib/db";
import { Card, AiContentType, AICardContent, Prisma } from "@prisma/client"; // Prisma 名前空間を追加
import {
  AppError,
  NotFoundError,
  PermissionError,
  DatabaseError,
  ConflictError, // ConflictError をインポート
} from "@/lib/errors";
// generateExplanation/Translation は Result を返す版をインポート
import {
  generateExplanation,
  generateTranslation,
} from "@/services/ai.service";
import { type Result } from "@/types";
import type { CardUpdatePayload } from "@/lib/zod"; // updateCard で使用

// --- 型定義 ---
interface GetCardsByDeckIdOptions {
  limit?: number;
  offset?: number;
}

type GetCardsByDeckIdResult = {
  data: (Card & { aiContents: AICardContent[] })[];
  totalItems: number;
};

// saveAiContent で使用
type AiContentCreateData = {
  contentType: AiContentType;
  language: string;
  content: string;
};

// --- サービス関数 ---

export const getCardsByDeckId = async (
  userId: string,
  deckId: string,
  options: GetCardsByDeckIdOptions = {},
): Promise<GetCardsByDeckIdResult> => {
  const limit = options.limit ?? 10;
  const offset = options.offset ?? 0;
  const validatedLimit = Math.max(1, limit);
  const validatedOffset = Math.max(0, offset);

  try {
    // 1. Verify deck existence and ownership
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
      select: { userId: true },
    });

    if (!deck) {
      throw new NotFoundError(`Deck with ID ${deckId} not found.`);
    }
    if (deck.userId !== userId) {
      throw new PermissionError(
        `User does not have permission to access deck with ID ${deckId}.`,
      );
    }

    // 2. Fetch cards and count
    const [cards, totalItems] = await prisma.$transaction([
      prisma.card.findMany({
        where: { deckId: deckId },
        orderBy: { createdAt: "asc" },
        skip: validatedOffset,
        take: validatedLimit,
        include: {
          aiContents: {
            select: {
              id: true,
              cardId: true, // Include cardId here
              contentType: true,
              language: true,
              content: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
      prisma.card.count({
        where: { deckId: deckId },
      }),
    ]);

    // 3. Return data
    return { data: cards, totalItems: totalItems };
  } catch (error: unknown) {
    // ★ catch (error: unknown) ★
    if (error instanceof NotFoundError || error instanceof PermissionError) {
      throw error; // Re-throw known AppErrors
    }
    // --- ↓↓↓ Explicit type guard ↓↓↓ ---
    console.error(
      `Database error fetching cards for deck ${deckId} by user ${userId}:`,
      error,
    );
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    // --- ↑↑↑ Type guard end ↑↑↑ ---
    throw new DatabaseError(
      "Failed to fetch cards due to a database error.",
      originalError,
    ); // Pass potentially narrowed error
  }
};

export const createCard = async (
  userId: string,
  data: { deckId: string; front: string; back: string },
): Promise<Card> => {
  // Returns the created Card object
  const { deckId, front, back } = data;
  let newCard: Card;

  // --- 1 & 2: Verify deck and create card (errors thrown) ---
  try {
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
      select: { userId: true },
    });
    if (!deck) {
      throw new NotFoundError(`Deck with ID ${deckId} not found.`);
    }
    if (deck.userId !== userId) {
      throw new PermissionError(
        `User does not have permission to add cards to deck ${deckId}.`,
      );
    }

    newCard = await prisma.card.create({
      data: { front, back, deckId },
    });
  } catch (error: unknown) {
    // ★ catch (error: unknown) ★
    if (error instanceof NotFoundError || error instanceof PermissionError) {
      throw error; // Re-throw known AppErrors
    }
    // --- ↓↓↓ Explicit type guard ↓↓↓ ---
    console.error(
      `Database error during initial card creation for deck ${deckId} by user ${userId}:`,
      error,
    );
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    // --- ↑↑↑ Type guard end ↑↑↑ ---
    throw new DatabaseError(
      "Failed to create card due to a database error.",
      originalError,
    ); // Pass potentially narrowed error
  }

  // --- 3. AI Explanation Generation & Save (Result pattern handling) ---
  const explanationLanguage = "en"; // TODO: Dynamic
  console.log(
    `[Card Service] Attempting to generate explanation for card ${newCard.id}, lang: ${explanationLanguage}`,
  );
  const explanationResult = await generateExplanation(
    front,
    explanationLanguage,
  ); // Returns Result

  if (explanationResult.ok) {
    try {
      await prisma.aICardContent.create({
        data: {
          cardId: newCard.id,
          contentType: AiContentType.EXPLANATION,
          language: explanationLanguage,
          content: explanationResult.value,
        },
      });
      console.log(
        `[Card Service] Explanation (${explanationLanguage}) saved for card ${newCard.id}.`,
      );
    } catch (dbError: unknown) {
      // ★ catch (dbError: unknown) ★
      // P2002: Unique constraint failed (content already exists)
      if (
        dbError instanceof Prisma.PrismaClientKnownRequestError &&
        dbError.code === "P2002"
      ) {
        console.warn(
          `[Card Service] Explanation (${explanationLanguage}) likely already exists for card ${newCard.id}.`,
        );
        // Don't throw, just log the warning in this case for createCard
      } else {
        // Log other DB errors during AICardContent creation
        console.error(
          `[Card Service] Failed to save explanation for card ${newCard.id}. DB Error:`,
          dbError,
        );
      }
    }
  } else {
    // Log AI generation failure
    console.error(
      `[Card Service] Failed to generate explanation for card ${newCard.id}. Error:`,
      explanationResult.error.message,
      explanationResult.error.details ?? "",
    );
  }

  // --- 4. AI Translation Generation & Save (Result pattern handling) ---
  const sourceLanguage = "en"; // TODO: Dynamic
  const targetLanguage = "ja"; // TODO: Dynamic
  console.log(
    `[Card Service] Attempting to generate translation for card ${newCard.id}, ${sourceLanguage} -> ${targetLanguage}`,
  );
  const translationResult = await generateTranslation(
    front,
    sourceLanguage,
    targetLanguage,
  ); // Returns Result

  if (translationResult.ok) {
    try {
      await prisma.aICardContent.create({
        data: {
          cardId: newCard.id,
          contentType: AiContentType.TRANSLATION,
          language: targetLanguage,
          content: translationResult.value,
        },
      });
      console.log(
        `[Card Service] Translation (${targetLanguage}) saved for card ${newCard.id}.`,
      );
    } catch (dbError: unknown) {
      // ★ catch (dbError: unknown) ★
      if (
        dbError instanceof Prisma.PrismaClientKnownRequestError &&
        dbError.code === "P2002"
      ) {
        console.warn(
          `[Card Service] Translation (${targetLanguage}) likely already exists for card ${newCard.id}.`,
        );
      } else {
        console.error(
          `[Card Service] Failed to save translation for card ${newCard.id}. DB Error:`,
          dbError,
        );
      }
    }
  } else {
    // Log AI generation failure
    console.error(
      `[Card Service] Failed to generate translation for card ${newCard.id}. Error:`,
      translationResult.error.message,
      translationResult.error.details ?? "",
    );
  }

  // 5. Return the initially created Card object
  return newCard;
};

export const deleteCard = async (
  userId: string,
  deckId: string,
  cardId: string,
): Promise<void> => {
  try {
    // 1. Verify ownership via deck using findFirstOrThrow
    await prisma.card.findFirstOrThrow({
      where: { id: cardId, deck: { id: deckId, userId: userId } },
    });
    // 2. Delete card
    await prisma.card.delete({ where: { id: cardId } });
  } catch (error: unknown) {
    // ★ catch (error: unknown) ★
    let isPrismaNotFoundError = false;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      isPrismaNotFoundError = true; // findFirstOrThrow throws P2025 if not found
    }
    if (isPrismaNotFoundError || error instanceof NotFoundError) {
      throw new NotFoundError(
        `Card with ID ${cardId} not found or user does not have permission.`,
      );
    }
    if (error instanceof PermissionError) {
      throw error;
    } // Should not happen if check above works, but keep for safety

    // --- ↓↓↓ Explicit type guard ↓↓↓ ---
    console.error(
      `Database error deleting card ${cardId} from deck ${deckId} by user ${userId}:`,
      error,
    );
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    // --- ↑↑↑ Type guard end ↑↑↑ ---
    throw new DatabaseError(
      "Failed to delete card due to a database error.",
      originalError,
    );
  }
};

export const updateCard = async (
  userId: string,
  deckId: string,
  cardId: string,
  data: CardUpdatePayload,
): Promise<Result<Card, AppError>> => {
  // Returns Result
  try {
    // 1. Verify ownership via deck using findFirst
    const card = await prisma.card.findFirst({
      where: { id: cardId, deck: { id: deckId, userId: userId } },
      select: { id: true },
    });
    if (!card) {
      return {
        ok: false,
        error: new NotFoundError(
          `Card ${cardId} not found or permission denied for deck ${deckId}.`,
        ),
      };
    }

    // 2. Prepare update data (changed to allow nullish description if needed)
    const updateData: Partial<CardUpdatePayload> = {}; // Use Partial
    if (data.front !== undefined) updateData.front = data.front;
    if (data.back !== undefined) updateData.back = data.back;
    // Add other updatable fields if needed

    // 3. Execute update
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: updateData,
    });
    return { ok: true, value: updatedCard }; // Return success Result
  } catch (error: unknown) {
    // ★ catch (error: unknown) ★
    // --- ↓↓↓ Explicit type guard ↓↓↓ ---
    console.error(
      `Database error updating card ${cardId} in deck ${deckId} by user ${userId}:`,
      error,
    );
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    // --- ↑↑↑ Type guard end ↑↑↑ ---
    return {
      ok: false,
      error: new DatabaseError("Failed to update card.", originalError),
    }; // Return error Result
  }
};

// New function added previously, includes correct catch block
export const saveAiContent = async (
  userId: string,
  cardId: string,
  data: AiContentCreateData,
): Promise<Result<AICardContent, AppError>> => {
  const { contentType, language, content } = data;
  console.log(
    `[Card Service] Attempting to save AI content for card ${cardId}: Type=${contentType}, Lang=${language}`,
  );
  try {
    // 1. Verify card existence and user ownership via the deck
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { deck: { select: { userId: true } } },
    });
    if (!card) {
      return {
        ok: false,
        error: new NotFoundError(`Card with ID ${cardId} not found.`),
      };
    }
    if (!card.deck || card.deck.userId !== userId) {
      return {
        ok: false,
        error: new PermissionError(
          `User does not have permission to modify card ${cardId}.`,
        ),
      };
    }

    // 2. Create the AICardContent entry
    const newAiContent = await prisma.aICardContent.create({
      data: {
        cardId: cardId,
        contentType: contentType,
        language: language,
        content: content,
      },
    });
    console.log(
      `[Card Service] Successfully saved AI content ${newAiContent.id} for card ${cardId}.`,
    );
    return { ok: true, value: newAiContent };
  } catch (error: unknown) {
    // ★ Correct catch block already here ★
    console.error(
      `[Card Service] Database error saving AI content for card ${cardId}:`,
      error,
    );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      console.warn(
        `[Card Service] AI content (${contentType}/${language}) likely already exists for card ${cardId}.`,
      );
      return {
        ok: false,
        error: new ConflictError(
          `AI content (${contentType}/${language}) already exists.`,
        ),
      };
    }
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    return {
      ok: false,
      error: new DatabaseError("Failed to save AI content.", originalError),
    };
  }
}; // End of saveAiContent
```

## File: services/deck.service.ts

```typescript
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { type Result } from "@/types";
import {
  AppError,
  DatabaseError,
  NotFoundError,
  ConflictError,
} from "@/lib/errors";
import {
  type DeckCreatePayload,
  type DeckUpdatePayload,
  type DeckApiResponse,
  type PaginatedDecksResponse,
} from "@/types/api.types";

// --- Pagination Type ---
interface GetDecksOptions {
  limit?: number;
  offset?: number;
}

/**
 * Fetches a paginated list of decks belonging to a specific user.
 */
export const getDecks = async (
  userId: string,
  options: GetDecksOptions = {},
): Promise<PaginatedDecksResponse> => {
  const limit = options.limit ?? 10;
  const offset = options.offset ?? 0;
  const validatedLimit = Math.max(1, limit);
  const validatedOffset = Math.max(0, offset);

  console.log(
    `[Deck Service] Fetching decks for user ${userId}, offset ${validatedOffset}, limit ${validatedLimit}`,
  );

  try {
    const [decks, totalItems] = await prisma.$transaction([
      prisma.deck.findMany({
        where: {
          userId: userId,
        },
        orderBy: { createdAt: "desc" },
        skip: validatedOffset,
        take: validatedLimit,
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          _count: { select: { cards: true } },
        },
      }),
      prisma.deck.count({
        where: {
          userId: userId,
        },
      }),
    ]);

    const decksResponse: DeckApiResponse[] = decks.map((deck) => ({
      ...deck,
      cardCount: deck._count?.cards ?? 0,
    }));

    return {
      data: decksResponse,
      pagination: {
        offset: validatedOffset,
        limit: validatedLimit,
        totalItems: totalItems,
        _links: { self: "", next: null, previous: null },
      },
    };
  } catch (error: unknown) {
    console.error(
      `[Deck Service] Database error fetching decks for user ${userId}:`,
      error,
    );
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    throw new DatabaseError("Failed to fetch decks.", originalError);
  }
};

/**
 * Fetches a single deck by ID, ensuring it belongs to the specified user.
 */
export const getDeckById = async (
  userId: string,
  deckId: string,
): Promise<DeckApiResponse> => {
  console.log(`[Deck Service] Fetching deck ${deckId} for user ${userId}`);
  try {
    // findUniqueOrThrow で存在確認と所有権確認を同時に行う
    const deck = await prisma.deck.findUniqueOrThrow({
      where: {
        id: deckId,
        userId: userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        _count: { select: { cards: true } },
      },
    });

    return {
      ...deck,
      cardCount: deck._count?.cards ?? 0,
    };
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      console.warn(
        `[Deck Service] Deck ${deckId} not found or permission denied for user ${userId}.`,
      );
      throw new NotFoundError(
        `Deck with ID ${deckId} not found or access denied.`,
      );
    }
    console.error(
      `[Deck Service] Database error fetching deck ${deckId} for user ${userId}:`,
      error,
    );
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    throw new DatabaseError(`Failed to fetch deck ${deckId}.`, originalError);
  }
};

/**
 * Creates a new deck for the specified user.
 */
export const createDeck = async (
  userId: string,
  data: DeckCreatePayload,
): Promise<DeckApiResponse> => {
  console.log(
    `[Deck Service] Creating deck for user ${userId} with name "${data.name}"`,
  );
  try {
    const newDeck = await prisma.deck.create({
      data: { ...data, userId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        _count: { select: { cards: true } },
      },
    });

    return {
      ...newDeck,
      cardCount: newDeck._count?.cards ?? 0,
    };
  } catch (error: unknown) {
    // ★ catch (error: unknown) ★
    // P2002: Unique constraint violation (userId, name の組み合わせ)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      console.warn(
        `[Deck Service] Deck with name "${data.name}" likely already exists for user ${userId}.`,
      );
      throw new ConflictError(
        `A deck with the name "${data.name}" already exists.`,
      );
    }
    console.error(
      `[Deck Service] Database error creating deck for user ${userId}:`,
      error,
    );
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    throw new DatabaseError("Failed to create deck.", originalError);
  }
};

/**
 * Updates an existing deck, ensuring user ownership. Uses Result pattern.
 */
export const updateDeck = async (
  userId: string,
  deckId: string,
  data: DeckUpdatePayload,
): Promise<Result<DeckApiResponse, AppError>> => {
  console.log(`[Deck Service] Updating deck ${deckId} for user ${userId}`);
  try {
    const updatedDeck = await prisma.deck.update({
      where: {
        id: deckId,
        userId: userId,
      },
      data: data,
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        _count: { select: { cards: true } },
      },
    });

    return {
      ok: true,
      value: { ...updatedDeck, cardCount: updatedDeck._count?.cards ?? 0 },
    };
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      console.warn(
        `[Deck Service] Deck ${deckId} not found or permission denied for user ${userId} during update.`,
      );
      return {
        ok: false,
        error: new NotFoundError(
          `Deck with ID ${deckId} not found or access denied.`,
        ),
      };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      console.warn(
        `[Deck Service] Deck name conflict likely for user ${userId} during update.`,
      );
      return {
        ok: false,
        error: new ConflictError(
          `A deck with the name "${data.name}" may already exist.`,
        ),
      };
    }
    console.error(
      `[Deck Service] Database error updating deck ${deckId} for user ${userId}:`,
      error,
    );
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    return {
      ok: false,
      error: new DatabaseError("Failed to update deck.", originalError),
    };
  }
};

/**
 * Deletes a deck, ensuring user ownership.
 */
export const deleteDeck = async (
  userId: string,
  deckId: string,
): Promise<void> => {
  console.log(`[Deck Service] Deleting deck ${deckId} for user ${userId}`);
  try {
    await prisma.deck.delete({
      where: {
        id: deckId,
        userId: userId,
      },
    });
    console.log(`[Deck Service] Deck ${deckId} deleted successfully.`);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      console.warn(
        `[Deck Service] Deck ${deckId} not found or permission denied for user ${userId} during delete.`,
      );
      throw new NotFoundError(
        `Deck with ID ${deckId} not found or access denied.`,
      );
    }

    console.error(
      `[Deck Service] Database error deleting deck ${deckId} for user ${userId}:`,
      error,
    );
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    throw new DatabaseError(`Failed to delete deck ${deckId}.`, originalError);
  }
};
```

## File: types/api.types.ts

```typescript
// src/types/api.types.ts (AICardContent 導入 + DeckApiResponse 修正版)

// ↓↓↓ Prisma Client から必要な型や Enum を直接インポート ↓↓↓
// Import Prisma generated types using relative path
// Revert to named imports using relative path after confirming types exist in index.d.ts
import {
  type Deck as PrismaDeck,
  type Card as PrismaCard,
  type AICardContent as PrismaAICardContent,
  type AiContentType,
} from "../../node_modules/.prisma/client";

// Zod から Payload 型をインポート (変更なし)
// Corrected import path from 'lib/zod' to '../lib/zod'
import {
  type DeckCreatePayload as DeckCreatePayloadFromZod,
  type DeckUpdatePayload as DeckUpdatePayloadFromZod,
} from "../lib/zod";

/**
 * Payload for creating a new deck (POST /api/decks).
 */
export type DeckCreatePayload = DeckCreatePayloadFromZod;

/**
 * Payload for updating an existing deck (PUT /api/decks/{deckId}).
 */
export type DeckUpdatePayload = DeckUpdatePayloadFromZod;

// --- ↓↓↓ 新しい型定義: AICardContent の API レスポンス ↓↓↓ ---
/**
 * Structure of an AI-generated content object returned within a Card object by the API.
 * Represents a piece of content like an explanation or translation for a specific language.
 */
export type AICardContentApiResponse = Pick<
  PrismaAICardContent, // Use alias
  "id" | "contentType" | "language" | "content" | "createdAt" | "updatedAt"
  // cardId は CardApiResponse にネストされるため通常は含めない
>;
// --- ↑↑↑ 新しい型定義ここまで ↑↑↑ ---

// --- ↓↓↓ CardApiResponse 型を修正 ↓↓↓ ---
/**
 * Structure of a card object returned by the API.
 * Includes associated AI-generated content in the `aiContents` array.
 * Excludes fields like `explanation`, `translation` which are now managed within `aiContents`.
 */
export type CardApiResponse = Pick<
  PrismaCard, // Use alias
  // Card の基本フィールドを選択
  | "id"
  | "front"
  | "back"
  | "deckId"
  | "createdAt"
  | "updatedAt"
  | "interval"
  | "easeFactor"
  | "nextReviewAt"

  // explanation, translation は削除された
> & {
  // aiContents 配列を追加
  aiContents: AICardContentApiResponse[];
};
// --- ↑↑↑ CardApiResponse 型修正ここまで ↑↑↑ ---

// --- ↓↓↓ DeckApiResponse 型を修正 (cards 配列を削除) ↓↓↓ ---
/**
 * Structure of a deck object returned by the API (e.g., GET /api/decks/{deckId}).
 * Contains only core deck information, excluding the list of cards.
 * The list of cards for a deck should be fetched via the dedicated cards endpoint.
 */
export type DeckApiResponse = Pick<
  PrismaDeck,
  "id" | "name" | "description" | "createdAt" | "updatedAt" | "userId"
> & {
  cardCount?: number; // ★ Add this optional property ★
};
/**
 * Standard error response structure for API errors. (変更なし)
 */
export type ApiErrorResponse = {
  error: string; // Consider using a stricter type based on ERROR_CODES
  message: string;
  details?: unknown;
};

/**
 * Structure for pagination metadata returned by the API. (変更なし)
 */
export interface PaginationMeta {
  offset: number;
  limit: number;
  totalItems: number;
  _links: {
    self: string;
    next: string | null;
    previous: string | null;
  };
}

// --- PaginatedDecksResponse (変更なし、ただし data の型は修正後の DeckApiResponse に依存) ---
/**
 * Structure for the paginated response for decks. Contains core deck info only.
 */
export interface PaginatedDecksResponse {
  data: DeckApiResponse[]; // cards を含まない DeckApiResponse の配列
  pagination: PaginationMeta;
}

// --- PaginatedCardsResponse (data の型が更新された CardApiResponse を参照) ---
/**
 * Structure for the paginated response for cards. Contains Card objects with their associated aiContents.
 */
export interface PaginatedCardsResponse {
  data: CardApiResponse[]; // aiContents を含む CardApiResponse の配列
  pagination: PaginationMeta;
}

export type { AiContentType }; // ← この行を追加
```

## File: types/index.ts

```typescript
/**
 * Barrel file for exporting types from the types directory.
 */
import type { AppError } from "../lib/errors"; // AppError をインポート

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export * from "./api.types";

// Add exports from other type files here as needed
// export * from './another.types';
```

## File: middleware.ts

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createMiddlewareClient } from "@/lib/supabase";

const locales = ["en", "ja"];
const defaultLocale = "en"; // Needs to be uncommented

const intlMiddleware = createIntlMiddleware({
  locales: locales,
  defaultLocale: defaultLocale,
  localePrefix: "as-needed",
});

export async function middleware(req: NextRequest) {
  // 1. Create the base response object. Supabase needs this to potentially set cookies.
  const res = NextResponse.next();

  // 2. Run the intl middleware first.
  const intlResponse = intlMiddleware(req);

  // 3. Check if intlMiddleware wants to redirect or rewrite.
  // If so, respect that and return its response immediately.
  // We check headers because intlMiddleware might add locale-specific headers
  // even without a full redirect/rewrite.
  if (
    intlResponse.headers.get("location") ||
    intlResponse.headers.get("x-middleware-rewrite")
  ) {
    return intlResponse;
  }

  // 4. If intl didn't redirect/rewrite, proceed with Supabase auth.
  try {
    // Pass both req and the *original* res object to Supabase
    const supabase = createMiddlewareClient(req, res);
    await supabase.auth.getSession(); // Refreshes session cookie if needed
  } catch (e) {
    console.error("Supabase middleware error:", e);
    // Optionally handle the error, maybe return an error response
    // For now, just log it and continue.
  }

  // 5. Return the original response object (`res`).
  // This object might have been modified by Supabase (e.g., updated auth cookie).
  // It also implicitly carries any headers set by intlMiddleware that weren't redirects/rewrites.
  return res;
}

// middleware.ts の config 部分 (推奨)
// Keep the config as it is necessary for the middleware to run
export const config = {
  matcher: [
    // Match all paths except for specific assets and API routes.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)", // Added 'api|' to exclude API routes
  ],
};
```

## File: app/globals.css

```css
@import "tailwindcss";

/* --- 以下を一時的にコメントアウト --- */
/*
:root {
  --background: #ffffff; /* Consider removing if using Tailwind colors * /
  --foreground: #171717; /* Consider removing if using Tailwind colors * /
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
*/
```

## File: app/layout.tsx

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { NextTamaguiProvider } from "./NextTamaguiProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ImmersePal",
  description: "AIと共に、実践的なイマージョン学習を加速する。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextTamaguiProvider>
          <Providers>{children}</Providers>
        </NextTamaguiProvider>
      </body>
    </html>
  );
}
```

## File: app/page.tsx

```typescript
import Image from 'next/image';

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <ol className="list-inside list-decimal text-sm/6 text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="mb-2 tracking-[-.01em]">
            Get started by editing{' '}
            <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-[family-name:var(--font-geist-mono)] font-semibold">
              app/page.tsx
            </code>
            .
          </li>
          <li className="tracking-[-.01em]">
            Save and see your changes instantly.
          </li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our docs
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
```
