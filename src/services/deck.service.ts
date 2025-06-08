// src/services/deck.service.ts (認証・認可対応版)

import prisma from '@/lib/db';
import { Prisma } from '@prisma/client'; // Prisma 名前空間もインポート
import { type Result } from '@/types';
import {
  AppError,
  DatabaseError,
  NotFoundError,
  ConflictError, // createDeck で使う可能性
} from '@/lib/errors';
// ↓↓↓ api.types.ts から型をインポート ↓↓↓
import {
  type DeckCreatePayload,
  type DeckUpdatePayload,
  type DeckApiResponse,
  type PaginatedDecksResponse,
} from '@/types/api.types';

// --- Pagination Type ---
interface GetDecksOptions {
  limit?: number;
  offset?: number;
}

/**
 * Fetches a paginated list of decks belonging to a specific user.
 */
export const getDecks = async (
  userId: string, // ★ userId を引数に追加 ★
  options: GetDecksOptions = {}
): Promise<PaginatedDecksResponse> => {
  const limit = options.limit ?? 10;
  const offset = options.offset ?? 0;
  const validatedLimit = Math.max(1, limit);
  const validatedOffset = Math.max(0, offset);

  console.log(
    `[Deck Service] Fetching decks for user ${userId}, offset ${validatedOffset}, limit ${validatedLimit}`
  );

  try {
    const [decks, totalItems] = await prisma.$transaction([
      prisma.deck.findMany({
        where: {
          userId: userId, // ★ userId でフィルタリング ★
        },
        orderBy: { createdAt: 'desc' },
        skip: validatedOffset,
        take: validatedLimit,
        select: {
          // DeckApiResponse に必要なフィールド + カード数
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          _count: { select: { cards: true } }, // カード数を取得
        },
      }),
      prisma.deck.count({
        where: {
          userId: userId, // ★ userId でフィルタリング ★
        },
      }),
    ]);

    // DeckApiResponse に整形
    const decksResponse: DeckApiResponse[] = decks.map((deck) => ({
      ...deck,
      cardCount: deck._count?.cards ?? 0, // cardCount を追加
    }));

    // API層でリンクを生成することを想定し、ここでは基本的な情報を返す
    return {
      data: decksResponse,
      pagination: {
        offset: validatedOffset,
        limit: validatedLimit,
        totalItems: totalItems,
        _links: { self: '', next: null, previous: null }, // Placeholder
      },
    };
  } catch (error: unknown) {
    // ★ catch (error: unknown) ★
    console.error(
      `[Deck Service] Database error fetching decks for user ${userId}:`,
      error
    );
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    // getDecks では NotFound や Permission は通常発生しないので DatabaseError を throw
    throw new DatabaseError('Failed to fetch decks.', originalError);
  }
};

/**
 * Fetches a single deck by ID, ensuring it belongs to the specified user.
 */
