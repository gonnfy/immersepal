import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth";
import {
  handleApiError,
  ValidationError,
  AuthenticationError,
  AppError,
} from "@/lib/errors";
import { deckUpdateSchema } from "@/lib/zod";
import { getDeckById, updateDeck, deleteDeck } from "@/services/deck.service";
import {
  type DeckUpdatePayload,
  type DeckApiResponse,
} from "@/types/api.types";
import { type Result } from "@/types";
interface Context {
  params: {
    deckId: string;
  };
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      throw new AuthenticationError();
    }
    const { deckId } = await context.params;
    if (!deckId) {
      throw new ValidationError("Deck ID is missing in the URL path.");
    }
    const deck: DeckApiResponse = await getDeckById(userId, deckId);

    return NextResponse.json(deck);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      throw new AuthenticationError();
    }

    const { deckId } = await context.params;
    if (!deckId) {
      throw new ValidationError("Deck ID is missing in the URL path.");
    }

    let payload: DeckUpdatePayload;
    try {
      const rawBody: unknown = await request.json();
      const validation = deckUpdateSchema.safeParse(rawBody);
      if (!validation.success) {
        throw new ValidationError(
          "Invalid request body for updating deck.",
          validation.error.flatten(),
        );
      }
      payload = validation.data;
    } catch (e) {
      if (e instanceof ValidationError) {
        throw e;
      }
      console.error("Error parsing/validating update deck request body:", e);
      throw new ValidationError(
        "Invalid JSON body or structure for updating deck.",
      );
    }

    const updateResult: Result<DeckApiResponse, AppError> = await updateDeck(
      userId,
      deckId,
      payload,
    );

    if (!updateResult.ok) {
      return handleApiError(updateResult.error);
    }

    return NextResponse.json(updateResult.value);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      throw new AuthenticationError();
    }

    const { deckId } = await context.params;
    if (!deckId) {
      throw new ValidationError("Deck ID is missing in the URL path.");
    }

    await deleteDeck(userId, deckId);

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
