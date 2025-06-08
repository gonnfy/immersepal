// src/app/(api)/api/decks/[deckId]/cards/[cardId]/route.ts
import { NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/auth';
import { deleteCard } from '@/services/card.service';
// isAppError, ValidationError, AppError は handleApiError 等で必要になる可能性を考慮し残置。lint で不要と出たら削除。
import { ERROR_CODES, handleApiError } from '@/lib/errors';

interface DeleteParams {
  deckId: string;
  cardId: string;
}

/**
 * Deletes a specific card (DELETE)
 */
export async function DELETE(
  request: Request, // request object is not used but required by the signature
  context: { params: DeleteParams }
) {
  try {
    // 1. Authentication: Get user ID
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json(
        {
          error: ERROR_CODES.AUTHENTICATION_FAILED,
          message: 'Authentication required.',
        },
        { status: 401 }
      );
    }

    // 2. Extract parameters
    const { deckId, cardId } = await context.params;
    if (!deckId || !cardId) {
      return NextResponse.json(
        {
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Missing deckId or cardId in URL.',
        },
        { status: 400 }
      );
    }

    // 3. Service Call: Attempt to delete the card
    await deleteCard(userId, deckId, cardId);

    // 4. Success Response: Return 204 No Content
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // 5. Error Handling: Use the centralized handler
    return handleApiError(error);
  }
}

// --- Imports for PUT ---
import { updateCard } from '@/services/card.service'; // Import the update service
import { cardUpdateSchema, CardUpdatePayload } from '@/lib/zod'; // Import the validation schema and payload type
// import type { Result } from '@/types'; // ★ Removed unused import

// --- Type for PUT context params (can reuse or define specifically) ---
interface PutParams {
  deckId: string;
  cardId: string;
}

/**
 * Updates a specific card (PUT)
 */
export async function PUT(request: Request, context: { params: PutParams }) {
  // No top-level try-catch needed when using Result pattern consistently in service

  // 1. Authentication: Get user ID
  const userId = await getServerUserId();
  if (!userId) {
    return NextResponse.json(
      {
        error: ERROR_CODES.AUTHENTICATION_FAILED,
        message: 'Authentication required.',
      },
      { status: 401 }
    );
  }

  // 2. Extract parameters
  const { deckId, cardId } = await context.params;
  if (!deckId || !cardId) {
    return NextResponse.json(
      {
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Missing deckId or cardId in URL.',
      },
      { status: 400 }
    );
  }

  // 3. Get and Parse Request Body
  let body: unknown;
  try {
    body = await request.json();
  } catch (_e) {
    // _e は使わないが、catch 節は必要 (Removed unused eslint-disable comment)
    return NextResponse.json(
      { error: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  // 4. Input Validation (Zod)
  const validation = cardUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid input data.',
        details: validation.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // Type assertion after successful validation
  const validatedData = validation.data as CardUpdatePayload;

  // 5. Service Call: Attempt to update the card using the Result pattern
  const result = await updateCard(userId, deckId, cardId, validatedData);

  // 6. Handle Result
  if (result.ok) {
    return NextResponse.json(result.value, { status: 200 });
  } else {
    return handleApiError(result.error);
  }
}
