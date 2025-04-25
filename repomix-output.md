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
  [locale]/
    (app)/
      (auth)/
        login/
          page.tsx
        signup/
          page.tsx
      (main)/
        decks/
          [deckId]/
            page.tsx
          page.tsx
      test/
        page.tsx
    layout.tsx
    page.tsx
  globals.css
  layout.tsx
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
  providers.tsx
hooks/
  useAuth.ts
  useCardMutations.ts
  useCards.ts
  useDeckMutations.ts
  useDecks.ts
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

## File: app/(api)/api/decks/[deckId]/cards/[cardId]/route.ts
```typescript
// src/app/(api)/api/decks/[deckId]/cards/[cardId]/route.ts
import { NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/auth';
import { deleteCard } from '@/services/card.service';
// isAppError, ValidationError, AppError は handleApiError 等で必要になる可能性を考慮し残置。lint で不要と出たら削除。
import { ERROR_CODES, handleApiError } from '@/lib/errors';

interface DeleteParams {
  deckId: string;
  cardId: string;
}

/**
 * Deletes a specific card (DELETE)
 */
export async function DELETE(
  request: Request, // request object is not used but required by the signature
  context: { params: DeleteParams }
) {
  try {
    // 1. Authentication: Get user ID
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: ERROR_CODES.AUTHENTICATION_FAILED, message: 'Authentication required.' }, { status: 401 });
    }

    // 2. Extract parameters
    const { deckId, cardId } = await context.params;
    if (!deckId || !cardId) {
      return NextResponse.json({ error: ERROR_CODES.VALIDATION_ERROR, message: 'Missing deckId or cardId in URL.' }, { status: 400 });
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
import { updateCard } from '@/services/card.service'; // Import the update service
import { cardUpdateSchema, CardUpdatePayload } from '@/lib/zod'; // Import the validation schema and payload type
// import type { Result } from '@/types'; // ★ Removed unused import

// --- Type for PUT context params (can reuse or define specifically) ---
interface PutParams {
  deckId: string;
  cardId: string;
}

/**
 * Updates a specific card (PUT)
 */
export async function PUT(
  request: Request,
  context: { params: PutParams }
) {
  // No top-level try-catch needed when using Result pattern consistently in service

  // 1. Authentication: Get user ID
  const userId = await getServerUserId();
  if (!userId) {
    return NextResponse.json({ error: ERROR_CODES.AUTHENTICATION_FAILED, message: 'Authentication required.' }, { status: 401 });
  }

  // 2. Extract parameters
  const { deckId, cardId } = await context.params;
  if (!deckId || !cardId) {
     return NextResponse.json({ error: ERROR_CODES.VALIDATION_ERROR, message: 'Missing deckId or cardId in URL.' }, { status: 400 });
  }

  // 3. Get and Parse Request Body
  let body: unknown;
  try {
    body = await request.json();
  } catch (_e) { // _e は使わないが、catch 節は必要 (Removed unused eslint-disable comment)
    return NextResponse.json({ error: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid JSON body.' }, { status: 400 });
  }

  // 4. Input Validation (Zod)
  const validation = cardUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid input data.',
        details: validation.error.flatten().fieldErrors,
      },
      { status: 400 }
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

import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod'; // Import ZodError
import { createCard, getCardsByDeckId } from '@/services/card.service';
import { handleApiError, AppError, ERROR_CODES } from '@/lib/errors'; // Import AppError and ERROR_CODES
import { getServerUserId } from '@/lib/auth';

// Define the expected request body schema
const createCardSchema = z.object({
  front: z.string().min(1, 'Front text cannot be empty'),
  back: z.string().min(1, 'Back text cannot be empty'),
});

// --- POST Handler (カード作成) ---
export async function POST(
  request: Request,
  context: { params: { deckId: string } }
) {
  try {
    const { deckId } = await context.params;

    if (!deckId) {
      return NextResponse.json({ error: 'Deck ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validation = createCardSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.errors }, { status: 400 });
    }

    const { front, back } = validation.data;

    // Get user ID
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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
  context: { params: { deckId: string } }
) {
  try {
    // --- 4.1. クエリパラメータの読み取りと検証 ---
    const { searchParams } = new URL(request.url);

    const querySchema = z.object({
        limit: z.coerce.number().int().min(1).max(100).default(10), // デフォルト10, 最大100
        offset: z.coerce.number().int().min(0).default(0),       // デフォルト0
    });

    let validatedQuery: { limit: number; offset: number };
    try {
      validatedQuery = querySchema.parse({
        limit: searchParams.get('limit'),
        offset: searchParams.get('offset'),
      });
    } catch (err) {
       if (err instanceof ZodError) {
         return NextResponse.json({
           error: ERROR_CODES.VALIDATION_ERROR,
           message: 'Invalid query parameters for pagination.',
           details: err.flatten().fieldErrors,
         }, { status: 400 });
       }
       // Use handleApiError for other parsing errors
       return handleApiError(new AppError('Failed to parse pagination query parameters', 400, ERROR_CODES.VALIDATION_ERROR));
    }

    // --- ここまでで limit と offset が検証済み ---
    const { limit, offset } = validatedQuery; // Define variables *after* validation

    // ★★★ context.params を await してから deckId を取得 ★★★
    const { deckId } = await context.params;

    if (!deckId) {
      return NextResponse.json({ error: 'Deck ID is required' }, { status: 400 });
    }

    // 1. Authentication/Authorization
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 2. Call Service Function
    // --- 4.2. Service 関数の呼び出し変更 ---
    const { data: cards, totalItems } = await getCardsByDeckId(userId, deckId, { limit, offset });

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
import { NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/auth'; // Adjusted import path
import { deleteDeck, getDeckById } from '@/services/deck.service'; // Adjusted import path - Added getDeckById
import { isAppError, NotFoundError, PermissionError, DatabaseError } from '@/lib/errors'; // Adjusted import path
import { ApiErrorResponse } from '@/types/api.types'; // Added import for error response type
import { deckUpdateSchema, DeckUpdatePayload } from '@/lib/zod'; // Adjusted import path
import { updateDeck } from '@/services/deck.service'; // Adjusted import path
import { ERROR_CODES, handleApiError } from '@/lib/errors'; // Adjusted import path

// GET handler to retrieve a specific deck by ID
export async function GET(
  request: Request, // Keep request parameter as per Next.js convention
  context: { params: { deckId: string } } // Use context, removed locale
) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      const errorResponse: ApiErrorResponse = { error: 'UNAUTHORIZED', message: 'Authentication required.' };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const { deckId } = context.params; // Await params

    // Validate deckId format if necessary (e.g., using a regex or library)
    // Example: if (!isValidUUID(deckId)) { return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid Deck ID format.' }, { status: 400 }); }

    const deckData = await getDeckById(userId, deckId);

    // Successfully retrieved, return deck data
    return NextResponse.json(deckData, { status: 200 });

  } catch (error) {
    console.error('Error fetching deck:', error); // Log the error server-side

    if (isAppError(error)) {
      let status = 500;
      let errorCode: ApiErrorResponse['error'] = 'INTERNAL_SERVER_ERROR'; // Default error code

      if (error instanceof NotFoundError) {
        status = 404;
        errorCode = 'NOT_FOUND';
      } else if (error instanceof PermissionError) {
        status = 403;
        errorCode = 'FORBIDDEN';
      } else if (error instanceof DatabaseError) {
        status = 500;
        errorCode = 'DATABASE_ERROR';
      } else {
        // Use error name for other specific AppErrors if needed, otherwise keep default
        errorCode = error.name as ApiErrorResponse['error']; // Cast, assuming error names match ApiErrorResponse types
      }

      const errorResponse: ApiErrorResponse = { error: errorCode, message: error.message };
      return NextResponse.json(errorResponse, { status });
    }

    // Handle unexpected errors
    const errorResponse: ApiErrorResponse = { error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected internal server error occurred.' };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}


export async function DELETE(
  request: Request, // Keep request parameter as per Next.js convention, though unused
  context: { params: { deckId: string } } // Use context, removed locale
) {
  try {
    const { deckId } = await context.params; // Await params
    const userId = await getServerUserId();
    if (!userId) {
      const errorResponse: ApiErrorResponse = { error: 'UNAUTHORIZED', message: 'Authentication required.' }; // Updated message
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // deckId is now available here after await

    await deleteDeck(userId, deckId);

    // Successfully deleted, return 204 No Content
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Error deleting deck:', error); // Log the error for debugging

    if (isAppError(error)) {
      let status = 500;
      let errorCode: ApiErrorResponse['error'] = 'INTERNAL_SERVER_ERROR'; // Define errorCode here

      if (error instanceof NotFoundError) {
        status = 404;
        errorCode = 'NOT_FOUND'; // Assign specific code
      } else if (error instanceof PermissionError) {
        status = 403;
        errorCode = 'FORBIDDEN'; // Assign specific code
      } else if (error instanceof DatabaseError) {
        // Keep status 500 for DatabaseError or use a specific code if preferred
        status = 500;
        errorCode = 'DATABASE_ERROR'; // Assign specific code
      } else {
         // Use error name for other specific AppErrors if needed, otherwise keep default
        errorCode = error.name as ApiErrorResponse['error']; // Cast, assuming error names match ApiErrorResponse types
      }
      // Use specific error codes as defined above
      const errorResponse: ApiErrorResponse = { error: errorCode, message: error.message }; // Use errorCode
      return NextResponse.json(errorResponse, { status });
    }

    // Handle unexpected errors
    const errorResponse: ApiErrorResponse = { error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected internal server error occurred.' }; // Updated message
    return NextResponse.json(errorResponse, { status: 500 });
  }
}


// --- PUT ハンドラ (Result パターン対応) ---
export async function PUT(
  request: Request,
  context: { params: { deckId: string } }
) {
  try { // ★ ボディパースや Zod パースでの throw をキャッチする外側の try ★
    // 1. Authentication
    const userId = await getServerUserId();
    if (!userId) {
      // Use ERROR_CODES for consistency
      return NextResponse.json({ error: ERROR_CODES.AUTHENTICATION_FAILED, message: 'Authentication required.' }, { status: 401 });
    }

    // 2. Extract deckId
    const { deckId } = await context.params; // Await params as it's async now
    if (!deckId) {
        // Use ERROR_CODES
        return NextResponse.json({ error: ERROR_CODES.VALIDATION_ERROR, message: 'Missing deckId in URL.' }, { status: 400 });
    }

    // 3. Get and Parse Request Body
    let body: unknown;
    try {
      body = await request.json();
    } catch (_e) {
      // Use ERROR_CODES
      return NextResponse.json({ error: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid JSON body.' }, { status: 400 });
    }

    // 4. Input Validation (Zod) - safeParse を使用
    const validation = deckUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid input data for update.',
          // Provide flattened errors for better client-side handling
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    // Type assertion is safe here due to the success check
    const validatedData = validation.data as DeckUpdatePayload;

    // 5. Service Call (try...catch は不要 for AppErrors handled by Result)
    const result = await updateDeck(userId, deckId, validatedData);

    // 6. Handle Result
    if (result.ok) {
      // Success Response
      return NextResponse.json(result.value, { status: 200 });
    } else {
      // Error Handling using centralized handler
      // result.error is guaranteed to be AppError based on updateDeck signature
      return handleApiError(result.error);
    }

  } catch (error) {
     // Catch unexpected errors (e.g., network issues, runtime errors outside service call)
     // Pass the caught error to the centralized handler
     return handleApiError(error);
  }
}
```

