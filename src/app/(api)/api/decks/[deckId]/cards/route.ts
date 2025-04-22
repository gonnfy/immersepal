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
    const { deckId } = context.params;

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
    const { deckId } = context.params;

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