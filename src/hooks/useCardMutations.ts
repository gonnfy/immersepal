import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppError, ERROR_CODES } from "@/lib/errors";
import { type CardUpdatePayload } from "@/lib/zod";
import { type CardRatingPayload } from "@/lib/zod";

export interface Card {
  id: string;
  front: string;
  back: string;
  deckId: string;
  interval: number;
  easeFactor: number;
  nextReviewAt: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  explanation?: string | null;
  translation?: string | null;
}

type CreateCardData = {
  front: string;
  back: string;
};

type CreateCardContext = {
  deckId: string;
};

const createCardApi = async (
  { deckId }: CreateCardContext,
  newData: CreateCardData,
): Promise<Card> => {
  const apiUrl = `/api/decks/${deckId}/cards`;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new AppError(
      errorData.message || "Failed to create card",
      response.status,
      errorData.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      errorData.details,
    );
  }
  return response.json();
};

export const useCreateCard = (
  deckId: string,
  options?: {
    onSuccess?: (data: Card) => void;
    onError?: (error: AppError) => void;
  },
) => {
  const queryClient = useQueryClient();
  return useMutation<Card, AppError, CreateCardData>({
    mutationFn: (newData) => createCardApi({ deckId }, newData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cards", deckId] });
      console.log("Card created successfully:", data);
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error("Error creating card:", error);
      options?.onError?.(error);
    },
  });
};

const deleteCardApi = async (deckId: string, cardId: string): Promise<void> => {
  const apiUrl = `/api/decks/${deckId}/cards/${cardId}`; // locale-independent
  const response = await fetch(apiUrl, { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    let errorData = {
      message: "Failed to delete card",
      errorCode: "API_ERROR",
      details: null,
    };
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        errorData = await response.json();
      }
    } catch (_e) {
      console.warn(
        "Could not parse error response body for DELETE card request.",
      );
    }
    throw new AppError(
      errorData.message || "Failed to delete card",
      response.status,
      ERROR_CODES[errorData.errorCode as keyof typeof ERROR_CODES] ||
        ERROR_CODES.INTERNAL_SERVER_ERROR,
      errorData.details,
    );
  }
};

export const useDeleteCard = (
  deckId: string,
  options?: {
    onSuccess?: (cardId: string) => void;
    onError?: (error: AppError, cardId: string) => void;
  },
) => {
  const queryClient = useQueryClient();
  return useMutation<void, AppError, { cardId: string }>({
    mutationFn: ({ cardId }) => deleteCardApi(deckId, cardId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cards", deckId] });
      console.log(
        `Card ${variables.cardId} deleted successfully from deck ${deckId}`,
      );
      options?.onSuccess?.(variables.cardId);
    },
    onError: (error, variables) => {
      console.error(`Error deleting card ${variables.cardId}:`, error);
      options?.onError?.(error, variables.cardId);
    },
  });
};

const updateCardApi = async (
  deckId: string,
  cardId: string,
  updateData: CardUpdatePayload,
): Promise<Card> => {
  const apiUrl = `/api/decks/${deckId}/cards/${cardId}`; // locale-independent
  console.log(`[updateCardApi] Calling PUT ${apiUrl}`);
  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData),
  });
  if (!response.ok) {
    let errorData = {
      message: `Failed to update card (Status: ${response.status})`,
      errorCode: "API_ERROR",
      details: null,
    };
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        errorData = await response.json();
      }
    } catch (e) {
      console.warn("[updateCardApi] Could not parse error response body:", e);
    }
    throw new AppError(
      errorData.message,
      response.status,
      ERROR_CODES[errorData.errorCode as keyof typeof ERROR_CODES] ||
        ERROR_CODES.INTERNAL_SERVER_ERROR,
      errorData.details,
    );
  }
  return response.json();
};

export const useUpdateCard = (
  deckId: string,
  options?: {
    onSuccess?: (
      updatedCard: Card,
      variables: { cardId: string; data: CardUpdatePayload },
    ) => void;
    onError?: (
      error: AppError,
      variables: { cardId: string; data: CardUpdatePayload },
    ) => void;
  },
) => {
  const queryClient = useQueryClient();
  return useMutation<
    Card,
    AppError,
    { cardId: string; data: CardUpdatePayload }
  >({
    mutationFn: ({ cardId, data }) => updateCardApi(deckId, cardId, data),
    onSuccess: (updatedCard, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cards", deckId] });
      console.log(
        `Card ${variables.cardId} updated successfully:`,
        updatedCard,
      );
      options?.onSuccess?.(updatedCard, variables);
    },
    onError: (error, variables) => {
      console.error(`Error updating card ${variables.cardId}:`, error);
      options?.onError?.(error, variables);
    },
  });
};

const rateCardApi = async (
  cardId: string,
  payload: CardRatingPayload,
): Promise<Card> => {
  const response = await fetch(`/api/cards/${cardId}/rate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new AppError(
      errorData.message || "Failed to submit rate.",
      response.status,
      errorData.errorCode,
    );
  }
  return response.json();
};

export const useRateCard = (deckId: string) => {
  const queryClient = useQueryClient();
  return useMutation<
    Card,
    AppError,
    { cardId: string; rating: CardRatingPayload["rating"] }
  >({
    mutationFn: ({ cardId, rating }) => rateCardApi(cardId, { rating }),
    onSuccess: (updatedCard) => {
      // ["cards", deckId] で始まるすべての関連クエリを無効化します。
      // これにより、forAcquisition: true と forAcquisition: false の両方のキャッシュがクリアされます。
      queryClient.invalidateQueries({ queryKey: ["cards", deckId] });
      console.log(`Card ${updatedCard.id} rated successfully.`);
    },
    onError: (error) => {
      console.error("Error submitting card rate:", error);
    },
  });
};