## File: app/(api)/api/decks/route.ts
```typescript
// src/app/(api)/api/decks/route.ts (isAppError, ValidationError 削除)

import { NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/auth';
import { deckCreateSchema, DeckCreatePayload } from '@/lib/zod';
import { createDeck, getAllDecks } from '@/services/deck.service';
// ★ isAppError, ValidationError を削除 ★ AppError は handleApiError で暗黙的に使われる可能性を考慮し一旦残す
import { AppError, handleApiError, ERROR_CODES } from '@/lib/errors';
import { z, ZodError } from 'zod';

/**
 * 新しいデッキを作成する (POST)
 */
export async function POST(request: Request) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: ERROR_CODES.AUTHENTICATION_FAILED, message: 'Authentication required.' }, { status: 401 });
    }

    let body: DeckCreatePayload;
    try {
      body = await request.json();
    } catch (_e) { // Removed unused eslint-disable comment
      return NextResponse.json({ error: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid JSON format.' }, { status: 400 });
    }

    const validatedData = deckCreateSchema.parse(body);
    const newDeck = await createDeck(userId, validatedData);
    return NextResponse.json(newDeck, { status: 201 });

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid input data.',
        details: error.flatten().fieldErrors
       }, { status: 400 });
    }
    return handleApiError(error);
  }
}

/**
 * ログインユーザーのデッキ一覧を取得する (GET - ページネーション対応版)
 */
export async function GET(request: Request) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: ERROR_CODES.AUTHENTICATION_FAILED, message: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const querySchema = z.object({
        limit: z.coerce.number().int().min(1).max(100).default(10),
        offset: z.coerce.number().int().min(0).default(0),
    });

    let validatedQuery: { limit: number; offset: number };
    try {
      validatedQuery = querySchema.parse({
        limit: searchParams.get('limit'),
        offset: searchParams.get('offset'),
      });
    } catch (err) {
       if (err instanceof ZodError) {
         return NextResponse.json({
           error: ERROR_CODES.VALIDATION_ERROR,
           message: 'Invalid query parameters.',
           details: err.flatten().fieldErrors,
         }, { status: 400 });
       }
       // ★ AppError はここで new しているのでインポートが必要 ★
       return handleApiError(new AppError('Failed to parse query parameters', 400, ERROR_CODES.VALIDATION_ERROR));
    }

    const { limit, offset } = validatedQuery;

    const { data: decks, totalItems } = await getAllDecks(userId, { limit, offset });

    const baseUrl = '/api/decks';
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
      data: decks,
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

    return NextResponse.json(responseBody, { status: 200 });

  } catch (error) {
    return handleApiError(error);
  }
}
```

## File: app/(api)/api/test-explanation/route.ts
```typescript
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
```

