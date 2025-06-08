// src/app/(api)/api/decks/[deckId]/route.ts (Refactored for Auth)

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/auth';
import {
  handleApiError,
  ValidationError,
  AuthenticationError,
  AppError,
} from '@/lib/errors';
import { deckUpdateSchema } from '@/lib/zod'; // Zod schema for updates
import { getDeckById, updateDeck, deleteDeck } from '@/services/deck.service'; // Import Deck services
import {
  type DeckUpdatePayload,
  type DeckApiResponse,
} from '@/types/api.types'; // Import types
import { type Result } from '@/types';

// Context type for route parameters
interface Context {
  params: {
    deckId: string;
  };
}

/**
 * GET handler to fetch a specific deck by ID for the authenticated user.
 */
export async function GET(request: NextRequest, context: Context) {
  // Use NextRequest for URL access if needed, otherwise Request
  try {
    // 1. Authentication
    const userId = await getServerUserId();
    if (!userId) {
      throw new AuthenticationError();
    }

    // 2. Get deckId from URL params
    const { deckId } = await context.params; // Add await
    if (!deckId) {
      throw new ValidationError('Deck ID is missing in the URL path.');
    }

    // 3. Call Service Function (includes ownership check)
    // getDeckById now throws NotFoundError if not found or no permission
    const deck: DeckApiResponse = await getDeckById(userId, deckId);

    // 4. Return Success Response
    return NextResponse.json(deck);
  } catch (error: unknown) {
    // Handle errors from auth, param parsing, or service (NotFound, DatabaseError)
    return handleApiError(error);
  }
}

/**
 * PUT handler to update a specific deck for the authenticated user.
 */
export async function PUT(request: Request, context: Context) {
  try {
    // 1. Authentication
    const userId = await getServerUserId();
    if (!userId) {
      throw new AuthenticationError();
    }

    // 2. Get deckId from URL params
    const { deckId } = await context.params; // Add await
    if (!deckId) {
      throw new ValidationError('Deck ID is missing in the URL path.');
    }

    // 3. Parse and Validate Request Body
    let payload: DeckUpdatePayload;
    try {
      const rawBody: unknown = await request.json();
      const validation = deckUpdateSchema.safeParse(rawBody); // Use update schema
      if (!validation.success) {
        throw new ValidationError(
          'Invalid request body for updating deck.',
          validation.error.flatten()
        );
      }
      payload = validation.data;
      // Ensure at least one field is being updated (handled by Zod refine in schema definition)
    } catch (e) {
      if (e instanceof ValidationError) {
        throw e;
      }
      console.error('Error parsing/validating update deck request body:', e);
      throw new ValidationError(
        'Invalid JSON body or structure for updating deck.'
      );
    }

    // 4. Call Service Function (returns Result)
    const updateResult: Result<DeckApiResponse, AppError> = await updateDeck(
      userId,
      deckId,
      payload
    );

    // 5. Check Result
    if (!updateResult.ok) {
      // Handle errors from service (NotFound, Conflict, DatabaseError)
      return handleApiError(updateResult.error);
    }

    // 6. Return Success Response with updated deck
    return NextResponse.json(updateResult.value);
  } catch (error: unknown) {
    // Handle errors from auth, param parsing, validation, or unexpected issues
    return handleApiError(error);
  }
}

/**
 * DELETE handler to delete a specific deck for the authenticated user.
 */
export async function DELETE(request: Request, context: Context) {
  // request might not be needed but good practice
  try {
    // 1. Authentication
    const userId = await getServerUserId();
    if (!userId) {
      throw new AuthenticationError();
    }

    // 2. Get deckId from URL params
    const { deckId } = await context.params; // Add await
    if (!deckId) {
      throw new ValidationError('Deck ID is missing in the URL path.');
    }

    // 3. Call Service Function (throws on error)
    // deleteDeck now includes ownership check and throws NotFoundError or DatabaseError
    await deleteDeck(userId, deckId);

    // 4. Return Success Response (204 No Content)
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    // Handle errors from auth, param parsing, or service (NotFound, DatabaseError)
    return handleApiError(error);
  }
}
