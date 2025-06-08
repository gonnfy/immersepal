// src/types/api.types.ts (AICardContent 導入 + DeckApiResponse 修正版)

// ↓↓↓ Prisma Client から必要な型や Enum を直接インポート ↓↓↓
// Import Prisma generated types using relative path
// Revert to named imports using relative path after confirming types exist in index.d.ts
import {
  type Deck as PrismaDeck,
  type Card as PrismaCard,
  type AICardContent as PrismaAICardContent,
  type AiContentType,
} from '../../node_modules/.prisma/client';

// Zod から Payload 型をインポート (変更なし)
// Corrected import path from 'lib/zod' to '../lib/zod'
import {
  type DeckCreatePayload as DeckCreatePayloadFromZod,
  type DeckUpdatePayload as DeckUpdatePayloadFromZod,
} from '../lib/zod';

/**
 * Payload for creating a new deck (POST /api/decks).
 */
export type DeckCreatePayload = DeckCreatePayloadFromZod;

/**
 * Payload for updating an existing deck (PUT /api/decks/{deckId}).
 */
export type DeckUpdatePayload = DeckUpdatePayloadFromZod;

// --- ↓↓↓ 新しい型定義: AICardContent の API レスポンス ↓↓↓ ---
/**
 * Structure of an AI-generated content object returned within a Card object by the API.
 * Represents a piece of content like an explanation or translation for a specific language.
 */
export type AICardContentApiResponse = Pick<
  PrismaAICardContent, // Use alias
  'id' | 'contentType' | 'language' | 'content' | 'createdAt' | 'updatedAt'
  // cardId は CardApiResponse にネストされるため通常は含めない
>;
// --- ↑↑↑ 新しい型定義ここまで ↑↑↑ ---

// --- ↓↓↓ CardApiResponse 型を修正 ↓↓↓ ---
/**
 * Structure of a card object returned by the API.
 * Includes associated AI-generated content in the `aiContents` array.
 * Excludes fields like `explanation`, `translation` which are now managed within `aiContents`.
 */
export type CardApiResponse = Pick<
  PrismaCard, // Use alias
  // Card の基本フィールドを選択
  | 'id'
  | 'front'
  | 'back'
  | 'deckId'
  | 'createdAt'
  | 'updatedAt'
  | 'interval'
  | 'easeFactor'
  | 'nextReviewAt'

  // explanation, translation は削除された
> & {
  // aiContents 配列を追加
  aiContents: AICardContentApiResponse[];
};
// --- ↑↑↑ CardApiResponse 型修正ここまで ↑↑↑ ---

// --- ↓↓↓ DeckApiResponse 型を修正 (cards 配列を削除) ↓↓↓ ---
/**
 * Structure of a deck object returned by the API (e.g., GET /api/decks/{deckId}).
 * Contains only core deck information, excluding the list of cards.
 * The list of cards for a deck should be fetched via the dedicated cards endpoint.
 */
export type DeckApiResponse = Pick<
  PrismaDeck,
  'id' | 'name' | 'description' | 'createdAt' | 'updatedAt' | 'userId'
> & {
  cardCount?: number; // ★ Add this optional property ★
};
/**
 * Standard error response structure for API errors. (変更なし)
 */
export type ApiErrorResponse = {
  error: string; // Consider using a stricter type based on ERROR_CODES
  message: string;
  details?: unknown;
};

/**
 * Structure for pagination metadata returned by the API. (変更なし)
 */
export interface PaginationMeta {
  offset: number;
  limit: number;
  totalItems: number;
  _links: {
    self: string;
    next: string | null;
    previous: string | null;
  };
}

// --- PaginatedDecksResponse (変更なし、ただし data の型は修正後の DeckApiResponse に依存) ---
/**
 * Structure for the paginated response for decks. Contains core deck info only.
 */
export interface PaginatedDecksResponse {
  data: DeckApiResponse[]; // cards を含まない DeckApiResponse の配列
  pagination: PaginationMeta;
}

// --- PaginatedCardsResponse (data の型が更新された CardApiResponse を参照) ---
/**
 * Structure for the paginated response for cards. Contains Card objects with their associated aiContents.
 */
export interface PaginatedCardsResponse {
  data: CardApiResponse[]; // aiContents を含む CardApiResponse の配列
  pagination: PaginationMeta;
}

export type { AiContentType }; // ← この行を追加
