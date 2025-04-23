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