## File: app/(api)/api/test-translation/route.ts
```typescript
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

## File: app/[locale]/(app)/(auth)/login/page.tsx
```typescript
// src/app/[locale]/(app)/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth';
import { Link } from '@/i18n/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { signIn } = useAuth();
  const [message, setMessage] = useState<string | null>(null)

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    } else {
      setMessage('Login successful! Redirecting...')
      // Redirect to the main decks page after login
      router.push('/decks')
    }
  }


  return (
    <div style={{ maxWidth: '400px', margin: 'auto', paddingTop: '50px' }}>
      <h2>Log In</h2>
      <form onSubmit={handleSignIn}>
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
            style={{ width: '100%', padding: '8px', marginBottom: '20px' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Logging In...' : 'Log In'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>Error: {error}</p>}
      {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
      <p style={{ marginTop: '20px' }}>
        {/* ★★★ Fixed ' error ★★★ */}
        Don&apos;t have an account? <Link href="/signup">Sign Up</Link>
      </p>
      {/* <p style={{ marginTop: '10px' }}>
        <Link href="/forgot-password">Forgot Password?</Link>
      </p> */}
    </div>
  )
}
```

## File: app/[locale]/(app)/(auth)/signup/page.tsx
```typescript
// src/app/[locale]/(app)/(auth)/signup/page.tsx
'use client'

import { useState } from 'react'
// import { useRouter } from 'next/navigation' // ★ Removed unused import
import { useAuth } from '@/hooks/useAuth';
import { Link } from '@/i18n/navigation';

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  // const router = useRouter() // ★ Removed unused variable
  const { signUp } = useAuth();

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error: signUpError } = await signUp(email, password);

    if (signUpError) {
      setError(signUpError.message)
    } else {
      setMessage('Sign up successful! Please check your email for verification.')
    }

    setLoading(false)
  }

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
          style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>Error: {error}</p>}
      {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
      <p style={{ marginTop: '20px' }}>
        Already have an account? <Link href="/login">Log In</Link>
      </p>
    </div>
  )
}
```

## File: app/[locale]/(app)/(main)/decks/[deckId]/page.tsx
```typescript
import { notFound } from 'next/navigation'; // Import notFound for 404 handling
import { getServerUserId } from '@/lib/auth'; // Import function to get user ID
import { getDeckById } from '@/services/deck.service'; // Import the service function
import { NotFoundError, PermissionError, DatabaseError, isAppError } from '@/lib/errors';
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
  params: Promise<{
    deckId: string;
    locale: string; // Locale might be needed for translations later
  }> | {
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
      errorInfo = { message: 'A database error occurred while loading the deck.', code: 'DATABASE_ERROR' };
    } else if (isAppError(error)) {
       // Catch other AppErrors
       errorInfo = { message: error.message, code: error.name };
    }
     else {
      // Handle unexpected errors
      errorInfo = { message: 'An unexpected error occurred.', code: 'INTERNAL_SERVER_ERROR' };
    }
  }

  // --- Render Error State ---
  if (errorInfo) {
    return <div className="p-4 text-red-600">Error loading deck: {errorInfo.message} {errorInfo.code ? `(Code: ${errorInfo.code})` : ''}</div>;
  }

  // --- Render Success State ---
  // If we reach here and deck is still null, something went wrong (should be caught above)
  if (!deck) {
     return <div className="p-4 text-red-600">Error loading deck: Deck data is unavailable.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      {/* Deck Details */}
      <h1 className="text-3xl font-bold mb-2">{deck.name}</h1>
      <p className="text-gray-600 mb-6">{deck.description || 'No description provided.'}</p>

      {/* Separator or spacing */}
      <hr className="my-6" />

      {/* Add New Card Form (Client Component) */}
      <div className="mb-8"> {/* Add some margin below the form */}
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
// src/app/[locale]/(app)/(main)/decks/page.tsx
'use client';

import React, { useState, useEffect } from 'react'; // ★ Add useEffect
import { createPortal } from 'react-dom'; // ★ Add createPortal
// import { useParams } from 'next/navigation'; // ★ Removed unused import
import { useDecks } from '@/hooks/useDecks';
import { useDeleteDeck } from '@/hooks/useDeckMutations';
import { DeckCreateForm } from '@/components/features/DeckCreateForm';
import { DeckEditModal } from '@/components/features/DeckEditModal'; // ★ Add DeckEditModal import
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { type DeckApiResponse } from '@/types'; // Import types
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

function DecksPage() {
  const { isLoading: authLoading } = useAuth();

  const ITEMS_PER_PAGE = 10;
  const [offset, setOffset] = useState(0);

  const { decks, pagination, isLoading: decksIsLoading, isFetching: decksIsFetching, error: decksError } = useDecks({
    offset: offset,
    limit: ITEMS_PER_PAGE,
  });

  const { mutate: deleteDeckMutate, isPending: isDeletingDeck, error: deleteDeckError } = useDeleteDeck();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<DeckApiResponse | null>(null);
  // const params = useParams(); // ★ Removed unused variable

  // ★★★ Add state for edit modal ★★★
  const [editingDeck, setEditingDeck] = useState<DeckApiResponse | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // For Portal
  // ★★★★★★★★★★★★★★★★★★★★★★★

  // ★ Add useEffect for Portal mount ★
  useEffect(() => {
    setIsMounted(true);
  }, []);
  // ★★★★★★★★★★★★★★★★★★★★★★★

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

  // ★★★ Add handleEditClick function ★★★
  const handleEditClick = (deck: DeckApiResponse) => {
    setEditingDeck(deck);
    setIsEditModalOpen(true);
  };
  // ★★★★★★★★★★★★★★★★★★★★★★★

  const Spinner = () => <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>;

  const isLoading = authLoading || decksIsLoading;

  if (isLoading && !pagination) {
      return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Decks</h1>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Create New Deck</h2>
        <DeckCreateForm onSuccess={() => console.log('Deck created callback!')} />
      </div>

      <h2 className="text-2xl font-semibold mb-4">Existing Decks</h2>
      {!decksIsLoading && decksError && (
        <div className="text-red-600 bg-red-100 border border-red-400 p-4 rounded mb-4">
          <p>Error loading decks:</p>
          <pre>{decksError instanceof Error ? decksError.message : JSON.stringify(decksError)}</pre>
        </div>
      )}
      {!isLoading && !decksError && decks && ( // Ensure decks is also checked
         <>
           {decks.length === 0 && offset === 0 && !decksIsFetching && ( // Check offset and fetching
             <p>You haven&apos;t created any decks yet.</p> // ★★★ Fixed '
           )}
           {decks.length > 0 && (
             <ul className="space-y-3 mb-6">
               {decks.map((deck: DeckApiResponse) => ( // Added type for deck
                 <li key={deck.id} className="p-4 border rounded-md shadow-sm bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                   <div className="flex justify-between items-center">
                     <Link href={`/decks/${deck.id}`} className="text-lg font-medium hover:underline">
                       {deck.name}
                     </Link>
                     <div className="space-x-2">
                       <Link href={`/decks/${deck.id}`} className="text-blue-500 hover:underline text-sm">View</Link>
                       <button
                         // ★ Remove disabled, add onClick ★
                         className="text-yellow-500 hover:underline text-sm disabled:opacity-50"
                         onClick={() => handleEditClick(deck)}
                         // disabled // ★ Removed ★
                       >
                         Edit
                       </button>
                       <button
                         className="text-red-500 hover:underline text-sm disabled:opacity-50"
                         onClick={() => handleDeleteClick(deck)}
                         disabled={isDeletingDeck || decksIsFetching} // Disable while fetching too
                       >
                         {isDeletingDeck && deckToDelete?.id === deck.id ? 'Deleting...' : 'Delete'}
                       </button>
                     </div>
                   </div>
                   {deck.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{deck.description}</p>}
                 </li>
               ))}
             </ul>
           )}
         </>
       )}
        {(decksIsLoading || decksIsFetching) && !decksError && ( // Loading/Fetching indicator
            <div className="flex justify-center items-center mt-4">
                <Spinner /> <span className="ml-2">Loading decks...</span>
            </div>
       )}

       {/* Pagination Controls */}
       {!isLoading && !decksError && pagination && pagination.totalItems > 0 && (
         <div className="mt-6 flex items-center justify-center space-x-4">
           <button
             onClick={() => setOffset(Math.max(0, offset - ITEMS_PER_PAGE))}
             disabled={!pagination._links.previous || decksIsFetching}
             className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
           >
             Previous
           </button>
           <span className="text-sm text-gray-700 dark:text-gray-300">
             {`Showing ${pagination.totalItems > 0 ? offset + 1 : 0} - ${Math.min(pagination.totalItems, offset + ITEMS_PER_PAGE)} of ${pagination.totalItems}`}
           </span>
           <button
             onClick={() => setOffset(offset + ITEMS_PER_PAGE)}
             disabled={!pagination._links.next || decksIsFetching}
             className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
           >
             Next
           </button>
         </div>
       )}

      {/* Delete Confirmation Dialog */}
      {deckToDelete && (
        <ConfirmationDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmDelete}
          title="Delete Deck"
          // ★★★ Ensure no unescaped ' here ★★★
          description={`Are you sure you want to delete "${deckToDelete.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          isConfirming={isDeletingDeck} // Only disable confirm button during delete op
        />
      )}

      {/* Delete Error Display */}
      {deleteDeckError && (
          <div className="text-red-600 mt-4">
            Error deleting deck: {deleteDeckError.message}
          </div>
      )}
      {/* ★★★ Add DeckEditModal rendering ★★★ */}
      {isMounted && editingDeck && createPortal(
        <DeckEditModal
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen} // Pass setter to allow modal to close itself
          deck={editingDeck} // Pass the deck data to edit
          onSuccess={() => {
            setIsEditModalOpen(false); // Close modal on success
            setEditingDeck(null);     // Clear editing state
            console.log('Deck update successful, modal closed.');
            // Optional: Add success toast/message here
          }}
        />,
        document.body // Render directly into body
      )}
      {/* ★★★★★★★★★★★★★★★★★★★★★★★★★ */}
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
        If the dialog below appears correctly centered on the screen,
        the positioning issue is likely caused by interactions with other
        components or styles in its original context (e.g., within CardList).
      </p>
      <p>
        If the dialog below is still misplaced or cut off, the issue
        might be with the dialog&apos;s internal styles, Tailwind setup, {/* ★★★ Fixed ' */}
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
        Scrollable area below the dialog trigger point (dialog should stay centered).
      </div>
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
  params: paramsPromise // 引数名を変更 (任意だが推奨)
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
    console.error("Failed to load messages for locale:", locale, error);
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
import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
 
export default function HomePage() {
  const t = useTranslations('HomePage');
  return (
    <div>
      <h1>{t('title')}</h1>
      <Link href="/about">{t('about')}</Link>
    </div>
  );
}
```

## File: components/features/CardCreateForm.tsx
```typescript
"use client"; // Add this directive

import React from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// Removed Tamagui imports
import { useCreateCard } from '@/hooks/useCardMutations';
import { useTranslations } from 'next-intl'; // Use the correct client hook

// Validation schema for the form
const cardSchema = z.object({
  front: z.string().min(1, 'Front text cannot be empty'),
  back: z.string().min(1, 'Back text cannot be empty'),
});

type CardFormData = z.infer<typeof cardSchema>;

interface CardCreateFormProps {
  deckId: string;
  onCardCreated?: () => void; // Optional callback after successful creation
}

export const CardCreateForm: React.FC<CardCreateFormProps> = ({ deckId, onCardCreated }) => {
  const t = useTranslations('cardCreateForm'); // Use the correct hook
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      front: '',
      back: '',
    },
  });

  const { mutate: createCard, isPending, error } = useCreateCard(deckId, {
    onSuccess: () => {
      console.log('Card created, resetting form.');
      reset(); // Reset form fields
      onCardCreated?.(); // Call optional callback
      // Optionally show a success toast/message
    },
    onError: (err) => {
      console.error('Card creation failed:', err);
      // Optionally show an error toast/message
    },
  });

  const onSubmit: SubmitHandler<CardFormData> = (data) => {
    console.log('Submitting new card:', data);
    createCard(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Front Input */}
      <div className="space-y-1"> {/* Replaced YStack */}
        <label htmlFor="front" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t ? t('frontLabel') : 'Front'} <span className="text-red-500">*</span>
        </label>
        <Controller
          name="front"
          control={control}
          render={({ field }) => (
            <textarea
              id="front"
              placeholder={t ? t('frontPlaceholder') : 'Enter front text...'}
              {...field}
              rows={3}
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.front ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
              aria-invalid={errors.front ? 'true' : 'false'}
            />
          )}
        />
        {errors.front && (
          <p className="mt-1 text-sm text-red-600" role="alert"> {/* Replaced Paragraph */}
            {errors.front.message}
          </p>
        )}
      </div>

      {/* Back Input */}
      <div className="space-y-1"> {/* Replaced YStack */}
        <label htmlFor="back" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t ? t('backLabel') : 'Back'} <span className="text-red-500">*</span>
        </label>
        <Controller
          name="back"
          control={control}
          render={({ field }) => (
            <textarea
              id="back"
              placeholder={t ? t('backPlaceholder') : 'Enter back text...'}
              {...field}
              rows={3}
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.back ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
              aria-invalid={errors.back ? 'true' : 'false'}
            />
          )}
        />
        {errors.back && (
          <p className="mt-1 text-sm text-red-600" role="alert"> {/* Replaced Paragraph */}
            {errors.back.message}
          </p>
        )}
      </div>

      {/* API Error Message */}
      {error && (
        <div className="mt-2 p-2 border border-red-300 bg-red-50 dark:bg-red-900/30 rounded-md" role="alert">
          <p className="text-sm text-red-700 dark:text-red-300"> {/* Replaced Paragraph */}
            {t ? t('creationError', { message: error.message }) : `Error: ${error.message}`}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <div> {/* Wrapper div */}
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* Replaced Spinner with text */}
          {isPending ? (t ? t('creatingButton') : 'Creating...') : (t ? t('createButton') : 'Add Card')}
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
    onSuccess: (updatedCard) => { // Remove unused variables parameter
      console.log('Card updated successfully:', updatedCard);
      setApiError(null);
      onSuccess?.(updatedCard); // Call the prop onSuccess
      onOpenChange(false); // Close modal
    },
    onError: (error) => { // Remove unused _variables parameter
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
      setApiError(new AppError('No card selected for editing.', 400, 'VALIDATION_ERROR'));
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
  const detailsString = apiError && isAppError(apiError) && apiError.details
    ? JSON.stringify(apiError.details, null, 2)
    : null;

  return (
    <dialog
      ref={dialogRef}
      className="p-6 rounded-lg shadow-xl bg-white dark:bg-gray-800 w-full max-w-md backdrop:bg-black backdrop:opacity-50"
    >
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Edit Card</h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <label htmlFor="front" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {errors.front.message}
            </p>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="back" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {errors.back.message}
            </p>
          )}
        </div>

        {/* Display API Error */}
        {apiError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900 dark:border-red-700 dark:text-red-200" role="alert">
            <p className="font-semibold">Error Updating Card</p>
            <p>{apiError.message}</p>
            {detailsString && (
              <pre className="mt-2 text-xs overflow-auto">{detailsString}</pre>
            )}
          </div>
        )}
        {/* Display Zod refine error */}
         {errors.root && ( // Check for root errors from refine
            <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
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
// src/components/features/CardList.tsx (修正案 - JSX構造見直し・完全版)

'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCards, Card } from '@/hooks/useCards';
import { AiContentType } from '@prisma/client';
import { useDeleteCard, Card as CardWithStringDates } from '@/hooks/useCardMutations';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { CardEditModal } from './CardEditModal';

interface CardListProps {
  deckId: string;
}

export const CardList: React.FC<CardListProps> = ({ deckId }) => {
  const ITEMS_PER_PAGE = 10;
  const [offset, setOffset] = useState(0);

  const { cards, pagination, isLoading, isFetching, error } = useCards(deckId, {
    offset: offset,
    limit: ITEMS_PER_PAGE,
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [editingCard, setEditingCard] = useState<CardWithStringDates | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const deleteCardMutation = useDeleteCard(deckId, {
    onSuccess: (deletedCardId) => {
      console.log(`Successfully deleted card ${deletedCardId}`);
      setIsDeleteDialogOpen(false);
      setCardToDelete(null);
    },
    onError: (error, deletedCardId) => {
      console.error(`Failed to delete card ${deletedCardId}:`, error.message);
      setIsDeleteDialogOpen(false);
      setCardToDelete(null);
      alert(`Error deleting card: ${error.message}`);
    },
  });

  const handleDeleteClick = (cardId: string) => {
    setCardToDelete(cardId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (cardToDelete) {
      deleteCardMutation.mutate({ cardId: cardToDelete });
    }
  };

  const handleEditClick = (cardFromUseCards: Card) => {
    if (!cardFromUseCards) return;
    const cardForModal: CardWithStringDates = {
        ...cardFromUseCards,
        nextReviewAt: cardFromUseCards.nextReviewAt instanceof Date ? cardFromUseCards.nextReviewAt.toISOString() : String(cardFromUseCards.nextReviewAt ?? ''),
        createdAt: cardFromUseCards.createdAt instanceof Date ? cardFromUseCards.createdAt.toISOString() : String(cardFromUseCards.createdAt ?? ''),
        updatedAt: cardFromUseCards.updatedAt instanceof Date ? cardFromUseCards.updatedAt.toISOString() : String(cardFromUseCards.updatedAt ?? ''),
        // aiContents are not included here for the modal for now
    };
    setEditingCard(cardForModal);
    setIsEditModalOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center py-10"><p>Loading cards...</p></div>;
  }
  if (error) {
    return <div className="p-4 text-red-600 bg-red-100 border border-red-400 rounded"><p>Error loading cards: {error.message}</p></div>;
  }
  if (!cards || cards.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">No cards found in this deck yet.</p>;
  }

  // --- Render Card List ---
  // Use a div wrapper instead of React Fragment just in case
  return (
    <div>
      {/* Card List */}
      <ul className="space-y-4">
        {cards.map((card) => (
          <li key={card.id} className="p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700 transition hover:shadow-md">
            <div className="flex justify-between items-start gap-4">
              {/* Card Content Area */}
              <div className="flex-grow">
                <div className="mb-2">
                  <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">Front</p>
                  <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{card.front}</p>
                </div>
                <div className="mb-3">
                  <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">Back</p>
                  <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{card.back}</p>
                </div>
                {/* AI Content Display Section */}
                {card.aiContents && card.aiContents.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">AI Content:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {card.aiContents.map((content) => (
                        <button
                          key={content.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                          title={`Type: ${content.contentType}, Lang: ${content.language}`}
                        >
                          {content.contentType === AiContentType.EXPLANATION ? 'Expl.' : 'Transl.'} ({content.language})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Action Buttons Area */}
              <div className="flex flex-col space-y-2 flex-shrink-0">
                <button
                  onClick={() => handleEditClick(card)}
                  className="px-2.5 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded hover:bg-yellow-200 dark:bg-yellow-700 dark:text-yellow-100 dark:hover:bg-yellow-600"
                  aria-label={`Edit card`}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(card.id)}
                  disabled={deleteCardMutation.isPending && cardToDelete === card.id}
                  className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 dark:bg-red-700 dark:text-red-100 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Delete card`}
                >
                  {deleteCardMutation.isPending && cardToDelete === card.id ? '...' : 'Delete'}
                </button>
              </div>
            </div>
            {/* Optional: SRS Info */}
             <div className="text-right text-xs text-gray-400 dark:text-gray-500 mt-1">
               Next: {new Date(card.nextReviewAt).toLocaleDateString()} (I:{card.interval}, EF:{card.easeFactor.toFixed(1)})
             </div>
          </li>
        ))}
      </ul>

      {/* Pagination Controls */}
      {isMounted && pagination && pagination.totalItems > ITEMS_PER_PAGE && (
         <div className="mt-6 flex items-center justify-center space-x-4">
            <button
                onClick={() => setOffset(Math.max(0, offset - ITEMS_PER_PAGE))}
                disabled={!pagination._links.previous || isFetching}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
                Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
                {`Page ${Math.floor(offset / ITEMS_PER_PAGE) + 1} / ${Math.ceil(pagination.totalItems / ITEMS_PER_PAGE)} (${pagination.totalItems} items)`}
            </span>
            <button
                onClick={() => setOffset(offset + ITEMS_PER_PAGE)}
                disabled={!pagination._links.next || isFetching}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
                Next
            </button>
        </div>
      )}

      {/* Modals */}
      {isMounted && createPortal(
        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          title="Delete Card"
          description="Are you sure you want to delete this card? This action cannot be undone."
          confirmText="Delete"
          isConfirming={deleteCardMutation.isPending}
        />,
        document.body
      )}
      {isMounted && createPortal(
        <CardEditModal
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          card={editingCard} // Ensure CardEditModal handles this type correctly
          deckId={deckId}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setEditingCard(null);
            console.log('Card update successful, modal closed.');
          }}
        />,
        document.body
      )}
    </div>
  );
};