export const getDeckById = async (
  userId: string, // ★ userId を引数に追加 ★
  deckId: string
): Promise<DeckApiResponse> => {
  // 成功時は DeckApiResponse、失敗時はエラーを throw
  console.log(`[Deck Service] Fetching deck ${deckId} for user ${userId}`);
  try {
    // findUniqueOrThrow で存在確認と所有権確認を同時に行う
    const deck = await prisma.deck.findUniqueOrThrow({
      where: {
        id: deckId,
        userId: userId, // ★ userId も条件に含める ★
      },
      select: {
        // DeckApiResponse に必要なフィールド + カード数
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
      cardCount: deck._count?.cards ?? 0, // cardCount を追加
    };
  } catch (error: unknown) {
    // ★ catch (error: unknown) ★
    // P2025: Record not found (ID間違い or 権限なし)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      console.warn(
        `[Deck Service] Deck ${deckId} not found or permission denied for user ${userId}.`
      );
      throw new NotFoundError(
        `Deck with ID ${deckId} not found or access denied.`
      ); // NotFound として扱う
    }
    // その他のDBエラー
    console.error(
      `[Deck Service] Database error fetching deck ${deckId} for user ${userId}:`,
      error
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
  data: DeckCreatePayload
): Promise<DeckApiResponse> => {
  // 戻り値を DeckApiResponse に
  console.log(
    `[Deck Service] Creating deck for user ${userId} with name "${data.name}"`
  );
  try {
    const newDeck = await prisma.deck.create({
      data: { ...data, userId }, // userId を含めて作成
      select: {
        // DeckApiResponse に必要なフィールド + カード数
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
      cardCount: newDeck._count?.cards ?? 0, // cardCount を追加
    };
  } catch (error: unknown) {
    // ★ catch (error: unknown) ★
    // P2002: Unique constraint violation (userId, name の組み合わせ)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      console.warn(
        `[Deck Service] Deck with name "${data.name}" likely already exists for user ${userId}.`
      );
      // ConflictError を throw (API 層の handleApiError が 409 を返すように)
      throw new ConflictError(
        `A deck with the name "${data.name}" already exists.`
      );
    }
    // その他のDBエラー
    console.error(
      `[Deck Service] Database error creating deck for user ${userId}:`,
      error
    );
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    throw new DatabaseError('Failed to create deck.', originalError);
  }
};

/**
 * Updates an existing deck, ensuring user ownership. Uses Result pattern.
 */
export const updateDeck = async (
  userId: string, // ★ userId を引数に追加 ★
  deckId: string,
  data: DeckUpdatePayload
): Promise<Result<DeckApiResponse, AppError>> => {
  // 戻り値の型を更新
  console.log(`[Deck Service] Updating deck ${deckId} for user ${userId}`);
  try {
    // update の where で id と userId を指定し、所有権も同時にチェック
    const updatedDeck = await prisma.deck.update({
      where: {
        id: deckId,
        userId: userId, // ★ 所有権チェック ★
      },
      data: data,
      select: {
        // DeckApiResponse に必要なフィールド + カード数
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
    }; // 成功 Result
  } catch (error: unknown) {
    // ★ catch (error: unknown) ★
    // P2025: Record to update not found (ID間違い or 権限なし)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      console.warn(
        `[Deck Service] Deck ${deckId} not found or permission denied for user ${userId} during update.`
      );
      return {
        ok: false,
        error: new NotFoundError(
          `Deck with ID ${deckId} not found or access denied.`
        ),
      }; // NotFound エラー Result
    }
    // P2002: Unique constraint violation (name を変更した場合)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      console.warn(
        `[Deck Service] Deck name conflict likely for user ${userId} during update.`
      );
      return {
        ok: false,
        error: new ConflictError(
          `A deck with the name "${data.name}" may already exist.`
        ),
      }; // Conflict エラー Result
    }
    // その他のDBエラー
    console.error(
      `[Deck Service] Database error updating deck ${deckId} for user ${userId}:`,
      error
    );
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    return {
      ok: false,
      error: new DatabaseError('Failed to update deck.', originalError),
    }; // DB エラー Result
  }
};

/**
 * Deletes a deck, ensuring user ownership.
 */
export const deleteDeck = async (
  userId: string, // ★ userId を引数に追加 ★
  deckId: string
): Promise<void> => {
  // 成功時は void, 失敗時はエラーを throw
  console.log(`[Deck Service] Deleting deck ${deckId} for user ${userId}`);
  try {
    // delete の where で id と userId を指定し、所有権も同時にチェック
    await prisma.deck.delete({
      where: {
        id: deckId,
        userId: userId, // ★ 所有権チェック ★
      },
    });
    console.log(`[Deck Service] Deck ${deckId} deleted successfully.`);
  } catch (error: unknown) {
    // ★ catch (error: unknown) ★
    // P2025: Record to delete not found (ID間違い or 権限なし)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      console.warn(
        `[Deck Service] Deck ${deckId} not found or permission denied for user ${userId} during delete.`
      );
      throw new NotFoundError(
        `Deck with ID ${deckId} not found or access denied.`
      ); // NotFound として throw
    }
    // その他のDBエラー
    console.error(
      `[Deck Service] Database error deleting deck ${deckId} for user ${userId}:`,
      error
    );
    let originalError: Error | undefined = undefined;
    if (error instanceof Error) {
      originalError = error;
    }
    throw new DatabaseError(`Failed to delete deck ${deckId}.`, originalError);
  }
};

// saveAiContent 関数 (これは前回追加・修正済みのはず)
// export const saveAiContent = async ( ... ): Promise<Result<AICardContent, AppError>> => { ... };
