// src/services/card.service.ts (全ての修正を反映した完全版)

import prisma from '@/lib/db';
import { Card, AiContentType, AICardContent, Prisma } from "@prisma/client"; // Prisma 名前空間を追加
import {
  AppError,
  NotFoundError,
  PermissionError,
  DatabaseError,
  ConflictError, // ConflictError をインポート
} from "@/lib/errors";
// generateExplanation/Translation は Result を返す版をインポート
import { generateExplanation, generateTranslation } from "@/services/ai.service";
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
}

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

    if (!deck) { throw new NotFoundError(`Deck with ID ${deckId} not found.`); }
    if (deck.userId !== userId) { throw new PermissionError(`User does not have permission to access deck with ID ${deckId}.`); }

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

  } catch (error: unknown) { // ★ catch (error: unknown) ★
    if (error instanceof NotFoundError || error instanceof PermissionError) {
      throw error; // Re-throw known AppErrors
    }
    // --- ↓↓↓ Explicit type guard ↓↓↓ ---
    console.error(`Database error fetching cards for deck ${deckId} by user ${userId}:`, error);
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    // --- ↑↑↑ Type guard end ↑↑↑ ---
    throw new DatabaseError("Failed to fetch cards due to a database error.", originalError); // Pass potentially narrowed error
  }
};


export const createCard = async (
  userId: string,
  data: { deckId: string; front: string; back: string },
): Promise<Card> => { // Returns the created Card object
  const { deckId, front, back } = data;
  let newCard: Card;

  // --- 1 & 2: Verify deck and create card (errors thrown) ---
  try {
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
      select: { userId: true },
    });
    if (!deck) { throw new NotFoundError(`Deck with ID ${deckId} not found.`); }
    if (deck.userId !== userId) { throw new PermissionError(`User does not have permission to add cards to deck ${deckId}.`); }

    newCard = await prisma.card.create({
      data: { front, back, deckId },
    });
  } catch (error: unknown) { // ★ catch (error: unknown) ★
    if (error instanceof NotFoundError || error instanceof PermissionError) {
      throw error; // Re-throw known AppErrors
    }
    // --- ↓↓↓ Explicit type guard ↓↓↓ ---
    console.error(`Database error during initial card creation for deck ${deckId} by user ${userId}:`, error);
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    // --- ↑↑↑ Type guard end ↑↑↑ ---
    throw new DatabaseError('Failed to create card due to a database error.', originalError); // Pass potentially narrowed error
  }

  // --- 3. AI Explanation Generation & Save (Result pattern handling) ---
  const explanationLanguage = 'en'; // TODO: Dynamic
  console.log(`[Card Service] Attempting to generate explanation for card ${newCard.id}, lang: ${explanationLanguage}`);
  const explanationResult = await generateExplanation(front, explanationLanguage); // Returns Result

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
      console.log(`[Card Service] Explanation (${explanationLanguage}) saved for card ${newCard.id}.`);
    } catch (dbError: unknown) { // ★ catch (dbError: unknown) ★
       // P2002: Unique constraint failed (content already exists)
       if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2002') {
         console.warn(`[Card Service] Explanation (${explanationLanguage}) likely already exists for card ${newCard.id}.`);
         // Don't throw, just log the warning in this case for createCard
       } else {
         // Log other DB errors during AICardContent creation
         console.error(`[Card Service] Failed to save explanation for card ${newCard.id}. DB Error:`, dbError);
       }
    }
  } else {
    // Log AI generation failure
    console.error(`[Card Service] Failed to generate explanation for card ${newCard.id}. Error:`, explanationResult.error.message, explanationResult.error.details ?? '');
  }

  // --- 4. AI Translation Generation & Save (Result pattern handling) ---
  const sourceLanguage = 'en'; // TODO: Dynamic
  const targetLanguage = 'ja'; // TODO: Dynamic
  console.log(`[Card Service] Attempting to generate translation for card ${newCard.id}, ${sourceLanguage} -> ${targetLanguage}`);
  const translationResult = await generateTranslation(front, sourceLanguage, targetLanguage); // Returns Result

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
      console.log(`[Card Service] Translation (${targetLanguage}) saved for card ${newCard.id}.`);
    } catch (dbError: unknown) { // ★ catch (dbError: unknown) ★
       if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2002') {
         console.warn(`[Card Service] Translation (${targetLanguage}) likely already exists for card ${newCard.id}.`);
       } else {
         console.error(`[Card Service] Failed to save translation for card ${newCard.id}. DB Error:`, dbError);
       }
    }
  } else {
    // Log AI generation failure
    console.error(`[Card Service] Failed to generate translation for card ${newCard.id}. Error:`, translationResult.error.message, translationResult.error.details ?? '');
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
  } catch (error: unknown) { // ★ catch (error: unknown) ★
    let isPrismaNotFoundError = false;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        isPrismaNotFoundError = true; // findFirstOrThrow throws P2025 if not found
    }
    if (isPrismaNotFoundError || error instanceof NotFoundError) {
      throw new NotFoundError(`Card with ID ${cardId} not found or user does not have permission.`);
    }
    if (error instanceof PermissionError) { throw error; } // Should not happen if check above works, but keep for safety

    // --- ↓↓↓ Explicit type guard ↓↓↓ ---
    console.error(`Database error deleting card ${cardId} from deck ${deckId} by user ${userId}:`, error);
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    // --- ↑↑↑ Type guard end ↑↑↑ ---
    throw new DatabaseError("Failed to delete card due to a database error.", originalError);
  }
};