// Re-export Card type alias (optional)
export type { Card };
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

export const DeckCreateForm: React.FC<DeckCreateFormProps> = ({ onSuccess }) => {
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
        console.error("Form submission error:", err);
      }
    });
  };

  let errorMessage: string | null = null;
  if (error) {
    if (error instanceof ApiError) {
      errorMessage = `Error: ${error.message} (Status: ${error.status})`;
      // Safely access the machine-readable code from the details property
      if (typeof error.details === 'object' && error.details !== null && 'error' in error.details) {
        // Now we know error.details is an object with an 'error' property
        // We might still want to check the type of error.details.error if needed
        const errorCode = (error.details as { error?: unknown }).error; // Cast to access
        if (errorCode) { // Check if errorCode is truthy
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
        <label htmlFor="deck-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Deck Name <span className="text-red-500">*</span>
        </label>
        <input
          id="deck-name"
          type="text"
          {...register('name')}
          className={`mt-1 block w-full px-3 py-2 border ${
            errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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
        <label htmlFor="deck-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description (Optional)
        </label>
        <textarea
          id="deck-description"
          {...register('description')}
          rows={3}
          className={`mt-1 block w-full px-3 py-2 border ${
            errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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
        <div className="mt-2 p-2 border border-red-300 bg-red-50 dark:bg-red-900/30 rounded-md" role="alert">
          <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
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

export function DeckCreateModal({ isOpen, onOpenChange, onSuccess }: DeckCreateModalProps) {
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
          <h2 id="deck-create-modal-title" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
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
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { deckUpdateSchema, DeckUpdatePayload } from 'src/lib/zod'; // Corrected path
import { useUpdateDeck, ApiError } from 'src/hooks/useDeckMutations'; // Corrected path
import type { DeckApiResponse } from 'src/types'; // Corrected path (assuming index.ts exports it)
import type { AppError } from 'src/lib/errors'; // Corrected path
import { AuthError } from '@supabase/supabase-js';

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
      name: '',
      description: '',
    },
  });

  // Reset form when modal opens or the deck data changes
  useEffect(() => {
    if (isOpen && deck) {
      reset({
        name: deck.name,
        description: deck.description ?? '', // Handle null description
      });
      setApiError(null); // Clear previous errors
    }
    // Optional: Clear form when modal closes (uncomment if needed)
    // if (!isOpen) {
    //   reset({ name: '', description: '' });
    //   setApiError(null);
    // }
  }, [isOpen, deck, reset]);

  const handleSuccess = (updatedDeck: DeckApiResponse) => {
    console.log('Deck updated successfully:', updatedDeck);
    setApiError(null);
    onSuccess?.();
    onOpenChange(false);
  };

  const handleError = (error: ApiError | AuthError | AppError) => { // Include AppError if needed
    console.error('Error updating deck:', error);
    // Check if error has a message property before accessing it
    const message = 'message' in error ? error.message : 'An unexpected error occurred.';
    setApiError(message);
  };

  // Setup mutation with callbacks
  const { mutate: updateDeckMutate, isPending: updateIsPending, error: mutationError } = useUpdateDeck();

  const onSubmit: SubmitHandler<DeckUpdatePayload> = (data) => {
    if (!deck) {
      setApiError('Error: No deck selected for editing.');
      return;
    }

    // Convert empty string description back to null if necessary for API/DB
    const dataToSubmit: DeckUpdatePayload = {
      ...data,
      description: data.description === '' ? null : data.description,
    };

    // Optional: Only submit if there are actual changes
    const hasChanges = dataToSubmit.name !== deck.name || dataToSubmit.description !== deck.description;
    if (!hasChanges) {
        onOpenChange(false); // Close if no changes
        return;
    }


    setApiError(null); // Clear previous errors before submitting
    updateDeckMutate(
        { deckId: deck.id, data: dataToSubmit },
        { onSuccess: handleSuccess, onError: handleError } // Pass callbacks here
    );
  };

  // Early return if modal is not open
  if (!isOpen) {
    return null;
  }

  // Determine if the submit button should be disabled
  const isProcessing = isSubmitting || updateIsPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md relative">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Edit Deck</h2>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-4">
            <label htmlFor="deck-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Deck Name
            </label>
            <input
              id="deck-name"
              type="text"
              {...register('name')}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              aria-invalid={errors.name ? 'true' : 'false'}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="deck-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="deck-description"
              rows={3}
              {...register('description')}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              aria-invalid={errors.description ? 'true' : 'false'}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* API Error Display */}
          {apiError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md dark:bg-red-900 dark:border-red-700 dark:text-red-200" role="alert">
              <p className="text-sm">{apiError}</p>
            </div>
          )}
          {/* Display mutation error if not handled by apiError state already */}
          {mutationError && !apiError && (
             <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md dark:bg-red-900 dark:border-red-700 dark:text-red-200" role="alert">
               <p className="text-sm">{'message' in mutationError ? mutationError.message : 'An unexpected error occurred during submission.'}</p>
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
                  ? 'bg-indigo-400 cursor-not-allowed dark:bg-indigo-700'
                  : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
              }`}
              disabled={isProcessing}
            >
              {isProcessing ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

## File: components/providers/AuthProvider.tsx
```typescript
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase' // Client-side client

// Define the shape of the context data
interface AuthContextType {
  session: Session | null
  user: User | null
  isLoading: boolean
  // Auth functions (signUp, signIn, signOut) will be provided by useAuth hook
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create the provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient() // Initialize client-side client
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Start as true

  useEffect(() => {
    setIsLoading(true) // Set loading true when checking session initially

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false) // Set loading false after initial check
    }).catch((error) => {
        console.error("Error getting initial session:", error);
        setIsLoading(false); // Ensure loading is false even on error
    })

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("Auth state changed:", _event, session);
        setSession(session)
        setUser(session?.user ?? null)
        // Don't set isLoading here, only on initial load
      }
    )

    // Cleanup subscription on unmount
    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [supabase]) // Depend on supabase client instance

  const value = {
    session,
    user,
    isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use the auth context
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
```

## File: components/ui/ConfirmationDialog.tsx
```typescript
"use client";

import React from 'react';

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
  confirmText = 'Confirm', // Default value
  cancelText = 'Cancel',   // Default value
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
        <div className="p-6 space-y-4"> {/* Replaced YStack */}
          <h2 id="confirmation-dialog-title" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100"> {/* Replaced Dialog.Title */}
            {title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400"> {/* Replaced Dialog.Description/Paragraph */}
            {description}
          </p>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4"> {/* Replaced XStack */}
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
              {isConfirming ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## File: components/providers.tsx
```typescript
'use client' // Mark this as a Client Component

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './providers/AuthProvider' // Import AuthProvider

// Create a React Query client instance (only once per app load)
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Default options for queries if needed
        staleTime: 60 * 1000, // 1 minute
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}


export function Providers({ children }: { children: React.ReactNode }) {
  // Initialize queryClient using state to ensure it's stable across re-renders
  // NOTE: useState ensures the client is created only once per component instance.
  // Use getQueryClient to handle server/client differences.
  const [queryClient] = useState(() => getQueryClient())

  return (
    // Wrap with AuthProvider
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
          {children}
      </QueryClientProvider>
    </AuthProvider>
  )
}
```

## File: hooks/useAuth.ts
```typescript
import { createClient } from '@/lib/supabase' // Client-side client
import { AuthError, User, Session } from '@supabase/supabase-js' // Removed unused AuthResponse, AuthTokenResponsePassword
import { useAuthContext } from '@/components/providers/AuthProvider' // Import the context hook

// Define the types for the hook's return value
interface AuthHookValue {
    // Auth state from context
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    // Auth functions
    signUp: (email: string, password: string) => Promise<{ data: { user: User | null; session: Session | null; }; error: AuthError | null; }>;
    signIn: (email: string, password: string) => Promise<{ data: { user: User | null; session: Session | null; }; error: AuthError | null; }>;
    signOut: () => Promise<{ error: AuthError | null }>;
}

export const useAuth = (): AuthHookValue => {
    // Get auth state from context
    const { session, user, isLoading } = useAuthContext();
    // Get the Supabase client instance for client components (needed for auth actions)
    const supabase = createClient();

    // Implement with desired signature (email, password separate)
    const signUp = async (email: string, password: string) => {
        // Call Supabase with the required object structure
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            // Optional: Add options like redirect URLs or metadata if needed
            // options: {
            //   emailRedirectTo: `${location.origin}/auth/callback`,
            // }
        });
        // Basic error logging, could be enhanced
        if (error) {
            console.error('Sign up error:', error.message);
        }
        // Return type is inferred by TypeScript
        return { data, error };
    };

    // Implement with desired signature (email, password separate)
    const signIn = async (email: string, password: string) => {
        // Call Supabase with the required object structure
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            console.error('Sign in error:', error.message);
        }
        // Return type is inferred by TypeScript
        return { data, error };
    };

    const signOut = async (): Promise<{ error: AuthError | null }> => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Sign out error:', error.message);
        }
        return { error };
    };

    // Return the auth state and functions
    return { session, user, isLoading, signUp, signIn, signOut };
};

// Type guard to check for AuthError
export function isAuthError(error: unknown): error is AuthError {
    if (error && typeof error === 'object') {
        return 'message' in error && 'status' in error;
    }
    return false;
}
```

## File: hooks/useCardMutations.ts
```typescript
// src/hooks/useCardMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppError, ERROR_CODES } from '@/lib/errors';
// import { useLocale } from 'next-intl'; // Removed
import { type CardUpdatePayload } from '@/lib/zod';

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
  frontAudioUrl?: string | null;
  backAudioUrl?: string | null;
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
  newData: CreateCardData
): Promise<Card> => {
  const apiUrl = `/api/decks/${deckId}/cards`; // locale-independent
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new AppError(
      errorData.message || 'Failed to create card',
      response.status,
      errorData.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      errorData.details
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
  }
) => {
  const queryClient = useQueryClient();
  return useMutation<Card, AppError, CreateCardData>({
    mutationFn: (newData) => createCardApi({ deckId }, newData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cards', deckId] });
      console.log('Card created successfully:', data);
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('Error creating card:', error);
      options?.onError?.(error);
    },
  });
};

// --- Delete Card API Call ---
const deleteCardApi = async (
  deckId: string,
  cardId: string
): Promise<void> => {
  const apiUrl = `/api/decks/${deckId}/cards/${cardId}`; // locale-independent
  const response = await fetch(apiUrl, { method: 'DELETE' });
  if (!response.ok && response.status !== 204) {
    let errorData = { message: 'Failed to delete card', errorCode: 'API_ERROR', details: null };
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      }
      
    } catch (_e) { // _e is unused
      console.warn("Could not parse error response body for DELETE card request.");
    }
    throw new AppError(
      errorData.message || 'Failed to delete card',
      response.status,
      (ERROR_CODES[errorData.errorCode as keyof typeof ERROR_CODES] || ERROR_CODES.INTERNAL_SERVER_ERROR),
      errorData.details
    );
  }
};

// --- useDeleteCard Hook ---
export const useDeleteCard = (
  deckId: string,
  options?: {
    onSuccess?: (cardId: string) => void;
    onError?: (error: AppError, cardId: string) => void;
  }
) => {
  const queryClient = useQueryClient();
  return useMutation<void, AppError, { cardId: string }>({
    mutationFn: ({ cardId }) => deleteCardApi(deckId, cardId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cards', deckId] });
      console.log(`Card ${variables.cardId} deleted successfully from deck ${deckId}`);
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
  updateData: CardUpdatePayload
): Promise<Card> => {
  const apiUrl = `/api/decks/${deckId}/cards/${cardId}`; // locale-independent
  console.log(`[updateCardApi] Calling PUT ${apiUrl}`);
  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });
  if (!response.ok) {
    let errorData = { message: `Failed to update card (Status: ${response.status})`, errorCode: 'API_ERROR', details: null };
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
           errorData = await response.json();
      }
    } catch (e) {
      console.warn("[updateCardApi] Could not parse error response body:", e);
    }
    throw new AppError(
      errorData.message,
      response.status,
      (ERROR_CODES[errorData.errorCode as keyof typeof ERROR_CODES] || ERROR_CODES.INTERNAL_SERVER_ERROR),
      errorData.details
    );
  }
  return response.json();
};

// --- useUpdateCard Hook ---
export const useUpdateCard = (
  deckId: string,
  options?: {
    onSuccess?: (updatedCard: Card, variables: { cardId: string; data: CardUpdatePayload }) => void;
    onError?: (error: AppError, variables: { cardId: string; data: CardUpdatePayload }) => void;
  }
) => {
  const queryClient = useQueryClient();
  return useMutation<
    Card,
    AppError,
    { cardId: string; data: CardUpdatePayload }
  >({
    mutationFn: ({ cardId, data }) => updateCardApi(deckId, cardId, data),
    onSuccess: (updatedCard, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cards', deckId] });
      console.log(`Card ${variables.cardId} updated successfully:`, updatedCard);
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

import { useQuery } from '@tanstack/react-query';
import { AppError, isAppError } from '@/lib/errors';
// Import types needed for pagination and the card data structure (including aiContents)
import {
  type PaginatedCardsResponse, // Contains CardApiResponse[] with aiContents
  type CardApiResponse,        // Card type including aiContents
  type PaginationMeta          // Pagination metadata type
} from '@/types/api.types';

// Interface for potential error object structure from the API
// Consider using ApiErrorResponse from api.types.ts if it matches the actual error structure
interface ApiErrorLike {
    message?: string;
    errorCode?: string; // Assuming AppError might add this
    details?: unknown;
}

// --- API function to fetch paginated cards ---
// Logic remains largely the same, types are updated via imports
const fetchPaginatedCards = async (deckId: string, offset: number, limit: number): Promise<PaginatedCardsResponse> => {
    if (!deckId) {
        // This check is important, although 'enabled' should prevent calls without deckId
        throw new Error('Deck ID is required to fetch cards.');
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
        let errorData: ApiErrorLike = { message: `Failed to fetch cards for deck ${deckId}. Status: ${response.status}` };
        try {
            const contentType = response.headers.get('content-type');
            if (response.body && contentType && contentType.includes('application/json')) {
                // Try to parse JSON error, potentially matching ApiErrorResponse or AppError structure
                errorData = await response.json();
            } else if (response.body) {
                 const textResponse = await response.text();
                 console.warn(`[useCards fetcher] Received non-JSON error response: ${textResponse.substring(0,100)}`);
                 // Ensure errorData is an object before assigning message
                 if (typeof errorData === 'object' && errorData !== null) {
                    errorData.message = textResponse.substring(0,100); // Use part of the text as the message
                 }
            }
        } catch (e) {
            console.warn('[useCards fetcher] Could not parse error response body:', e);
        }

        // Throw specific AppError if possible, otherwise a generic Error
        if (isAppError(errorData)) {
           // If errorData matches AppError structure (checked by type guard)
           throw new AppError(
               errorData.message, // Guaranteed string by AppError
               response.status,
               errorData.errorCode, // Guaranteed ErrorCode by AppError
               errorData.details
           );
        } else {
           // Handle cases where errorData is not a structured AppError
           const errorMessage = (typeof errorData === 'object' && errorData !== null && 'message' in errorData && typeof errorData.message === 'string')
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
        console.error('[useCards fetcher] Invalid response format received:', data);
        throw new Error('Invalid response format from cards API.');
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
export const useCards = (deckId: string | null, options: UseCardsOptions = {}): UseCardsReturn => {
    // Get pagination options with default values
    const { offset = 0, limit = 10 } = options;

    // Use React Query's useQuery hook
    // Type arguments use the imported, updated types
    const queryResult = useQuery<PaginatedCardsResponse, Error | AppError>({
        // Update queryKey to include pagination parameters for unique caching per page
        queryKey: ['cards', deckId, { offset, limit }],
        // Update queryFn to call the paginated fetcher
        queryFn: () => {
            // Double-check deckId existence (though 'enabled' handles this)
            if (!deckId) {
                // Should not happen if 'enabled' is working, return rejected promise
                // Use AppError for consistency if desired
                return Promise.reject(new AppError("Deck ID is required.", 400, 'VALIDATION_ERROR'));
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
// src/hooks/useDeckMutations.ts (API パス修正適用版)
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { AuthError } from '@supabase/supabase-js';
// ★ 必要な型をインポート。パスが /types/api.types.ts に変更されているか確認 ★
import { ApiErrorResponse, DeckApiResponse, DeckCreatePayload, DeckUpdatePayload } from '../types'; // DeckUpdatePayload をインポート

// ★ ApiError クラスの定義 (重複定義を避けるため、lib/errors.ts など共通の場所に移動することも検討) ★
// もし lib/errors.ts に同等のものがあればそちらをインポート
export class ApiError extends Error {
  status: number;
  details?: unknown; // Changed from any

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// --- Create Deck ---
// ★ locale 引数を削除 ★
const createDeckApi = async ({ deckData }: { deckData: DeckCreatePayload }): Promise<DeckApiResponse> => {
  const apiUrl = `/api/decks`; // ★ locale なし ★
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(deckData),
  });

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({ message: 'Failed to parse error response', error: 'PARSE_ERROR' })); // Ensure error property exists
    throw new ApiError(errorData.message || `HTTP error! status: ${response.status}`, response.status, errorData.details);
  }
  return response.json();
};

export const useCreateDeck = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  // const params = useParams(); // ★ 不要なら削除 ★
  // const locale = typeof params?.locale === 'string' ? params.locale : 'en'; // ★ 不要なら削除 ★

  const mutation = useMutation<DeckApiResponse, ApiError | AuthError, DeckCreatePayload>({
    // ★ locale 引数を削除 ★
    mutationFn: (deckData: DeckCreatePayload) => createDeckApi({ deckData }),
    onSuccess: (data) => {
      // ★ queryKey から locale を削除 (データが locale に依存しない場合) ★
      queryClient.invalidateQueries({ queryKey: ['decks', userId] });
      console.log('Deck created successfully:', data);
    },
    onError: (error) => {
      console.error('Error creating deck:', error);
    },
  });

  return mutation;
};


// --- Delete Deck ---
// ★ locale 引数を削除 ★
const deleteDeckApi = async ({ deckId }: { deckId: string }): Promise<void> => {
  const apiUrl = `/api/decks/${deckId}`; // ★ locale なし ★
  const response = await fetch(apiUrl, {
    method: 'DELETE',
  });
  if (response.status !== 204) {
     const errorData: ApiErrorResponse = await response.json().catch(() => ({ message: 'Failed to parse error response', error: 'PARSE_ERROR' }));
     throw new ApiError(errorData.message || `HTTP error! status: ${response.status}`, response.status, errorData.details);
  }
};


export const useDeleteDeck = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  // const params = useParams(); // ★ 不要なら削除 ★
  // const locale = typeof params?.locale === 'string' ? params.locale : 'en'; // ★ 不要なら削除 ★

  const mutation = useMutation<void, ApiError | AuthError, { deckId: string }>({
    // ★ locale 引数を削除 ★
    mutationFn: ({ deckId }: { deckId: string }) => deleteDeckApi({ deckId }),
    onSuccess: (_, variables) => {
      // ★ queryKey から locale を削除 ★
      queryClient.invalidateQueries({ queryKey: ['decks', userId] });
      console.log(`Deck ${variables.deckId} deleted successfully`);
    },
    onError: (error, variables) => {
      console.error(`Error deleting deck ${variables.deckId}:`, error);
    },
  });

  return mutation;
};

// --- Update Deck (もし実装する場合も同様に locale を削除) ---

// --- Update Deck API Call ---
const updateDeckApi = async ({ deckId, data }: { deckId: string; data: DeckUpdatePayload }): Promise<DeckApiResponse> => {
  const apiUrl = `/api/decks/${deckId}`; // locale なし
  console.log(`[updateDeckApi] Calling PUT ${apiUrl}`);

  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      // 必要に応じて他のヘッダー (Authorization など)
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    // ★ エラー時は ApiError を throw する ★
    const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}` }));
    const message = typeof errorData.message === 'string' ? errorData.message : `HTTP error! status: ${response.status}`;
    // 以前定義した ApiError クラスを使う
    throw new ApiError(message, response.status, errorData.details);
  }
  return response.json(); // 更新後の DeckApiResponse を返す
};


