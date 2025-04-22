import { type Deck as PrismaDeck, type Card as PrismaCard } from '@prisma/client'; // Corrected import path
import { type DeckCreatePayload as DeckCreatePayloadFromZod } from '@/lib/zod'; // Assuming '@/lib/zod' is the correct alias or relative path

/**
 * Payload for creating a new deck (POST /api/decks).
 * Re-exported from the Zod schema definition.
 */
export type DeckCreatePayload = DeckCreatePayloadFromZod;

/**
 * Structure of a deck object returned by the API (GET /api/decks, POST /api/decks success).
 * Based on Prisma's Deck model, but only includes fields exposed via the API.
 */
/**
 * Structure of a card object returned within the Deck detail API response.
 */
export type CardApiResponse = Pick<
  PrismaCard,
  'id' | 'front' | 'back' | 'createdAt' | 'updatedAt'
  // Exclude 'deckId' or other internal fields if necessary
>;


export type DeckApiResponse = Pick<
  PrismaDeck,
  'id' | 'name' | 'description' | 'createdAt' | 'updatedAt'
  // Exclude 'userId' or other internal fields
> & {
  cards: CardApiResponse[]; // Include the array of cards
};

/**
 * Standard error response structure for API errors.
 */
export type ApiErrorResponse = {
  /** A machine-readable error code (e.g., 'VALIDATION_ERROR', 'RESOURCE_NOT_FOUND'). */
  error: string;
  /** A user-friendly message describing the error. */
  message: string;
  /** Optional additional details about the error (e.g., validation failures). */
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
 * Structure for the paginated response for decks.
 */
export interface PaginatedDecksResponse {
  data: DeckApiResponse[];
  pagination: PaginationMeta;
}