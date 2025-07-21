// src/types/api.types.ts (AICardContent 導入 + DeckApiResponse 修正版)

// Prisma Client から必要な型をインポート
import {
  type Deck as PrismaDeck,
  type Card as PrismaCard,
  type AICardContent as PrismaAICardContent,
  type AiContentType,
} from "../../node_modules/.prisma/client";

// Zod から Payload 型をインポート
import {
  type DeckCreatePayload as DeckCreatePayloadFromZod,
  type DeckUpdatePayload as DeckUpdatePayloadFromZod,
} from "../lib/zod";

/**
 * Payload for creating a new deck (POST /api/decks).
 */
export type DeckCreatePayload = DeckCreatePayloadFromZod;

/**
 * Payload for updating an existing deck (PUT /api/decks/{deckId}).
 */
export type DeckUpdatePayload = DeckUpdatePayloadFromZod;

/**
 * Structure of an AI-generated content object returned within a Card object by the API.
 * Represents a piece of content like an explanation or translation for a specific language.
 */
export type AICardContentApiResponse = Pick<
  PrismaAICardContent,
  "id" | "contentType" | "language" | "content" | "createdAt" | "updatedAt"
>;

/**
 * Structure of a card object returned by the API.
 * Includes associated AI-generated content in the `aiContents` array.
 */
export type CardApiResponse = Pick<
  PrismaCard,
  | "id"
  | "front"
  | "back"
  | "deckId"
  | "createdAt"
  | "updatedAt"
  | "interval"
  | "easeFactor"
  | "nextReviewAt"
> & {
  aiContents: AICardContentApiResponse[];
};

/**
 * Structure of a deck object returned by the API (e.g., GET /api/decks/{deckId}).
 * Contains only core deck information, excluding the list of cards.
 * The list of cards for a deck should be fetched via the dedicated cards endpoint.
 */
export type DeckApiResponse = Pick<
  PrismaDeck,
  "id" | "name" | "description" | "createdAt" | "updatedAt" | "userId"
> & {
  cardCount?: number; // Add this optional property
};

/**
 * Standard error response structure for API errors.
 */
export type ApiErrorResponse = {
  error: string;
  message: string;
  details?: unknown;
};

/**
 * Structure for pagination metadata returned by the API.
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

/**
 * Structure for the paginated response for decks. Contains core deck info only.
 */
export interface PaginatedDecksResponse {
  data: DeckApiResponse[];
  pagination: PaginationMeta;
}

/**
 * Structure for the paginated response for cards. Contains Card objects with their associated aiContents.
 */
export interface PaginatedCardsResponse {
  data: CardApiResponse[];
  pagination: PaginationMeta;
}

export type { AiContentType };
