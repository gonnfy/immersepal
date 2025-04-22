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