/**
 * Custom hook for updating an existing deck.
 */
export const useUpdateDeck = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Get user ID for cache invalidation key
  const userId = user?.id;

  const mutation = useMutation<
    DeckApiResponse,                      // onSuccess に渡されるデータ型 (更新後のデッキ)
    ApiError | AuthError,                 // onError に渡されるエラー型
    { deckId: string; data: DeckUpdatePayload } // mutate に渡す引数の型
  >({
    mutationFn: updateDeckApi, // 作成した API 呼び出し関数を指定
    onSuccess: (updatedDeck, variables) => {
      console.log(`Deck ${variables.deckId} updated successfully:`, updatedDeck);

      // Invalidate queries to refetch data
      // 1. デッキ一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['decks', userId] });

      // 2. (推奨) 個別デッキのキャッシュも無効化 (もしあれば)
      queryClient.invalidateQueries({ queryKey: ['deck', variables.deckId] });

      // (任意) キャッシュを直接更新して即時反映させる場合
      // queryClient.setQueryData(['deck', variables.deckId], updatedDeck);
      // queryClient.setQueryData(['decks', userId], (oldData: DeckApiResponse[] | undefined) =>
      //   oldData ? oldData.map(deck => deck.id === variables.deckId ? updatedDeck : deck) : []
      // );
    },
    onError: (error, variables) => {
      console.error(`Error updating deck ${variables.deckId}:`, error);
      // UI側で error.message などを表示することを想定
    },
  });

  return mutation;
};
```

## File: hooks/useDecks.ts
```typescript
// src/hooks/useDecks.ts
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
// Assuming types are exported correctly from api.types
import { DeckApiResponse, ApiErrorResponse, PaginatedDecksResponse, PaginationMeta } from '../types/api.types';

interface UseDecksOptions {
  offset?: number;
  limit?: number;
}

interface UseDecksReturn {
  decks: DeckApiResponse[];
  pagination: PaginationMeta | null;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null; // Keep error type as Error for simplicity from useQuery
}

