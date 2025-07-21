import prisma from "@/lib/db";
import { Card, AiContentType, AICardContent, Prisma } from "@prisma/client";
import {
  AppError,
  NotFoundError,
  PermissionError,
  DatabaseError,
  ConflictError,
} from "@/lib/errors";
import {
  generateExplanation,
  generateTranslation,
} from "@/services/ai.service";
import { type Result } from "@/types";
import type { CardUpdatePayload } from "@/lib/zod";
import {
  calculateSrsData,
  getNextReviewDate,
  AcquisitionRating,
} from "@/lib/srs";

interface GetCardsByDeckIdOptions {
  limit?: number;
  offset?: number;
  forAcquisition?: boolean;
}

type GetCardsByDeckIdResult = {
  data: (Card & { aiContents: AICardContent[] })[];
  totalItems: number;
};

type AiContentCreateData = {
  contentType: AiContentType;
  language: string;
  content: string;
};

export const getCardsByDeckId = async (
  userId: string,
  deckId: string,
  options: GetCardsByDeckIdOptions = {},
): Promise<GetCardsByDeckIdResult> => {
  const { limit = 10, offset = 0, forAcquisition = false } = options;
  const validatedLimit = Math.max(1, limit);
  const validatedOffset = Math.max(0, offset);

  const whereClause: Prisma.CardWhereInput = {
    deckId: deckId,
  };

  if (forAcquisition) {
    whereClause.nextReviewAt = {
      lte: new Date(), // "less than or equal to" now
    };
  }

  let orderBy: Prisma.CardOrderByWithRelationInput;
  if (forAcquisition) {
    orderBy = { nextReviewAt: "asc" };
  } else {
    orderBy = { createdAt: "asc" };
  }

  try {
    // 権限チェック
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

    const [cards, totalItems] = await prisma.$transaction([
      prisma.card.findMany({
        where: whereClause,
        orderBy: orderBy,
        skip: validatedOffset,
        take: validatedLimit,
        include: {
          aiContents: {
            select: {
              id: true,
              cardId: true,
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
        // 総アイテム数は常にデッキ全体のカード数をカウントするように修正
        where: { deckId: deckId },
      }),
    ]);

    return { data: cards, totalItems: totalItems };
  } catch (error: unknown) {
    if (error instanceof NotFoundError || error instanceof PermissionError) {
      throw error;
    }
    console.error(
      `Database error fetching cards for deck ${deckId} by user ${userId}:`,
      error,
    );
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    throw new DatabaseError(
      "Failed to fetch cards due to a database error.",
      originalError,
    );
  }
};

export const createCard = async (
  userId: string,
  data: { deckId: string; front: string; back: string },
): Promise<Card> => {
  const { deckId, front, back } = data;
  let newCard: Card;

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
    if (error instanceof NotFoundError || error instanceof PermissionError) {
      throw error;
    }

    console.error(
      `Database error during initial card creation for deck ${deckId} by user ${userId}:`,
      error,
    );
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    throw new DatabaseError(
      "Failed to create card due to a database error.",
      originalError,
    );
  }

  // --- 3. AI Explanation Generation & Save (Result pattern handling) ---
  const explanationLanguage = "en"; // TODO: Dynamic
  console.log(
    `[Card Service] Attempting to generate explanation for card ${newCard.id}, lang: ${explanationLanguage}`,
  );
  const explanationResult = await generateExplanation(
    front,
    explanationLanguage,
  );

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
      if (
        dbError instanceof Prisma.PrismaClientKnownRequestError &&
        dbError.code === "P2002"
      ) {
        console.warn(
          `[Card Service] Explanation (${explanationLanguage}) likely already exists for card ${newCard.id}.`,
        );
      } else {
        console.error(
          `[Card Service] Failed to save explanation for card ${newCard.id}. DB Error:`,
          dbError,
        );
      }
    }
  } else {
    console.error(
      `[Card Service] Failed to generate explanation for card ${newCard.id}. Error:`,
      explanationResult.error.message,
      explanationResult.error.details ?? "",
    );
  }

  const sourceLanguage = "en";
  const targetLanguage = "ja";
  console.log(
    `[Card Service] Attempting to generate translation for card ${newCard.id}, ${sourceLanguage} -> ${targetLanguage}`,
  );
  const translationResult = await generateTranslation(
    front,
    sourceLanguage,
    targetLanguage,
  );

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
    console.error(
      `[Card Service] Failed to generate translation for card ${newCard.id}. Error:`,
      translationResult.error.message,
      translationResult.error.details ?? "",
    );
  }

  return newCard;
};

export const deleteCard = async (
  userId: string,
  deckId: string,
  cardId: string,
): Promise<void> => {
  try {
    await prisma.card.findFirstOrThrow({
      where: { id: cardId, deck: { id: deckId, userId: userId } },
    });
    await prisma.card.delete({ where: { id: cardId } });
  } catch (error: unknown) {
    let isPrismaNotFoundError = false;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      isPrismaNotFoundError = true;
    }
    if (isPrismaNotFoundError || error instanceof NotFoundError) {
      throw new NotFoundError(
        `Card with ID ${cardId} not found or user does not have permission.`,
      );
    }
    if (error instanceof PermissionError) {
      throw error;
    }
    console.error(
      `Database error deleting card ${cardId} from deck ${deckId} by user ${userId}:`,
      error,
    );
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
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
  try {
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

    const updateData: Partial<CardUpdatePayload> = {};
    if (data.front !== undefined) updateData.front = data.front;
    if (data.back !== undefined) updateData.back = data.back;

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: updateData,
    });
    return { ok: true, value: updatedCard };
  } catch (error: unknown) {
    console.error(
      `Database error updating card ${cardId} in deck ${deckId} by user ${userId}:`,
      error,
    );
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    return {
      ok: false,
      error: new DatabaseError("Failed to update card.", originalError),
    };
  }
};

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

    const newAiContent = await prisma.aICardContent.upsert({
      where: {
        cardId_contentType_language: {
          cardId,
          contentType,
          language,
        },
      },
      update: {
        content: content,
      },
      create: {
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
};

export const rateCard = async (
  userId: string,
  cardId: string,
  rating: AcquisitionRating,
): Promise<Result<Card, AppError>> => {
  try {
    const card = await prisma.card.findFirst({
      where: { id: cardId, deck: { userId: userId } },
    });

    if (!card) {
      return {
        ok: false,
        error: new NotFoundError(
          `Card with ID ${cardId} not found or permission denied.`,
        ),
      };
    }

    const { interval, easeFactor } = calculateSrsData(
      { interval: card.interval, easeFactor: card.easeFactor },
      rating,
    );

    const nextReviewAt = getNextReviewDate(interval);

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        interval,
        easeFactor,
        nextReviewAt,
      },
    });

    await prisma.studyLog.create({
      data: {
        rating,
        previousInterval: card.interval,
        previousEaseFactor: card.easeFactor,
        newInterval: interval,
        newEaseFactor: easeFactor,
        nextReviewAt,
        userId,
        cardId,
      },
    });

    return { ok: true, value: updatedCard };
  } catch (error) {
    throw new DatabaseError(
      "Failed to update card review data.",
      error instanceof Error ? error : undefined,
    );
  }
};
