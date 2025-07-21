import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createCard, getCardsByDeckId } from "@/services/card.service";
import {
  handleApiError,
  AppError,
  ERROR_CODES,
  ValidationError,
} from "@/lib/errors";
import { cardCreateSchema } from "@/lib/zod";
import { getServerUserId } from "@/lib/auth";

// カード作成
export async function POST(
  request: Request,
  context: { params: { deckId: string } },
) {
  try {
    const { deckId } = await context.params;

    if (!deckId) {
      return NextResponse.json(
        { error: "Deck ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validation = cardCreateSchema.safeParse(body);

    if (!validation.success) {
      throw new ValidationError(
        "Invalid request body for creating card.",
        validation.error.flatten(),
      );
    }

    const { front, back } = validation.data;

    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Call the service function to create the card, passing the userId
    const newCard = await createCard(userId, { deckId, front, back });

    return NextResponse.json(newCard, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// カード一覧取得
export async function GET(
  request: Request,
  context: { params: { deckId: string } },
) {
  try {
    const { searchParams } = new URL(request.url);

    const querySchema = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(10),
      offset: z.coerce.number().int().min(0).default(0),
      // "true" という文字列のみを true と解釈し、それ以外（"false"やnullなど）はfalseとして扱うように修正
      forAcquisition: z
        .preprocess((val) => val === "true", z.boolean())
        .default(false),
    });

    let validatedQuery: z.infer<typeof querySchema>;
    try {
      validatedQuery = querySchema.parse({
        limit: searchParams.get("limit"),
        offset: searchParams.get("offset"),
        forAcquisition: searchParams.get("forAcquisition"),
      });
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: ERROR_CODES.VALIDATION_ERROR,
            message: "Invalid query parameters for pagination.",
            details: err.flatten().fieldErrors,
          },
          { status: 400 },
        );
      }
      return handleApiError(
        new AppError(
          "Failed to parse pagination query parameters",
          400,
          ERROR_CODES.VALIDATION_ERROR,
        ),
      );
    }

    const { limit, offset, forAcquisition } = validatedQuery;

    const { deckId } = await context.params;

    if (!deckId) {
      return NextResponse.json(
        { error: "Deck ID is required" },
        { status: 400 },
      );
    }

    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Call Service Functioni
    const { data: cards, totalItems } = await getCardsByDeckId(userId, deckId, {
      limit,
      offset,
      forAcquisition,
    });

    // ページネーションレスポンス
    const baseUrl = `/api/decks/${deckId}/cards`;
    const selfLink = `${baseUrl}?offset=${offset}&limit=${limit}`;
    let nextLink: string | null = null;
    if (offset + limit < totalItems) {
      nextLink = `${baseUrl}?offset=${offset + limit}&limit=${limit}`;
    }
    let previousLink: string | null = null;
    if (offset > 0) {
      const prevOffset = Math.max(0, offset - limit);
      previousLink = `${baseUrl}?offset=${prevOffset}&limit=${limit}`;
    }

    const responseBody = {
      data: cards,
      pagination: {
        offset: offset,
        limit: limit,
        totalItems: totalItems,
        _links: {
          self: selfLink,
          next: nextLink,
          previous: previousLink,
        },
      },
    };

    return NextResponse.json(responseBody, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