const fetchPaginatedDecks = async (userId: string, offset: number, limit: number): Promise<PaginatedDecksResponse> => {
  const params = new URLSearchParams({
    offset: offset.toString(),
    limit: limit.toString(),
  });
  const apiUrl = `/api/decks?${params.toString()}`;
  console.log(`[useDecks fetcher] Fetching decks from: ${apiUrl}`);

  const response = await fetch(apiUrl);

  if (!response.ok) {
    // ★★★ Fixed let -> const ★★★
    const errorData: { message?: string } = { message: `Failed to fetch decks. Status: ${response.status}` };
    try {
      if (response.headers.get('content-length') !== '0' && response.body) {
        const parsedError: ApiErrorResponse | { message: string } = await response.json();
        // Only assign if parsedError has a message property
        if (parsedError && typeof parsedError.message === 'string') {
             errorData.message = parsedError.message;
        }
      }
    } catch (e) {
      console.warn('Could not parse error response body for fetchPaginatedDecks:', e);
    }
    throw new Error(errorData.message);
  }
  return response.json() as Promise<PaginatedDecksResponse>;
};


export const useDecks = (options: UseDecksOptions = {}): UseDecksReturn => {
  const { offset = 0, limit = 10 } = options;
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;

  // Specify Error type for useQuery to match the catch block
  const queryResult = useQuery<PaginatedDecksResponse, Error>({
    queryKey: ['decks', userId, { offset, limit }],
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
    error: queryResult.error, // This will be of type Error | null
  };
};
```

## File: i18n/navigation.ts
```typescript
import {createNavigation} from 'next-intl/navigation';
import {routing} from './routing';
 
// Lightweight wrappers around Next.js' navigation
// APIs that consider the routing configuration
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
```

## File: i18n/request.ts
```typescript
import {getRequestConfig} from 'next-intl/server';
import {hasLocale} from 'next-intl';
import {routing} from './routing';
 
export default getRequestConfig(async ({requestLocale}) => {
  // Typically corresponds to the `[locale]` segment
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
 
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
```

## File: i18n/routing.ts
```typescript
import {defineRouting} from 'next-intl/routing';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'ja'],
 
  // Used when no locale matches
  defaultLocale: 'en'
});
```

## File: lib/auth.ts
```typescript
import { cookies } from 'next/headers'
import { createSupabaseServerComponentClient } from '@/lib/supabase' // Use the server-side client creator
import { User } from '@supabase/supabase-js'
import { AuthError } from '@supabase/supabase-js' // Import AuthError type

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
    const resolvedCookieStore = await cookies() // Await the promise

    // 2. Create Supabase client for server actions/components
    const supabase = createSupabaseServerComponentClient(resolvedCookieStore);
    // 3. Get user session
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.error("Error getting server user:", error.message)
      return { user: null, error }
    }

    return { user, error: null }

  } catch (err: unknown) {
    // Catch potential errors during client creation or cookie access
    console.error("Unexpected error in getServerUser:", err)
    // Determine the error message safely
    let errorMessage = 'An unexpected error occurred retrieving server user.';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
        errorMessage = err.message;
    } else if (err instanceof Error) {
        errorMessage = err.message;
    }
    // Return a simpler error object
    const error: ServerAuthCatchError = {
        name: 'ServerAuthCatchError',
        message: errorMessage,
        status: 500, // Internal Server Error
    };
    return { user: null, error };
  }
}

// Optional: Helper to get just the user ID
export const getServerUserId = async (): Promise<string | null> => {
    const { user, error } = await getServerUser();
    if (error || !user) {
        return null;
    }
    return user.id;
}
```

## File: lib/db.ts
```typescript
import { PrismaClient } from '.prisma/client'

// Declare a global variable to hold the Prisma client instance
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Instantiate PrismaClient, reusing the instance in development
// or creating a new one in production
const prisma = global.prisma || new PrismaClient({
  // Optional: Log Prisma queries
  // log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
})

// In development, assign the instance to the global variable
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export default prisma
```

## File: lib/errors.ts
```typescript
// 標準エラーコードの例 (プロジェクトに合わせて定義)
export const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    RESOURCE_CONFLICT: 'RESOURCE_CONFLICT', // ★ 既存リソースとの衝突 (例: Unique制約)
    EXTERNAL_API_FAILURE: 'EXTERNAL_API_FAILURE',
    DATABASE_ERROR: 'DATABASE_ERROR',       // ★ データベース関連エラー
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  } as const; // Readonlyにする
  
  type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
  
  // アプリケーション共通のベースエラークラス
  export class AppError extends Error {
    public readonly statusCode: number;
    public readonly errorCode: ErrorCode;
    public readonly details?: unknown;

    constructor(message: string, statusCode: number, errorCode: ErrorCode, details?: unknown) {
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
    constructor(message: string = 'Invalid input data.', details?: unknown) {
      super(message, 400, ERROR_CODES.VALIDATION_ERROR, details);
    }
  }
  
  export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication failed.') {
      super(message, 401, ERROR_CODES.AUTHENTICATION_FAILED);
    }
  }
  
  export class PermissionError extends AppError {
    constructor(message: string = 'Permission denied.') {
      super(message, 403, ERROR_CODES.PERMISSION_DENIED);
    }
  }
  
  export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found.') {
      super(message, 404, ERROR_CODES.RESOURCE_NOT_FOUND);
    }
  }
  
  // ★ デッキ作成時のユニーク制約違反などに使用 ★
  export class ConflictError extends AppError {
    constructor(message: string = 'Resource conflict.') {
      super(message, 409, ERROR_CODES.RESOURCE_CONFLICT);
    }
  }
  
  export class ExternalApiError extends AppError {
     /**
       * Constructs an ExternalApiError.
       * @param message - A human-readable description of the error. Defaults to 'External API request failed.'.
       * @param originalError - Optional: The original error object caught, to be stored in details for logging.
       */
     constructor(message: string = 'External API request failed.', originalError?: Error) {
     // super の第4引数に originalError を渡して details に格納する
     super(message, 503, ERROR_CODES.EXTERNAL_API_FAILURE, originalError);
     }
    }
    

  
  // ★ 予期せぬデータベースエラーなどに使用 ★
  export class DatabaseError extends AppError {
      constructor(message: string = 'Database operation failed.', originalError?: Error) {
          // DBエラーの詳細はログには出すが、クライアントには返さない想定
          super(message, 500, ERROR_CODES.DATABASE_ERROR, originalError);
      }
  }
  
  // 予期せぬサーバー内部エラー
  export class InternalServerError extends AppError {
      constructor(message: string = 'An unexpected internal server error occurred.', originalError?: Error) {
          super(message, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, originalError);
      }
  }
  
  // Type guard to check if an error is an AppError
  export const isAppError = (error: unknown): error is AppError => {
      return error instanceof AppError;
  }
import { NextResponse } from 'next/server';
// Note: Assuming AppError, ERROR_CODES, InternalServerError, isAppError are defined above in the same file.
// If Prisma errors need specific handling, import Prisma from '@prisma/client'

/**
 * Centralized API error handler for Next.js API routes.
 * Logs the error and returns a standardized JSON response.
 * @param error - The error caught in the try-catch block.
 * @returns A NextResponse object with the appropriate status code and error details.
 */
export const handleApiError = (error: unknown): NextResponse => {
  console.error('API Error:', error); // Log the error for server-side debugging

  if (isAppError(error)) {
    // Handle known application errors
    return NextResponse.json(
      {
        message: error.message,
        errorCode: error.errorCode,
        details: error.details,
      },
      { status: error.statusCode }
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
  const internalError = new InternalServerError('An unexpected error occurred.', error instanceof Error ? error : undefined);
  return NextResponse.json(
    {
      message: internalError.message,
      errorCode: internalError.errorCode,
    },
    { status: internalError.statusCode }
  );
};
```

## File: lib/supabase.ts
```typescript
// src/lib/supabase.ts (最終修正版)
import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr'
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import { type NextRequest, type NextResponse } from 'next/server'

// Ensure environment variables are defined
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL")
}
if (!supabaseAnonKey) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY")
}
// if (!supabaseServiceRoleKey) { console.warn(...) }


// --- Client Components Client ---
export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseAnonKey!
  )

// --- Server Component Client (Read-Only Cookies) ---
export const createSupabaseServerComponentClient = (cookieStore: ReadonlyRequestCookies) => {
  return createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

// --- Server Action / Route Handler Client (Read/Write Cookies) ---
export const createSupabaseServerActionClient = (cookieStoreAccessor: () => ReadonlyRequestCookies) => {
      const cookieStore = cookieStoreAccessor();
      return createServerClient(
        supabaseUrl!,
        supabaseAnonKey!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
              try {
                cookieStoreAccessor().set(name, value, options)
              } catch (error) {
                console.error(`ServerActionClient: Failed to set cookie '${name}'.`, error);
              }
            },
            remove(name: string, options: CookieOptions) {
              try {
                cookieStoreAccessor().set({ name, value: '', ...options, maxAge: 0 });
              } catch (error) {
                console.error(`ServerActionClient: Failed to remove cookie '${name}'.`, error);
              }
            },
          },
        }
      )
    }

// --- Middleware Client ---
export const createMiddlewareClient = (req: NextRequest, res: NextResponse) => {
    return createServerClient(
        supabaseUrl!,
        supabaseAnonKey!,
        {
            cookies: {
                get(name: string) {
                    return req.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    req.cookies.set({ name, value, ...options })
                    res.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    req.cookies.delete(name)
                    res.cookies.set({ name, value: '', ...options, maxAge: 0 })
                },
            },
        }
    )
}

// --- Server-Side Admin Client (Optional) ---
export const createAdminClient = () => {
    if (!supabaseServiceRoleKey) {
        throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY for admin client.")
    }
    return createServerClient(
        supabaseUrl!,
        supabaseServiceRoleKey!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
            cookies: {
                get(_name: string) { return undefined; },
                set(_name: string, _value: string, _options: CookieOptions) {}, // Removed unused eslint-disable comment
                remove(_name: string, _options: CookieOptions) {}, // Removed unused eslint-disable comment
            }
        }
    )
}
```

## File: lib/zod.ts
```typescript
import { z } from 'zod';

// --- デッキ作成用スキーマと型 ---
export const deckCreateSchema = z.object({
  name: z.string()
    .min(1, { message: 'Deck name is required.' }) // 日本語メッセージはi18n対応を後で検討
    .max(100, { message: 'Deck name must be 100 characters or less.' }),
  description: z.string()
    .max(500, { message: 'Description must be 500 characters or less.' })
    .optional() // 任意入力
    .nullable(), // null も許容 (フォーム未入力時に null になる場合を考慮)
});

// スキーマから TypeScript 型を生成してエクスポート
export type DeckCreatePayload = z.infer<typeof deckCreateSchema>;

// --- 他のスキーマ (例: 学習結果更新用) ---
export const reviewResultSchema = z.object({
  cardId: z.string().cuid(), // cuid形式を期待する場合
  rating: z.enum(['AGAIN', 'HARD', 'GOOD', 'EASY']), // Enumの値と一致
});

export type ReviewResultPayload = z.infer<typeof reviewResultSchema>;

// --- パスワード変更用スキーマ (例) ---
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6), // 必要ならより複雑なルールを追加
});
export type ChangePasswordPayload = z.infer<typeof changePasswordSchema>;

// --- 他に必要な Zod スキーマをここに追加 ---
// --- カード作成用スキーマ ---
export const cardCreateSchema = z.object({
  front: z.string().min(1, { message: 'Front content is required.' }).max(1000, { message: 'Front content must be 1000 characters or less.' }),
  back: z.string().min(1, { message: 'Back content is required.' }).max(1000, { message: 'Back content must be 1000 characters or less.' }),
  // deckId は API ルートハンドラでパスパラメータから取得するため、ここには含めない
});
export type CardCreatePayload = z.infer<typeof cardCreateSchema>;


