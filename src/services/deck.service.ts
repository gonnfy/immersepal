import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { Deck } from '@prisma/client'; // Import Deck type
import prisma from '@/lib/db'; // Use default export
import { ConflictError, DatabaseError, NotFoundError, PermissionError } from '@/lib/errors'; // Added NotFoundError and PermissionError
import type { DeckCreatePayload } from '@/lib/zod'; // Import type from zod schema definition

// Type definitions for pagination
interface GetAllDecksOptions {
  limit?: number;
  offset?: number;
}

type GetAllDecksResult = {
  data: Deck[];
  totalItems: number;
};

/**
 * Creates a new deck for a given user.
 * @param userId - The ID of the user creating the deck.
 * @param data - The data for the new deck (name, description).
 * @returns The created deck object.
 * @throws {ConflictError} If a deck with the same name already exists for the user.
 * @throws {DatabaseError} If any other database error occurs.
 */
export const createDeck = async (userId: string, data: DeckCreatePayload) => {
  try {
    const newDeck = await prisma.deck.create({ // Use prisma instead of db
      data: {
        userId,
        name: data.name,
        description: data.description,
      },
    });
    return newDeck;
  } catch (error) {
    // デバッグログは（問題解決が確認できるまで）残しておいても良いでしょう
    const isKnownRequestError = error instanceof PrismaClientKnownRequestError; // 参考用ログは残す

    // ★★★ 修正: instanceof に頼らず error.code で直接 P2002 を判定 ★★★
    // エラーがオブジェクトであり、かつ code プロパティが 'P2002' かどうかを確認
    // @ts-ignore
    if (error && typeof error === 'object' && error.code === 'P2002') {
       console.log('[SERVICE CATCH BLOCK] P2002 code detected. Throwing ConflictError.');
       // @ts-ignore
       throw new ConflictError(`A deck with the name "${data.name}" already exists.`);
    }

    // ★★★ P2002 でなかった場合、または上記条件を満たさないエラーの場合 ★★★
    console.error('[SERVICE CATCH BLOCK] Not P2002 or check failed. Throwing DatabaseError.');
    // console.error('Database error creating deck:', error); // より詳細なログに置き換え
    throw new DatabaseError('Failed to create the deck due to a database error.', error instanceof Error ? error : undefined);
  }
};

/**
 * Retrieves decks for a given user with pagination, ordered by creation date descending.
 * @param userId - The ID of the user whose decks to retrieve.
 * @param options - Options for pagination (limit, offset).
 * @returns A promise that resolves to an object containing the decks array and total item count.
 * @throws {DatabaseError} If a database error occurs during retrieval.
 */
export const getAllDecks = async (
  userId: string,
  options: GetAllDecksOptions = {}
): Promise<GetAllDecksResult> => {
  // Default values for pagination
  const limit = options.limit ?? 10; // Default to 10 items per page
  const offset = options.offset ?? 0; // Default to starting from the beginning

  // Basic validation for limit and offset
  const validatedLimit = Math.max(1, limit); // Ensure at least 1 item is requested
  const validatedOffset = Math.max(0, offset); // Ensure offset is not negative

  try {
    // Use $transaction to fetch data and count in parallel
    const [decks, totalItems] = await prisma.$transaction([
      prisma.deck.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' }, // Maintain existing sort order
        skip: validatedOffset,
        take: validatedLimit,
      }),
      prisma.deck.count({
        where: { userId: userId },
      }),
    ]);

    return {
      data: decks,
      totalItems: totalItems,
    };
  } catch (error) {
    console.error(`Database error retrieving decks for user ${userId} with pagination:`, error); // Updated log message
    // Throw a generic DatabaseError for any issues during retrieval
    throw new DatabaseError('Failed to retrieve decks due to a database error.', error instanceof Error ? error : undefined);
  }
};

/**
 * Deletes a deck based on the provided deck ID and user ID.
 * Ensures the user owns the deck before deletion.
 * @param userId The ID of the user attempting to delete the deck.
 * @param deckId The ID of the deck to delete.
 * @throws {NotFoundError} If the deck is not found or the user does not have permission.
 * @throws {DatabaseError} If any other database error occurs.
 */
export const deleteDeck = async (userId: string, deckId: string): Promise<void> => {
  try {
    const deleteResult = await prisma.deck.deleteMany({
      where: {
        id: deckId,
        userId: userId, // Verify ownership
      },
    });

    // If no records were deleted, the deck doesn't exist or the user doesn't own it.
    if (deleteResult.count === 0) {
      throw new NotFoundError(`Deck with ID ${deckId} not found or user does not have permission.`);
    }

    // Deletion successful, return void

  } catch (error) {
    // Re-throw NotFoundError if it was thrown intentionally above
    if (error instanceof NotFoundError) {
      throw error;
    }

    // Handle other potential errors (like Prisma errors or connection issues)
    console.error(`Database error deleting deck ${deckId} for user ${userId}:`, error);
    throw new DatabaseError('Failed to delete deck due to a database error.', error instanceof Error ? error : undefined);
  }
};

/**
 * Retrieves a specific deck by its ID for a given user.
 * Ensures the user owns the deck before returning it.
 * @param userId The ID of the user attempting to retrieve the deck.
 * @param deckId The ID of the deck to retrieve.
 * @returns A promise that resolves to the deck object.
 * @throws {NotFoundError} If the deck with the specified ID is not found.
 * @throws {PermissionError} If the user does not own the deck.
 * @throws {DatabaseError} If any other database error occurs.
 */
export const getDeckById = async (userId: string, deckId: string) => {
  try {
    const deck = await prisma.deck.findUnique({
      where: {
        id: deckId,
      },
      // REMOVED: include: { cards: true }
    });

    if (!deck) {
      throw new NotFoundError(`Deck with ID ${deckId} not found.`);
    }

    // Verify ownership
    if (deck.userId !== userId) {
      throw new PermissionError(`User does not have permission to access deck with ID ${deckId}.`);
    }

    return deck;

  } catch (error) {
    // Re-throw known application errors
    if (error instanceof NotFoundError || error instanceof PermissionError) {
      throw error;
    }

    // Handle other potential errors (like Prisma errors or connection issues)
    console.error(`Database error retrieving deck ${deckId} for user ${userId}:`, error);
    throw new DatabaseError('Failed to retrieve deck due to a database error.', error instanceof Error ? error : undefined);
  }
};