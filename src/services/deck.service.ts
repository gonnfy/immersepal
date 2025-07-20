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
