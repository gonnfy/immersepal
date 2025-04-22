import prisma from '@/lib/db'; // Use the same prisma instance as other services
import { Card } from '@prisma/client'; // Import Card type directly again
import { AppError, NotFoundError, PermissionError, DatabaseError } from '@/lib/errors'; // Import custom errors
import type { Result } from '@/types'; // Import Result type
import type { CardUpdatePayload } from '@/lib/zod'; // Import Zod payload type

// Define options and result types for pagination
interface GetCardsByDeckIdOptions {
  limit?: number;
  offset?: number;
}

type GetCardsByDeckIdResult = {
  data: Card[]; // Use direct Card type
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
  options: GetCardsByDeckIdOptions = {}
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
      select: { // Only select userId to check ownership, avoid fetching full deck
        userId: true,
      }
    });

    if (!deck) {
      throw new NotFoundError(`Deck with ID ${deckId} not found.`);
    }
    if (deck.userId !== userId) {
        throw new PermissionError(`User does not have permission to access deck with ID ${deckId}.`);
    }

    // 2. Fetch cards and count total items in parallel if ownership is confirmed
    const [cards, totalItems] = await prisma.$transaction([
      prisma.card.findMany({
        where: { deckId: deckId }, // Only fetch cards for this deck
        orderBy: { createdAt: 'asc' }, // Or your desired order
        skip: validatedOffset, // Use validated offset for skipping
        take: validatedLimit, // Use validated limit for taking
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
    console.error(`Database error fetching cards for deck ${deckId} by user ${userId}:`, error);
    throw new DatabaseError('Failed to fetch cards due to a database error.', error instanceof Error ? error : undefined);
  }
};

/**
 * Creates a new card for a specific deck, ensuring user ownership.
 * @param userId - The ID of the user creating the card.
 * @param data - Object containing deckId, front text, and back text.
 * @returns A promise that resolves to the newly created card.
 * @throws {NotFoundError} If the deck is not found.
 * @throws {PermissionError} If the user does not own the deck.
 * @throws {DatabaseError} If any other database error occurs.
 */
export const createCard = async (userId: string, data: { deckId: string; front: string; back: string }): Promise<Card> => {
  const { deckId, front, back } = data;
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
      throw new PermissionError(`User does not have permission to add cards to deck with ID ${deckId}.`);
    }

    // 2. Create the card if ownership is confirmed
    const newCard = await prisma.card.create({
      data: {
        front,
        back,
        deckId,
        // Add other default fields if necessary, e.g., initial ease factor, interval
      },
    });
    return newCard;
  } catch (error) {
    // Re-throw known application errors
    if (error instanceof NotFoundError || error instanceof PermissionError) {
      throw error;
    }
    // Handle other potential errors
    console.error(`Database error creating card in deck ${deckId} by user ${userId}:`, error);
    throw new DatabaseError('Failed to create card due to a database error.', error instanceof Error ? error : undefined);
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
export const deleteCard = async (userId: string, deckId: string, cardId: string): Promise<void> => {
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
    if (typeof error === 'object' && error !== null && 'code' in error) {
        isPrismaNotFoundError = (error as { code?: unknown }).code === 'P2025';
    }

    if (isPrismaNotFoundError || error instanceof NotFoundError) {
        // P2025 can mean either the card doesn't exist OR the deck/user condition failed.
        // We treat both as a NotFound or Permission issue from the client's perspective.
        // A more specific check could be done by querying the card first, then the deck,
        // but findFirstOrThrow is more concise for this combined check.
      throw new NotFoundError(`Card with ID ${cardId} not found or user does not have permission.`);
    }
    // Re-throw known application errors (though findFirstOrThrow handles NotFound implicitly)
    if (error instanceof PermissionError) { // Keep this in case other permission logic is added
      throw error;
    }
    // Handle other potential database errors
    console.error(`Database error deleting card ${cardId} from deck ${deckId} by user ${userId}:`, error);
    throw new DatabaseError('Failed to delete card due to a database error.', error instanceof Error ? error : undefined);
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
  data: CardUpdatePayload // Use Zod payload type
): Promise<Result<Card, AppError>> => { // Return Result type with direct Card

  // 1. Verify card existence and ownership via the deck using findFirst
  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
      deck: {
        id: deckId,
        userId: userId,
      },
    },
    select: { id: true } // Only need to confirm existence and ownership
  });

  if (!card) {
    // Card not found or user doesn't have permission for this deck/card
    return {
      ok: false,
      error: new NotFoundError(`Card with ID ${cardId} not found or user does not have permission for deck ${deckId}.`)
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
    console.error(`Database error updating card ${cardId} in deck ${deckId} by user ${userId}:`, error);
    // Return a DatabaseError Result
    return {
      ok: false,
      error: new DatabaseError('Failed to update card due to a database error.', error instanceof Error ? error : undefined)
    };
  }
};