export const updateCard = async (
  userId: string,
  deckId: string,
  cardId: string,
  data: CardUpdatePayload,
): Promise<Result<Card, AppError>> => { // Returns Result
  try {
    // 1. Verify ownership via deck using findFirst
    const card = await prisma.card.findFirst({
      where: { id: cardId, deck: { id: deckId, userId: userId } },
      select: { id: true },
    });
    if (!card) {
      return { ok: false, error: new NotFoundError(`Card ${cardId} not found or permission denied for deck ${deckId}.`) };
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

  } catch (error: unknown) { // ★ catch (error: unknown) ★
    // --- ↓↓↓ Explicit type guard ↓↓↓ ---
    console.error(`Database error updating card ${cardId} in deck ${deckId} by user ${userId}:`, error);
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    // --- ↑↑↑ Type guard end ↑↑↑ ---
    return { ok: false, error: new DatabaseError("Failed to update card.", originalError) }; // Return error Result
  }
};


// New function added previously, includes correct catch block
export const saveAiContent = async (
  userId: string,
  cardId: string,
  data: AiContentCreateData
): Promise<Result<AICardContent, AppError>> => {
  const { contentType, language, content } = data;
  console.log(`[Card Service] Attempting to save AI content for card ${cardId}: Type=${contentType}, Lang=${language}`);
  try {
    // 1. Verify card existence and user ownership via the deck
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { deck: { select: { userId: true } } }
    });
    if (!card) { return { ok: false, error: new NotFoundError(`Card with ID ${cardId} not found.`) }; }
    if (!card.deck || card.deck.userId !== userId) { return { ok: false, error: new PermissionError(`User does not have permission to modify card ${cardId}.`) }; }

    // 2. Create the AICardContent entry
    const newAiContent = await prisma.aICardContent.create({
      data: { cardId: cardId, contentType: contentType, language: language, content: content }
    });
    console.log(`[Card Service] Successfully saved AI content ${newAiContent.id} for card ${cardId}.`);
    return { ok: true, value: newAiContent };

  } catch (error: unknown) { // ★ Correct catch block already here ★
    console.error(`[Card Service] Database error saving AI content for card ${cardId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      console.warn(`[Card Service] AI content (${contentType}/${language}) likely already exists for card ${cardId}.`);
      return { ok: false, error: new ConflictError(`AI content (${contentType}/${language}) already exists.`) };
    }
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) { originalError = error; }
    return { ok: false, error: new DatabaseError('Failed to save AI content.', originalError) };
  }
}; // End of saveAiContent