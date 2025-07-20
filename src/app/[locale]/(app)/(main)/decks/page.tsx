"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDecks } from "@/hooks/useDecks";
import { useDeleteDeck } from "@/hooks/useDeckMutations";
import { DeckCreateForm } from "@/components/features/DeckCreateForm";
import { DeckEditModal } from "@/components/features/DeckEditModal";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { type DeckApiResponse } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "@/i18n/navigation";

const Spinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

export default function DecksPage() {
  const _router = useRouter();
  const { isLoading: authLoading } = useAuth();
  const ITEMS_PER_PAGE = 10;
  const [offset, setOffset] = useState(0);

  const {
    decks,
    pagination,
    isLoading: decksIsLoading,
    isFetching: decksIsFetching,
    error: decksError,
  } = useDecks({
    offset: offset,
    limit: ITEMS_PER_PAGE,
  });

  const {
    mutate: deleteDeckMutate,
    isPending: isDeletingDeck,
    error: deleteDeckError,
  } = useDeleteDeck();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<DeckApiResponse | null>(
    null,
  );
  const [editingDeck, setEditingDeck] = useState<DeckApiResponse | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleEditClick = (deck: DeckApiResponse) => {
    setEditingDeck(deck);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (deck: DeckApiResponse) => {
    setDeckToDelete(deck);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deckToDelete) {
      deleteDeckMutate({ deckId: deckToDelete.id });
      setIsConfirmOpen(false);
      setDeckToDelete(null);
    }
  };

  const isLoading = authLoading || (decksIsLoading && !pagination);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (decksError) {
    return (
      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold text-red-600">Error Loading Decks</h2>
        <p className="text-gray-500">{decksError.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <h1 className="text-3xl font-bold">My Decks</h1>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Create New Deck</h2>
        <DeckCreateForm onSuccess={() => console.log("Deck created!")} />
      </div>

      <hr />

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Existing Decks</h2>

        {decks && decks.length > 0 ? (
          <ul className="space-y-4">
            {decks.map((deck) => (
              <li
                key={deck.id}
                className="p-4 bg-white rounded-lg shadow-md border cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => _router.push(`/decks/${deck.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold">{deck.name}</h2>
                    <p className="text-gray-600">
                      {deck.description || "No description provided."}
                    </p>
                  </div>
                  <div className="flex space-x-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(deck);
                      }}
                      disabled={isDeletingDeck || decksIsFetching}
                      className="px-3 py-1 text-sm font-medium text-yellow-800 bg-yellow-100 rounded-md hover:bg-yellow-200 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(deck);
                      }}
                      disabled={isDeletingDeck || decksIsFetching}
                      className="px-3 py-1 text-sm font-medium text-red-800 bg-red-100 rounded-md hover:bg-red-200 disabled:opacity-50 flex items-center space-x-1"
                    >
                      {isDeletingDeck && deckToDelete?.id === deck.id ? (
                        <>
                          <Spinner />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <span>Delete</span>
                      )}
                    </button>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-400 mt-2">
                  <span>Cards: {deck.cardCount ?? 0}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-center py-4">
            You haven&apos;t created any decks yet.
          </p>
        )}

        {decksIsFetching && (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}
      </div>

      {pagination && pagination.totalItems > ITEMS_PER_PAGE && (
        <div className="flex justify-center items-center space-x-3">
          <button
            disabled={
              !pagination._links.previous || decksIsFetching || isDeletingDeck
            }
            onClick={() => setOffset(Math.max(0, offset - ITEMS_PER_PAGE))}
            className="px-4 py-2 text-sm bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
          <p className="text-sm text-gray-500">
            {`Showing ${pagination.totalItems > 0 ? offset + 1 : 0} - ${Math.min(
              pagination.totalItems,
              offset + ITEMS_PER_PAGE,
            )} of ${pagination.totalItems}`}
          </p>
          <button
            disabled={
              !pagination._links.next || decksIsFetching || isDeletingDeck
            }
            onClick={() => setOffset(offset + ITEMS_PER_PAGE)}
            className="px-4 py-2 text-sm bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {deleteDeckError && (
        <p className="text-red-500 text-center">{deleteDeckError.message}</p>
      )}

      {/* --- Modals --- */}
      {isMounted &&
        deckToDelete &&
        createPortal(
          <ConfirmationDialog
            isOpen={isConfirmOpen}
            onOpenChange={setIsConfirmOpen}
            onConfirm={handleConfirmDelete}
            title="Delete Deck"
            description={`Are you sure you want to delete "${deckToDelete.name}"? This action cannot be undone.`}
            isConfirming={isDeletingDeck}
          />,
          document.body,
        )}

      {isMounted &&
        editingDeck &&
        createPortal(
          <DeckEditModal
            isOpen={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            deck={editingDeck}
            onSuccess={() => {
              setIsEditModalOpen(false);
              setEditingDeck(null);
            }}
          />,
          document.body,
        )}
    </div>
  );
}
