// src/app/[locale]/(api)/api/decks/[deckId]/cards/[cardId]/route.ts
import { NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/auth';
import { deleteCard } from '@/services/card.service';
import { ERROR_CODES, isAppError, handleApiError, ValidationError } from '@/lib/errors'; // Import handleApiError and ValidationError

interface DeleteParams {
  // locale: string; // Removed
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
      return NextResponse.json({ error: 'AUTHENTICATION_FAILED', message: 'Authentication required.' }, { status: 401 });
    }

    // 2. Extract parameters
    const { deckId, cardId } = await context.params;
    if (!deckId || !cardId) {
        // This case should ideally be handled by Next.js routing, but added for robustness
        return NextResponse.json({ error: 'INVALID_PARAMETERS', message: 'Missing deckId or cardId in URL.' }, { status: 400 });
    }


    // 3. Service Call: Attempt to delete the card
    await deleteCard(userId, deckId, cardId);

    // 4. Success Response: Return 204 No Content
    // Note: NextResponse.json(null, { status: 204 }) is also valid,
    // but an empty body is more conventional for 204.
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    // 5. Error Handling: Use the centralized handler
    return handleApiError(error);
  }
}
// --- Imports for PUT ---
import { updateCard } from '@/services/card.service'; // Import the update service
import { cardUpdateSchema, CardUpdatePayload } from '@/lib/zod'; // Import the validation schema and payload type
import type { Result } from '@/types'; // Import Result type
import type { AppError } from '@/lib/errors'; // Import AppError if needed for explicit typing

// --- Type for PUT context params (can reuse or define specifically) ---
interface PutParams {
  // locale: string; // Removed
  deckId: string;
  cardId: string;
}

/**
 * Updates a specific card (PUT)
 */
export async function PUT(
  request: Request,
  context: { params: PutParams }
) {
  // No top-level try-catch needed when using Result pattern consistently

  // 1. Authentication: Get user ID
  const userId = await getServerUserId();
  if (!userId) {
    // Return 401 directly or use handleApiError with an AuthenticationError instance
    return NextResponse.json({ error: ERROR_CODES.AUTHENTICATION_FAILED, message: 'Authentication required.' }, { status: 401 });
    // Or: return handleApiError(new AuthenticationError());
  }

  // 2. Extract parameters
  const { deckId, cardId } = await context.params;
  if (!deckId || !cardId) {
      // Return 400 for missing parameters
      return NextResponse.json({ error: ERROR_CODES.VALIDATION_ERROR, message: 'Missing deckId or cardId in URL.' }, { status: 400 });
      // Or: return handleApiError(new ValidationError('Missing deckId or cardId in URL.'));
  }

  // 3. Get and Parse Request Body
  let body: unknown;
  try {
      body = await request.json();
  } catch (e) {
      // Return 400 for invalid JSON
      return NextResponse.json({ error: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid JSON body.' }, { status: 400 });
      // Or: return handleApiError(new ValidationError('Invalid JSON body.'));
  }

  // 4. Input Validation (Zod)
  const validation = cardUpdateSchema.safeParse(body);
  if (!validation.success) {
    // Return 400 with validation details
    return NextResponse.json(
      {
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid input data.',
        details: validation.error.flatten().fieldErrors, // Provide detailed validation errors
      },
      { status: 400 }
    );
    // Or create a ValidationError with details and pass to handleApiError
    // return handleApiError(new ValidationError('Invalid input data.', validation.error.flatten().fieldErrors));
  }

  // Type assertion after successful validation
  const validatedData = validation.data as CardUpdatePayload;

  // 5. Service Call: Attempt to update the card using the Result pattern
  const result = await updateCard(userId, deckId, cardId, validatedData);

  // 6. Handle Result
  if (result.ok) {
    // Success: Return the updated card data with 200 status
    return NextResponse.json(result.value, { status: 200 });
  } else {
    // Error: Use the centralized handler with the error from the Result
    return handleApiError(result.error);
    // Or handle directly:
    // return NextResponse.json(
    //   {
    //     error: result.error.errorCode,
    //     message: result.error.message,
    //     details: result.error.details,
    //   },
    //   { status: result.error.statusCode }
    // );
  }
}