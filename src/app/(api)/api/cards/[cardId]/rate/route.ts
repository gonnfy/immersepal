import { NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth";
import { rateCard } from "@/services/card.service";
import { handleApiError, ValidationError } from "@/lib/errors";
import { cardRatingSchema } from "@/lib/zod";

interface Context {
  params: {
    cardId: string;
  };
}

export async function POST(request: Request, context: Context) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = await context.params;
    const body = await request.json();
    const validation = cardRatingSchema.safeParse(body);

    if (!validation.success) {
      throw new ValidationError(
        "Invalid rating data.",
        validation.error.flatten(),
      );
    }

    const { rating } = validation.data;

    const reviewResult = await rateCard(userId, cardId, rating);

    if (!reviewResult.ok) {
      return handleApiError(reviewResult.error);
    }

    return NextResponse.json(reviewResult.value);
  } catch (error) {
    return handleApiError(error);
  }
}