// --- カード更新用スキーマ ---
export const cardUpdateSchema = z.object({
  front: z.string()
    .min(1, { message: 'Front content cannot be empty if provided.' }) // 空文字での更新を防ぐ場合
    .max(1000, { message: 'Front content must be 1000 characters or less.' })
    .optional(), // 任意入力
  back: z.string()
    .min(1, { message: 'Back content cannot be empty if provided.' }) // 空文字での更新を防ぐ場合
    .max(1000, { message: 'Back content must be 1000 characters or less.' })
    .optional(), // 任意入力
}).refine(data => data.front !== undefined || data.back !== undefined, {
  message: "At least one field (front or back) must be provided for update.",
  path: ["front", "back"], // エラーメッセージを関連付けるフィールド
}); // front か back のどちらかは必須とする

// スキーマから TypeScript 型を生成してエクスポート
export type CardUpdatePayload = z.infer<typeof cardUpdateSchema>;
// --- デッキ更新用スキーマ ---
export const deckUpdateSchema = z.object({
  name: z.string()
    .min(1, { message: 'Deck name cannot be empty if provided.' })
    .max(100, { message: 'Deck name must be 100 characters or less.' })
    .optional(),
  description: z.string()
    .max(500, { message: 'Description must be 500 characters or less.' })
    .nullable() // Allow null for clearing description
    .optional(),
}).refine(data => data.name !== undefined || data.description !== undefined, {
  message: "At least one field (name or description) must be provided for update.",
  // Zod 3.23+ では refine の第二引数で path を指定可能
  // path: ["name", "description"], // 関連フィールドを指定
});

// スキーマから TypeScript 型を生成してエクスポート
export type DeckUpdatePayload = z.infer<typeof deckUpdateSchema>;
```

## File: services/ai.service.ts
```typescript
// src/services/ai.service.ts (デバッグログ追加後の完全版)

import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { VertexAI, GenerateContentRequest } from "@google-cloud/vertexai"; // Import necessary types
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
  const defaultRegion = 'asia-northeast1'; // Changed default region
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
  bucketName = process.env.GCS_BUCKET_NAME || "";
  if (!process.env.GCP_PROJECT_ID) console.warn("GCP_PROJECT_ID missing.");
  if (!bucketName && storage) console.warn("GCS_BUCKET_NAME missing.");

  // Determine Vertex AI model name
  const fallbackModel = "gemini-1.5-flash-002"; // Changed fallback model to latest alias
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
    const generativeModel = vertexAI.getGenerativeModel({
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
    const generativeModel = vertexAI.getGenerativeModel({
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
```

## File: services/card.service.ts
```typescript
import prisma from "@/lib/db"; // Use the same prisma instance as other services
import { Card, AiContentType, AICardContent } from "@prisma/client"; // Import Card type directly again
import {
  AppError,
  NotFoundError,
  PermissionError,
  DatabaseError,
} from "@/lib/errors"; // Import custom errors
import { generateExplanation, generateTranslation } from "@/services/ai.service";
import type { Result } from "@/types"; // Import Result type
import type { CardUpdatePayload } from "@/lib/zod"; // Import Zod payload type

// Define options and result types for pagination
interface GetCardsByDeckIdOptions {
  limit?: number;
  offset?: number;
}

// ↓↓↓ 戻り値の型 Card[] を Card と関連 AICardContent を含む型に変更 (Prisma の推論を利用することも可能) ↓↓↓
// 参考: Prisma が生成する型を使う場合: import { Prisma } from '@prisma/client'; type CardWithAiContents = Prisma.CardGetPayload<{ include: { aiContents: true } }>;
// ここではシンプルに Card[] のままでも良いが、取得内容が変わることを示すコメントを追加
type GetCardsByDeckIdResult = {
  // data: Card[]; // Card に aiContents が含まれるようになる
  data: (Card & { aiContents: AICardContent[] })[]; // より正確な型 (AICardContent のインポートが必要)
  totalItems: number;
};

/**
 * Fetches cards belonging to a specific deck with pagination, ensuring user ownership.
 * @param userId - The ID of the user requesting the cards.
 * @param deckId - The ID of the deck.
 * @param options - Optional parameters for pagination (limit, offset).
 * @returns A promise that resolves to an object containing the cards array and total item count.
 * @throws {NotFoundError} If the deck is not found.
 * @throws {PermissionError} If the user does not own the deck.
 * @throws {DatabaseError} If any other database error occurs.
 */
export const getCardsByDeckId = async (
  userId: string,
  deckId: string,
  options: GetCardsByDeckIdOptions = {},
): Promise<GetCardsByDeckIdResult> => {
  // Set default values and validate limit/offset
  const limit = options.limit ?? 10; // Default limit: 10
  const offset = options.offset ?? 0; // Default offset: 0
  const validatedLimit = Math.max(1, limit); // Ensure limit is at least 1
  const validatedOffset = Math.max(0, offset); // Ensure offset is non-negative

  try {
    // 1. Verify deck existence and ownership (existing logic)
    const deck = await prisma.deck.findUnique({
      where: {
        id: deckId,
      },
      select: {
        // Only select userId to check ownership, avoid fetching full deck
        userId: true,
      },
    });

    if (!deck) {
      throw new NotFoundError(`Deck with ID ${deckId} not found.`);
    }
    if (deck.userId !== userId) {
      throw new PermissionError(
        `User does not have permission to access deck with ID ${deckId}.`,
      );
    }

    // 2. Fetch cards and count total items in parallel if ownership is confirmed
    const [cards, totalItems] = await prisma.$transaction([
      prisma.card.findMany({
        where: { deckId: deckId }, // Only fetch cards for this deck
        orderBy: { createdAt: "asc" }, // Or your desired order
        skip: validatedOffset, // Use validated offset for skipping
        take: validatedLimit,
        include: {
          aiContents: {
            // 必要なら 여기서 where や select でさらに絞り込むことも可能
            // 例: contentType や language で絞る
            // where: { language: 'en' },
            select: {
              // 返すフィールドを選択 (id は任意、他は通常必要)
              id: true,
              cardId: true,
              contentType: true,
              language: true,
              content: true,
              createdAt: true, // 必要に応じて
              updatedAt: true, // 必要に応じて
            },
          },
        }, // Use validated limit for taking
      }),
      prisma.card.count({
        where: { deckId: deckId }, // Count cards only for this deck
      }),
    ]);

    // 3. Return the paginated data and total count
    return {
      data: cards,
      totalItems: totalItems,
    };
  } catch (error) {
    // Re-throw known application errors (existing logic)
    if (error instanceof NotFoundError || error instanceof PermissionError) {
      throw error;
    }
    // Handle other potential errors
    console.error(
      `Database error fetching cards for deck ${deckId} by user ${userId}:`,
      error,
    );
    throw new DatabaseError(
      "Failed to fetch cards due to a database error.",
      error instanceof Error ? error : undefined,
    );
  }
};

/**
 * Creates a new card, ensuring user ownership, and attempts to generate
 * explanation (en) and translation (en->ja) for the 'front' text,
 * saving them to the AICardContent table.
 * @param userId - The ID of the user creating the card.
 * @param data - Object containing deckId, front text, and back text.
 * @returns A promise that resolves to the newly created card object (without aiContents populated initially).
 * @throws {NotFoundError} If the deck is not found.
 * @throws {PermissionError} If the user does not own the deck.
 * @throws {DatabaseError} If the initial card creation fails.
 **/

export const createCard = async (
  userId: string,
  data: { deckId: string; front: string; back: string },
): Promise<Card> => {
  // 戻り値は Card のまま
  const { deckId, front, back } = data;
  let newCard: Card;

  try {
    // 1. Verify deck existence and ownership (変更なし)
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
      select: { userId: true },
    });

    if (!deck) {
      throw new NotFoundError(`Deck with ID ${deckId} not found.`);
    }
    if (deck.userId !== userId) {
      throw new PermissionError(
        `User does not have permission to add cards to deck with ID ${deckId}.`,
      );
    }

    // 2. Create the card in the database (変更なし)
    newCard = await prisma.card.create({
      data: {
        front,
        back,
        deckId,
      },
    });

    // --- AI コンテンツ生成・保存 ---

    // 3. Generate Explanation (English)
    try {
      const explanationLanguage = "en"; // ★仮定
      console.log(
        `[Card Service] Attempting to generate explanation for card ${newCard.id}, lang: ${explanationLanguage}`,
      );
      const explanationContent = await generateExplanation(
        front,
        explanationLanguage,
      );

      if (explanationContent) {
        // ↓↓↓ ★★★ ここを修正: prisma.aICardContent.create を使う ★★★ ↓↓↓
        await prisma.aICardContent.create({
          data: {
            cardId: newCard.id, // 作成されたカードの ID を指定
            contentType: AiContentType.EXPLANATION, // Enum を使用
            language: explanationLanguage,
            content: explanationContent,
          },
        });
        console.log(
          `[Card Service] Explanation (${explanationLanguage}) saved for card ${newCard.id}.`,
        );
        // ↑↑↑ ★★★ 修正ここまで ★★★ ↑↑↑
      }
    } catch (aiError) {
      // AI エラーはログに残すが、カード作成は続行
      console.error(
        `[Card Service] Failed to generate/save explanation for card ${newCard.id}. Error:`,
        aiError,
      );
    }

    // 4. Generate Translation (English to Japanese)
    try {
      const sourceLanguage = "en"; // ★仮定
      const targetLanguage = "ja"; // ★仮定
      console.log(
        `[Card Service] Attempting to generate translation for card ${newCard.id}, ${sourceLanguage} -> ${targetLanguage}`,
      );
      const translationContent = await generateTranslation(
        front,
        sourceLanguage,
        targetLanguage,
      );

      if (translationContent) {
        // ↓↓↓ ★★★ ここも修正: prisma.aICardContent.create を使う ★★★ ↓↓↓
        await prisma.aICardContent.create({
          data: {
            cardId: newCard.id,
            contentType: AiContentType.TRANSLATION, // Enum を使用
            language: targetLanguage, // 翻訳先の言語コード
            content: translationContent,
          },
        });
        console.log(
          `[Card Service] Translation (${targetLanguage}) saved for card ${newCard.id}.`,
        );
        // ↑↑↑ ★★★ 修正ここまで ★★★ ↑↑↑
      }
    } catch (aiError) {
      // AI エラーはログに残すが、カード作成は続行
      console.error(
        `[Card Service] Failed to generate/save translation for card ${newCard.id}. Error:`,
        aiError,
      );
    }

    // 5. Return the initially created card object
    //   (aiContents を含まない Card オブジェクト)
    return newCard;
  } catch (error) {
    // Handle errors from initial deck check or prisma.card.create (変更なし)
    if (error instanceof NotFoundError || error instanceof PermissionError) {
      throw error;
    }
    console.error(
      `Database error creating card in deck ${deckId} by user ${userId}:`,
      error,
    );
    throw new DatabaseError(
      "Failed to create card due to a database error.",
      error instanceof Error ? error : undefined,
    );
  }
};
/**
 * Deletes a specific card, ensuring user ownership.
 * @param userId - The ID of the user performing the deletion.
 * @param deckId - The ID of the deck the card belongs to (for permission check).
 * @param cardId - The ID of the card to delete.
 * @returns A promise that resolves when the card is deleted.
 * @throws {NotFoundError} If the card is not found or doesn't belong to the specified deck.
 * @throws {PermissionError} If the user does not own the deck the card belongs to.
 * @throws {DatabaseError} If any other database error occurs.
 */
export const deleteCard = async (
  userId: string,
  deckId: string,
  cardId: string,
): Promise<void> => {
  try {
    // 1. Verify card existence and ownership via the deck
    // Use findFirstOrThrow to ensure the card exists and belongs to the user's deck.
    // This implicitly checks deckId match as well.
    await prisma.card.findFirstOrThrow({
      where: {
        id: cardId,
        deck: {
          id: deckId, // Ensure it's in the correct deck
          userId: userId, // Ensure the deck belongs to the user
        },
      },
    });

    // 2. Delete the card if ownership is confirmed
    await prisma.card.delete({
      where: {
        id: cardId,
      },
    });
  } catch (error: unknown) {
    // Handle Prisma's specific 'RecordNotFound' error (P2025) and our NotFoundError
    let isPrismaNotFoundError = false;
    if (typeof error === "object" && error !== null && "code" in error) {
      isPrismaNotFoundError = (error as { code?: unknown }).code === "P2025";
    }

    if (isPrismaNotFoundError || error instanceof NotFoundError) {
      // P2025 can mean either the card doesn't exist OR the deck/user condition failed.
      // We treat both as a NotFound or Permission issue from the client's perspective.
      // A more specific check could be done by querying the card first, then the deck,
      // but findFirstOrThrow is more concise for this combined check.
      throw new NotFoundError(
        `Card with ID ${cardId} not found or user does not have permission.`,
      );
    }
    // Re-throw known application errors (though findFirstOrThrow handles NotFound implicitly)
    if (error instanceof PermissionError) {
      // Keep this in case other permission logic is added
      throw error;
    }
    // Handle other potential database errors
    console.error(
      `Database error deleting card ${cardId} from deck ${deckId} by user ${userId}:`,
      error,
    );
    throw new DatabaseError(
      "Failed to delete card due to a database error.",
      error instanceof Error ? error : undefined,
    );
  }
};
/**
 * Updates a specific card's front and/or back text, ensuring user ownership.
 * @param userId - The ID of the user performing the update.
 * @param deckId - The ID of the deck the card belongs to (for permission check).
 * @param cardId - The ID of the card to update.
 * @param data - An object containing optional 'front' and 'back' text to update.
 * @returns A promise that resolves to the updated card object.
 * @throws {NotFoundError} If the card is not found or doesn't belong to the specified deck owned by the user.
 * @throws {PermissionError} If the user does not own the deck (implicitly checked).
 * @throws {DatabaseError} If any other database error occurs.
 */
export const updateCard = async (
  userId: string,
  deckId: string,
  cardId: string,
  data: CardUpdatePayload, // Use Zod payload type
): Promise<Result<Card, AppError>> => {
  // Return Result type with direct Card

  // 1. Verify card existence and ownership via the deck using findFirst
  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
      deck: {
        id: deckId,
        userId: userId,
      },
    },
    select: { id: true }, // Only need to confirm existence and ownership
  });

  if (!card) {
    // Card not found or user doesn't have permission for this deck/card
    return {
      ok: false,
      error: new NotFoundError(
        `Card with ID ${cardId} not found or user does not have permission for deck ${deckId}.`,
      ),
    };
  }

  // 2. Prepare update data (already validated by Zod schema in API layer)
  // Zod refine ensures at least one field is present
  const updateData: CardUpdatePayload = {};
  if (data.front !== undefined) {
    updateData.front = data.front;
  }
  if (data.back !== undefined) {
    updateData.back = data.back;
  }

  // Note: The check for empty updateData is less critical now
  // because the Zod schema's .refine() ensures at least one field is provided.
  // if (Object.keys(updateData).length === 0) {
  //   // This case should ideally not happen if Zod validation is correct
  //   // If it does, returning the existing card might be an option, but requires fetching it again.
  //   // For simplicity, we rely on the validation layer.
  // }

  // 3. Execute the update within a try...catch for database errors
  try {
    const updatedCard = await prisma.card.update({
      where: {
        id: cardId,
        // No need for deck/userId check here again as findFirst confirmed it
      },
      data: updateData,
    });

    // 4. Return success result
    return { ok: true, value: updatedCard };
  } catch (error: unknown) {
    // Handle potential database errors during the update operation
    console.error(
      `Database error updating card ${cardId} in deck ${deckId} by user ${userId}:`,
      error,
    );
    // Return a DatabaseError Result
    return {
      ok: false,
      error: new DatabaseError(
        "Failed to update card due to a database error.",
        error instanceof Error ? error : undefined,
      ),
    };
  }
};
```

## File: services/deck.service.ts
```typescript
// src/services/deck.service.ts
// import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'; // ★★★ Removed unused import
import type { Deck } from '@prisma/client'; // Import Deck type
import prisma from '@/lib/db';
import { AppError, ConflictError, DatabaseError, NotFoundError, PermissionError } from '@/lib/errors'; // ★ Import AppError
import type { DeckCreatePayload, DeckUpdatePayload } from '@/lib/zod'; // ★ Import DeckUpdatePayload
import type { Result } from '@/types'; // ★ Import Result type

