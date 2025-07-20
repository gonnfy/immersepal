"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useCards, Card } from "@/hooks/useCards";
import { AiContentType } from "@prisma/client";
import {
  useDeleteCard,
  Card as CardWithStringDates,
} from "@/hooks/useCardMutations";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { CardEditModal } from "./CardEditModal";
import {
  useGenerateTts,
  type TtsPayload,
  type TtsSuccessResponse,
} from "@/hooks/useGenerateTts";
import {
  useSaveAiContent,
  type SaveAiContentVariables,
} from "@/hooks/useSaveAiContent";
import { useGetTtsUrl } from "@/hooks/useGetTtsUrl";
import { SpeakerWaveIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { AppError } from "@/lib/errors";
import { type AICardContentApiResponse } from "@/types/api.types";

interface CardListProps {
  deckId: string;
}

export function CardList({ deckId }: CardListProps) {
  const ITEMS_PER_PAGE = 10;
  const [offset, setOffset] = useState(0);

  const {
    cards,
    pagination,
    isLoading,
    isFetching,
    error: fetchCardsError,
  } = useCards(deckId, { offset: offset, limit: ITEMS_PER_PAGE });

  // Component State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [editingCard, setEditingCard] = useState<CardWithStringDates | null>(
    null,
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [gcsPathToFetch, setGcsPathToFetch] = useState<string | null>(null);
  const [urlToPlay, setUrlToPlay] = useState<string | null>(null);
  const [ttsErrorMsg, setTtsErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const queryClient = useQueryClient();

  const deleteCardMutation = useDeleteCard(deckId, {
    onSuccess: (deletedCardId: string) => {
      console.log(`Successfully deleted card ${deletedCardId}`);
      setIsDeleteDialogOpen(false);
      setCardToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["cards", deckId] });
    },
    onError: (error: AppError, cardId: string) => {
      console.error(`Failed to delete card ${cardId}:`, error.message);
      setIsDeleteDialogOpen(false);
      setCardToDelete(null);
      alert(`Error deleting card: ${error.message}`);
    },
  });

  const { mutate: saveAiContentMutate, isPending: isSavingContent } =
    useSaveAiContent({
      onSuccess: (
        _data: AICardContentApiResponse,
        variables: SaveAiContentVariables,
      ) => {
        console.log(`[CardList] AI Content saved for card ${variables.cardId}`);
        queryClient.invalidateQueries({ queryKey: ["cards", deckId] });
        setLoadingAudioId(null);
      },
      onError: (error: AppError, variables: SaveAiContentVariables) => {
        console.error(
          `[CardList] Failed to save AI content for card ${variables.cardId}:`,
          error,
        );
        setTtsErrorMsg(`Failed to save audio info: ${error.message}`);
        setLoadingAudioId(null);
      },
    });

  const { mutate: generateTtsMutate, isPending: ttsIsPending } = useGenerateTts(
    {
      onSuccess: (
        data: TtsSuccessResponse,
        variables: TtsPayload,
        _context: unknown,
      ) => {
        console.log("[CardList] TTS generated:", data.signedUrl, data.gcsPath);
        setUrlToPlay(data.signedUrl);
        saveAiContentMutate({
          cardId: variables.cardId,
          contentType:
            variables.side === "front"
              ? AiContentType.AUDIO_PRIMARY
              : AiContentType.AUDIO_SECONDARY,
          language:
            variables.language ||
            (variables.side === "front" ? "en-US" : "ja-JP"),
          content: data.gcsPath,
        });
      },
      onError: (error: AppError, variables: TtsPayload, _context: unknown) => {
        console.error(
          `[CardList] TTS generation failed for card ${variables.cardId}:`,
          error,
        );
        setTtsErrorMsg(`Audio generation failed: ${error.message}`);
        setLoadingAudioId(null);
      },
    },
  );

  const {
    data: signedUrlData,
    isLoading: isFetchingUrl,
    error: fetchUrlError,
  } = useGetTtsUrl(gcsPathToFetch);

  useEffect(() => {
    if (signedUrlData?.signedUrl) {
      setUrlToPlay(signedUrlData.signedUrl);
      setGcsPathToFetch(null);
    }
  }, [signedUrlData]);
  useEffect(() => {
    if (fetchUrlError) {
      console.error(
        "[CardList] Failed to get signed URL via hook:",
        fetchUrlError,
      );
      setTtsErrorMsg(`Failed to get audio URL: ${fetchUrlError.message}`);
      setLoadingAudioId(null);
      setGcsPathToFetch(null);
    }
  }, [fetchUrlError]);
  useEffect(() => {
    if (urlToPlay) {
      console.log("[CardList] Playing audio:", urlToPlay);
      try {
        const audio = new Audio(urlToPlay);
        audio.play();
        audio.onended = () => setLoadingAudioId(null);
        audio.onerror = () => {
          console.error("Audio element error");
          setTtsErrorMsg("Audio playback failed.");
          setLoadingAudioId(null);
        };
      } catch (audioError) {
        console.error("Error initiating audio playback:", audioError);
        setTtsErrorMsg("Audio playback failed.");
        setLoadingAudioId(null);
      } finally {
        setUrlToPlay(null);
      }
    }
  }, [urlToPlay]);

  // Event Handlers
  const handleDeleteClick = (cardId: string) => {
    setCardToDelete(cardId);
    setIsDeleteDialogOpen(true);
  };
  const handleConfirmDelete = () => {
    if (cardToDelete) {
      deleteCardMutation.mutate({ cardId: cardToDelete });
    }
  };
  const handleEditClick = (card: Card) => {
    const cardForModal: CardWithStringDates = {
      ...card,
      createdAt: String(card.createdAt ?? ""),
      updatedAt: String(card.updatedAt ?? ""),
      nextReviewAt: String(card.nextReviewAt ?? ""),
    };
    setEditingCard(cardForModal);
    setIsEditModalOpen(true);
  };
  const handlePlayAudio = (card: Card, side: "front" | "back") => {
    const languageCode =
      side === "front"
        ? process.env.NEXT_PUBLIC_TTS_LANGUAGE_CODE_EN || "en-US"
        : process.env.NEXT_PUBLIC_TTS_LANGUAGE_CODE_JA || "ja-JP";
    const contentTypeToFind =
      side === "front"
        ? AiContentType.AUDIO_PRIMARY
        : AiContentType.AUDIO_SECONDARY;
    const loadingId = `${card.id}-${side}`;
    if (loadingAudioId) return;
    setTtsErrorMsg(null);
    const existingAudio = card.aiContents?.find(
      (c) => c.contentType === contentTypeToFind && c.language === languageCode,
    );
    const gcsPath = existingAudio?.content;
    if (gcsPath) {
      setLoadingAudioId(loadingId);
      setGcsPathToFetch(gcsPath);
    } else {
      const text = side === "front" ? card.front : card.back;
      if (text && text.trim().length > 0) {
        setLoadingAudioId(loadingId);
        generateTtsMutate({
          text,
          language: languageCode,
          cardId: card.id,
          side,
        });
      } else {
        setTtsErrorMsg("No text available to synthesize.");
      }
    }
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading cards...</div>;
  }
  if (fetchCardsError) {
    return (
      <div className="p-4 text-red-600 bg-red-100 border border-red-400 rounded">
        Error: {fetchCardsError.message}
      </div>
    );
  }
  const hasCards = cards && cards.length > 0;
  if (!hasCards) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
        No cards found in this deck yet.
      </p>
    );
  }

  return (
    <div>
      {ttsErrorMsg && (
        <div
          className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
          role="alert"
        >
          Audio Error: {ttsErrorMsg}
        </div>
      )}
      <ul className="space-y-4">
        {cards.map((card: Card) => {
          const isLoadingFront = loadingAudioId === `${card.id}-front`;
          const isLoadingBack = loadingAudioId === `${card.id}-back`;
          const isDeleting =
            deleteCardMutation.isPending && cardToDelete === card.id;
          const isAnyAudioProcessing =
            isFetchingUrl || ttsIsPending || isSavingContent;
          const disablePlayButton = isAnyAudioProcessing || isDeleting;
          const disableEditDeleteButton = isDeleting;

          return (
            <li
              key={card.id}
              className="p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700 transition hover:shadow-md"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-grow">
                  {/* Front + Play Button */}
                  <div className="mb-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">
                        Front
                      </p>
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(card, "front")}
                        disabled={disablePlayButton || !card.front}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed p-0.5"
                        aria-label="Play front audio"
                        title="Play front audio"
                      >
                        {isLoadingFront ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <SpeakerWaveIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap mt-1">
                      {card.front}
                    </p>
                  </div>
                  {/* Back + Play Button */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">
                        Back
                      </p>
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(card, "back")}
                        disabled={disablePlayButton || !card.back}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed p-0.5"
                        aria-label="Play back audio"
                        title="Play back audio"
                      >
                        {isLoadingBack ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <SpeakerWaveIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap mt-1">
                      {card.back}
                    </p>
                  </div>
                  {/* AI Content Display */}
                  {card.aiContents && card.aiContents.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                        AI Content:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {card.aiContents.map((content) => (
                          <span
                            key={content.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                            title={`Type: ${content.contentType}, Lang: ${content.language}`}
                          >
                            {content.contentType === AiContentType.EXPLANATION
                              ? "Expl."
                              : content.contentType ===
                                  AiContentType.TRANSLATION
                                ? "Transl."
                                : content.contentType.replace(
                                    "AUDIO_",
                                    "Aud.",
                                  )}{" "}
                            ({content.language})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* Action Buttons Area */}
                <div className="flex flex-col space-y-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEditClick(card)}
                    disabled={disableEditDeleteButton}
                    className="px-2.5 py-1 text-xs font-medium text-center text-yellow-700 bg-yellow-100 rounded hover:bg-yellow-200 focus:ring-4 focus:outline-none focus:ring-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:hover:bg-yellow-800/50 dark:focus:ring-yellow-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {" "}
                    Edit{" "}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(card.id)}
                    disabled={disableEditDeleteButton}
                    className="px-2.5 py-1 text-xs font-medium text-center text-red-700 bg-red-100 rounded hover:bg-red-200 focus:ring-4 focus:outline-none focus:ring-red-300 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-800/50 dark:focus:ring-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {" "}
                    {isDeleting ? "..." : "Delete"}{" "}
                  </button>
                </div>
              </div>
              {/* SRS Info */}
              <div className="text-right text-xs text-gray-400 dark:text-gray-500 mt-1">
                {" "}
                Next: {new Date(card.nextReviewAt).toLocaleDateString()} (I:
                {card.interval}, EF:{card.easeFactor.toFixed(1)}){" "}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Pagination Controls */}
      {isMounted && pagination && pagination.totalItems > ITEMS_PER_PAGE && (
        <div className="mt-6 flex items-center justify-center space-x-4">
          <button
            onClick={() => setOffset(Math.max(0, offset - ITEMS_PER_PAGE))}
            disabled={!pagination._links.previous || isFetching}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {" "}
            Previous{" "}
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {" "}
            Page {Math.floor(offset / ITEMS_PER_PAGE) + 1} /{" "}
            {Math.ceil(pagination.totalItems / ITEMS_PER_PAGE)} (
            {pagination.totalItems} items){" "}
          </span>
          <button
            onClick={() => setOffset(offset + ITEMS_PER_PAGE)}
            disabled={!pagination._links.next || isFetching}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {" "}
            Next{" "}
          </button>
        </div>
      )}

      {/* Modals */}
      {isMounted &&
        createPortal(
          <ConfirmationDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onConfirm={handleConfirmDelete}
            title="Delete Card"
            description="Are you sure you want to delete this card? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            isConfirming={deleteCardMutation.isPending}
          />,
          document.body,
        )}
      {isMounted &&
        editingCard &&
        createPortal(
          <CardEditModal
            isOpen={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            card={editingCard}
            deckId={deckId}
            onSuccess={() => {
              setIsEditModalOpen(false);
              setEditingCard(null);
            }}
          />,
          document.body,
        )}
    </div>
  );
}
