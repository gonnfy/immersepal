// src/app/[locale]/(api)/api/decks/[deckId]/cards/route.ts (修正後の完全なコード)

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createCard, getCardsByDeckId } from '@/services/card.service';
import { handleApiError } from '@/lib/errors';
import { getServerUserId } from '@/lib/auth';

// Define the expected request body schema
const createCardSchema = z.object({
  front: z.string().min(1, 'Front text cannot be empty'),
  back: z.string().min(1, 'Back text cannot be empty'),
});

// --- POST Handler (カード作成) ---
export async function POST(
  request: Request,
  // ★★★ 引数の受け取り方を修正 (context を使用) ★★★
  context: { params: { deckId: string } } // Removed locale
) {
  try {
    // ★★★ context.params を await してから deckId を取得 ★★★
    const { deckId } = await context.params;
    // const locale = context.params.locale; // locale が必要なら同様に取得

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
    // ★★★ userId を createCard に渡すように修正 (card.service.ts 側も修正が必要な場合あり) ★★★
    const newCard = await createCard(userId, { deckId, front, back }); // userId を渡す

    return NextResponse.json(newCard, { status: 201 });
  } catch (error) {
     // Use your centralized error handler
    return handleApiError(error);
  }
}

// --- GET Handler (カード一覧取得) ---
export async function GET(
  request: Request,
  // ★★★ 引数の受け取り方を修正 (context を使用) ★★★
  context: { params: { deckId: string } } // Removed locale
) {
  try {
    // ★★★ context.params を await してから deckId を取得 ★★★
    const { deckId } = await context.params;
    // const locale = context.params.locale; // locale が必要なら同様に取得

    if (!deckId) {
      return NextResponse.json({ error: 'Deck ID is required' }, { status: 400 });
    }

    // 1. Authentication/Authorization
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 2. Call Service Function
    const cards = await getCardsByDeckId(userId, deckId);

    // 3. Success Response
    return NextResponse.json(cards, { status: 200 });

  } catch (error) {
    // 4. Error Handling
    return handleApiError(error);
  }
}