// --- Pagination types ---
interface GetAllDecksOptions {
  limit?: number;
  offset?: number;
}
type GetAllDecksResult = {
  data: Deck[];
  totalItems: number;
};

// --- Service Functions ---

export const createDeck = async (userId: string, data: DeckCreatePayload): Promise<Deck> => {
  try {
    const newDeck = await prisma.deck.create({
      data: { userId, name: data.name, description: data.description },
    });
    return newDeck;
  } catch (error) {
    // ★★★ Added description for ts-expect-error ★★★
    // @ts-expect-error Prisma error P2002 check requires direct access to 'code' property which might not exist on generic error type
    if (error && typeof error === 'object' && error.code === 'P2002') {
      console.log('[SERVICE CATCH BLOCK] P2002 code detected. Throwing ConflictError.');
      throw new ConflictError(`A deck with the name "${data.name}" already exists.`);
    }
    console.error('[SERVICE CATCH BLOCK] Not P2002 or check failed. Throwing DatabaseError.');
    throw new DatabaseError('Failed to create the deck due to a database error.', error instanceof Error ? error : undefined);
  }
};

export const getAllDecks = async (
    userId: string,
    options: GetAllDecksOptions = {}
): Promise<GetAllDecksResult> => {
    const limit = options.limit ?? 10;
    const offset = options.offset ?? 0;
    const validatedLimit = Math.max(1, limit);
    const validatedOffset = Math.max(0, offset);

  try {
    const [decks, totalItems] = await prisma.$transaction([
        prisma.deck.findMany({
          where: { userId: userId },
          orderBy: { createdAt: 'desc' },
          skip: validatedOffset,
          take: validatedLimit,
        }),
        prisma.deck.count({
          where: { userId: userId },
        }),
      ]);
    return { data: decks, totalItems: totalItems };
  } catch (error) {
    console.error(`Database error retrieving decks for user ${userId} with pagination:`, error);
    throw new DatabaseError('Failed to retrieve decks due to a database error.', error instanceof Error ? error : undefined);
  }
};

export const deleteDeck = async (userId: string, deckId: string): Promise<void> => {
  try {
    const deleteResult = await prisma.deck.deleteMany({
      where: { id: deckId, userId: userId },
    });
    if (deleteResult.count === 0) {
      throw new NotFoundError(`Deck with ID ${deckId} not found or user does not have permission.`);
    }
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    console.error(`Database error deleting deck ${deckId} for user ${userId}:`, error);
    throw new DatabaseError('Failed to delete deck due to a database error.', error instanceof Error ? error : undefined);
  }
};

export const getDeckById = async (userId: string, deckId: string): Promise<Deck> => {
  try {
    const deck = await prisma.deck.findUnique({ where: { id: deckId } });
    if (!deck) throw new NotFoundError(`Deck with ID ${deckId} not found.`);
    if (deck.userId !== userId) throw new PermissionError(`User does not have permission to access deck with ID ${deckId}.`);
    return deck;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof PermissionError) throw error;
    console.error(`Database error retrieving deck ${deckId} for user ${userId}:`, error);
    throw new DatabaseError('Failed to retrieve deck due to a database error.', error instanceof Error ? error : undefined);
  }
};
/**
 * Updates an existing deck for a given user. Returns a Result object.
 * @param userId - The ID of the user updating the deck.
 * @param deckId - The ID of the deck to update.
 * @param data - The data to update (name, description). At least one field must be provided.
 * @returns A Promise resolving to a Result object containing the updated Deck or an AppError.
 */
export const updateDeck = async (
  userId: string,
  deckId: string,
  data: DeckUpdatePayload
): Promise<Result<Deck, AppError>> => { // ★ 戻り値の型を Result に変更 ★

  // 1. Verify deck existence first using findUnique (not findUniqueOrThrow)
  const currentDeck = await prisma.deck.findUnique({
    where: { id: deckId },
  });

  if (!currentDeck) {
    return { ok: false, error: new NotFoundError(`Deck with ID ${deckId} not found.`) };
  }

  // 2. Check ownership
  if (currentDeck.userId !== userId) {
    return { ok: false, error: new PermissionError(`User does not have permission to update deck with ID ${deckId}.`) };
  }

  // 3. Perform the update within a try...catch for specific Prisma errors
  try {
    const updatedDeck = await prisma.deck.update({
      where: {
        id: deckId,
        // userId: userId, // Optional: Redundant check but adds safety
      },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });

    // 4. Return success result
    return { ok: true, value: updatedDeck };

  } catch (error: unknown) {
    // Handle potential errors during the update operation

    // Prisma's Unique constraint violation (P2002) for deck name
    // @ts-expect-error Check for Prisma specific error code if needed - add description
    if (error && typeof error === 'object' && error.code === 'P2002') {
       console.log('[SERVICE UPDATE CATCH BLOCK] P2002 detected. Returning ConflictError.');
       return {
         ok: false,
         // ★ ConflictError を error として返す ★
         error: new ConflictError(`A deck with the name "${data.name}" likely already exists.`)
       };
    }

    // Other potential database errors
    console.error(`Database error updating deck ${deckId} for user ${userId}:`, error);
    // ★ DatabaseError を error として返す ★
    return {
      ok: false,
      error: new DatabaseError('Failed to update deck due to a database error.', error instanceof Error ? error : undefined)
    };
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
  | "frontAudioUrl"
  | "backAudioUrl"
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
  PrismaDeck, // Use alias
  "id" | "name" | "description" | "createdAt" | "updatedAt" | "userId" // userId も API 設計に応じて含めるか検討
  // 'cards' プロパティは削除
>;
// --- ↑↑↑ DeckApiResponse 型修正ここまで ↑↑↑ ---

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
import type { AppError } from '../lib/errors'; // AppError をインポート

export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

export * from './api.types';

// Add exports from other type files here as needed
// export * from './another.types';
```

## File: middleware.ts
```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createMiddlewareClient } from '@/lib/supabase';

const locales = ['en', 'ja'];
const defaultLocale = 'en'; // Needs to be uncommented

const intlMiddleware = createIntlMiddleware({
  locales: locales,
  defaultLocale: defaultLocale,
  localePrefix: 'as-needed'
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
  if (intlResponse.headers.get('location') || intlResponse.headers.get('x-middleware-rewrite')) {
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
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)', // Added 'api|' to exclude API routes
  ]
};
```

## File: app/globals.css
```css
/* src/app/globals.css (テスト用 - @tailwind 以外をコメントアウト) */
@tailwind base;
@tailwind components;
@tailwind utilities;

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
import { Providers } from "@/components/providers"; // Assuming '@/' alias is configured or use relative path

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## File: app/page.tsx
```typescript
import Image from "next/image";

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
            Get started by editing{" "}
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
