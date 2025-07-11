import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { AuthError } from "@supabase/supabase-js";
import {
  ApiErrorResponse,
  DeckApiResponse,
  DeckCreatePayload,
  DeckUpdatePayload,
} from "../types";

export class ApiError extends Error {
  status: number;
  details?: unknown; // Changed from any

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const createDeckApi = async ({
  deckData,
}: {
  deckData: DeckCreatePayload;
}): Promise<DeckApiResponse> => {
  const apiUrl = `/api/decks`; // ★ locale なし ★
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(deckData),
  });

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({
      message: "Failed to parse error response",
      error: "PARSE_ERROR",
    }));
    throw new ApiError(
      errorData.message || `HTTP error! status: ${response.status}`,
      response.status,
      errorData.details,
    );
  }
  return response.json();
};

export const useCreateDeck = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const mutation = useMutation<
    DeckApiResponse,
    ApiError | AuthError,
    DeckCreatePayload
  >({
    mutationFn: (deckData: DeckCreatePayload) => createDeckApi({ deckData }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["decks", userId] });
      console.log("Deck created successfully:", data);
    },
    onError: (error) => {
      console.error("Error creating deck:", error);
    },
  });

  return mutation;
};

const deleteDeckApi = async ({ deckId }: { deckId: string }): Promise<void> => {
  const apiUrl = `/api/decks/${deckId}`; // ★ locale なし ★
  const response = await fetch(apiUrl, {
    method: "DELETE",
  });
  if (response.status !== 204) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({
      message: "Failed to parse error response",
      error: "PARSE_ERROR",
    }));
    throw new ApiError(
      errorData.message || `HTTP error! status: ${response.status}`,
      response.status,
      errorData.details,
    );
  }
};

export const useDeleteDeck = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const mutation = useMutation<void, ApiError | AuthError, { deckId: string }>({
    mutationFn: ({ deckId }: { deckId: string }) => deleteDeckApi({ deckId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["decks", userId] });
      console.log(`Deck ${variables.deckId} deleted successfully`);
    },
    onError: (error, variables) => {
      console.error(`Error deleting deck ${variables.deckId}:`, error);
    },
  });

  return mutation;
};

const updateDeckApi = async ({
  deckId,
  data,
}: {
  deckId: string;
  data: DeckUpdatePayload;
}): Promise<DeckApiResponse> => {
  const apiUrl = `/api/decks/${deckId}`;
  console.log(`[updateDeckApi] Calling PUT ${apiUrl}`);

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: `HTTP error ${response.status}` }));
    const message =
      typeof errorData.message === "string"
        ? errorData.message
        : `HTTP error! status: ${response.status}`;
    throw new ApiError(message, response.status, errorData.details);
  }
  return response.json();
};

/**
 * Custom hook for updating an existing deck.
 */
export const useUpdateDeck = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const mutation = useMutation<
    DeckApiResponse,
    ApiError | AuthError,
    { deckId: string; data: DeckUpdatePayload }
  >({
    mutationFn: updateDeckApi,
    onSuccess: (updatedDeck, variables) => {
      console.log(
        `Deck ${variables.deckId} updated successfully:`,
        updatedDeck,
      );

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["decks", userId] });

      queryClient.invalidateQueries({ queryKey: ["deck", variables.deckId] });
    },
    onError: (error, variables) => {
      console.error(`Error updating deck ${variables.deckId}:`, error);
    },
  });

  return mutation;
};
