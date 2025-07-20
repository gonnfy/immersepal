import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth";
import {
  handleApiError,
  ValidationError,
  AuthenticationError,
} from "@/lib/errors";
import { deckCreateSchema } from "@/lib/zod";
import { getDecks, createDeck } from "@/services/deck.service";
import { type DeckCreatePayload } from "@/types/api.types";

export async function GET(request: NextRequest) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      throw new AuthenticationError();
    }

    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (isNaN(offset) || offset < 0 || isNaN(limit) || limit < 1) {
      throw new ValidationError("Invalid pagination parameters.");
    }

    const result = await getDecks(userId, { offset, limit });

    const baseUrl = request.nextUrl.pathname;
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
    return handleApiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      throw new AuthenticationError();
    }

    let payload: DeckCreatePayload;
    try {
      const rawBody: unknown = await request.json();
      const validation = deckCreateSchema.safeParse(rawBody);
      if (!validation.success) {
        throw new ValidationError(
          "Invalid request body for creating deck.",
          validation.error.flatten(),
        );
      }
      payload = validation.data;
    } catch (e) {
      if (e instanceof ValidationError) {
        throw e;
      }
      console.error("Error parsing/validating create deck request body:", e);
      throw new ValidationError(
        "Invalid JSON body or structure for creating deck.",
      );
    }

    const newDeck = await createDeck(userId, payload);

    return NextResponse.json(newDeck, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
