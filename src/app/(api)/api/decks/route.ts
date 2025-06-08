// Refactored src/app/(api)/api/decks/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/auth'; // Auth helper
import {
  handleApiError,
  ValidationError,
  AuthenticationError,
} from '@/lib/errors'; // Auth Error
import { deckCreateSchema } from '@/lib/zod'; // Assuming Zod schemas exist
import { getDecks, createDeck } from '@/services/deck.service'; // Import Deck services
import { type DeckCreatePayload } from '@/types/api.types'; // Import payload type

/**
 * GET handler to fetch decks for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication: Get user ID or throw error
    const userId = await getServerUserId();
    if (!userId) {
      throw new AuthenticationError(); // Throw specific error for handleApiError
    }

    // 2. Get Pagination Params from URL
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Basic validation for pagination params
    if (isNaN(offset) || offset < 0 || isNaN(limit) || limit < 1) {
      throw new ValidationError('Invalid pagination parameters.');
    }

    // 3. Call Service Function (passing userId)
    // Service function now handles filtering by userId
    const result = await getDecks(userId, { offset, limit }); // Pass userId

    // 4. Construct pagination links (example) - This ideally uses request URL
    const baseUrl = request.nextUrl.pathname; // Base path e.g., /api/decks
    result.pagination._links.self = `${baseUrl}?offset=${offset}&limit=${limit}`;
    if (offset + limit < result.pagination.totalItems) {
      result.pagination._links.next = `${baseUrl}?offset=${offset + limit}&limit=${limit}`;
    }
    if (offset > 0) {
      result.pagination._links.previous = `${baseUrl}?offset=${Math.max(0, offset - limit)}&limit=${limit}`;
    }

    // 5. Return Success Response
    return NextResponse.json(result);
  } catch (error: unknown) {
    // Handle errors from auth, validation, or service
    return handleApiError(error);
  }
}

/**
 * POST handler to create a new deck for the authenticated user.
 */
export async function POST(request: Request) {
  try {
    // 1. Authentication: Get user ID or throw error
    const userId = await getServerUserId();
    if (!userId) {
      throw new AuthenticationError();
    }

    // 2. Parse and Validate Request Body
    let payload: DeckCreatePayload;
    try {
      const rawBody: unknown = await request.json();
      const validation = deckCreateSchema.safeParse(rawBody); // Use Zod schema
      if (!validation.success) {
        throw new ValidationError(
          'Invalid request body for creating deck.',
          validation.error.flatten()
        );
      }
      payload = validation.data;
    } catch (e) {
      if (e instanceof ValidationError) {
        throw e;
      }
      console.error('Error parsing/validating create deck request body:', e);
      throw new ValidationError(
        'Invalid JSON body or structure for creating deck.'
      );
    }

    // 3. Call Service Function (passing userId and payload)
    // Service function handles adding userId to data and creation
    const newDeck = await createDeck(userId, payload); // Pass userId

    // 4. Return Success Response (201 Created)
    return NextResponse.json(newDeck, { status: 201 });
  } catch (error: unknown) {
    // Handle errors from auth, validation, service (e.g., unique constraint)
    return handleApiError(error);
  }
}
