import { useQuery } from "@tanstack/react-query";
import { AppError, isAppError } from "@/lib/errors";
import {
  type PaginatedCardsResponse,
  type CardApiResponse,
  type PaginationMeta,
} from "@/types/api.types";

interface ApiErrorLike {
  message?: string;
  errorCode?: string;
  details?: unknown;
}

// --- API function to fetch paginated cards ---
const fetchPaginatedCards = async (
  deckId: string,
  offset: number,
  limit: number,
  forAcquisition: boolean,
): Promise<PaginatedCardsResponse> => {
  if (!deckId) {
    throw new Error("Deck ID is required to fetch cards.");
  }

  // Construct URL with pagination query parameters
  const params = new URLSearchParams({
    offset: offset.toString(),
    limit: limit.toString(),
    forAcquisition: forAcquisition.toString(),
  });
  const apiUrl = `/api/decks/${deckId}/cards?${params.toString()}`;
  console.log(`[useCards fetcher] Fetching cards from: ${apiUrl}`);

  const response = await fetch(apiUrl);

  if (!response.ok) {
    let errorData: ApiErrorLike = {
      message: `Failed to fetch cards for deck ${deckId}. Status: ${response.status}`,
    };
    try {
      const contentType = response.headers.get("content-type");
      if (
        response.body &&
        contentType &&
        contentType.includes("application/json")
      ) {
        errorData = await response.json();
      } else if (response.body) {
        const textResponse = await response.text();
        console.warn(
          `[useCards fetcher] Received non-JSON error response: ${textResponse.substring(0, 100)}`,
        );
        if (typeof errorData === "object" && errorData !== null) {
          errorData.message = textResponse.substring(0, 100);
        }
      }
    } catch (e) {
      console.warn(
        "[useCards fetcher] Could not parse error response body:",
        e,
      );
    }

    if (isAppError(errorData)) {
      throw new AppError(
        errorData.message,
        response.status,
        errorData.errorCode,
        errorData.details,
      );
    } else {
      const errorMessage =
        typeof errorData === "object" &&
        errorData !== null &&
        "message" in errorData &&
        typeof errorData.message === "string"
          ? errorData.message
          : `Failed to fetch cards for deck ${deckId}. Status: ${response.status}`;
      throw new Error(errorMessage);
    }
  }

  const data: PaginatedCardsResponse = await response.json();
  if (!data || !Array.isArray(data.data) || !data.pagination) {
    console.error("[useCards fetcher] Invalid response format received:", data);
    throw new Error("Invalid response format from cards API.");
  }
  return data;
};

// --- useCards Custom Hook ---

interface UseCardsOptions {
  offset?: number;
  limit?: number;
  forAcquisition?: boolean;
}

interface UseCardsReturn {
  cards: CardApiResponse[];
  pagination: PaginationMeta | null;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | AppError | null;
}

export const useCards = (
  deckId: string | null,
  options: UseCardsOptions = {},
): UseCardsReturn => {
  const { offset = 0, limit = 10, forAcquisition = false } = options; // ★ forAcquisitionを受け取る

  const queryResult = useQuery<PaginatedCardsResponse, Error | AppError>({
    queryKey: ["cards", deckId, { offset, limit, forAcquisition }],
    queryFn: () => {
      if (!deckId) {
        return Promise.reject(
          new AppError("Deck ID is required.", 400, "VALIDATION_ERROR"),
        );
      }
      return fetchPaginatedCards(deckId, offset, limit, forAcquisition);
    },
    enabled: !!deckId,
  });

  return {
    cards: queryResult.data?.data ?? [],
    pagination: queryResult.data?.pagination ?? null,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error,
  };
};

export type { CardApiResponse as Card };
