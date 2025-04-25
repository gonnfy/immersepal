// src/components/features/CardList.tsx (修正案 - JSX構造見直し・完全版)

'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCards, Card } from '@/hooks/useCards';
import { AiContentType } from '@prisma/client';
import { useDeleteCard, Card as CardWithStringDates } from '@/hooks/useCardMutations';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { CardEditModal } from './CardEditModal';

interface CardListProps {
  deckId: string;
}

export const CardList: React.FC<CardListProps> = ({ deckId }) => {
  const ITEMS_PER_PAGE = 10;
  const [offset, setOffset] = useState(0);

  const { cards, pagination, isLoading, isFetching, error } = useCards(deckId, {
    offset: offset,
    limit: ITEMS_PER_PAGE,
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [editingCard, setEditingCard] = useState<CardWithStringDates | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const deleteCardMutation = useDeleteCard(deckId, {
    onSuccess: (deletedCardId) => {
      console.log(`Successfully deleted card ${deletedCardId}`);
      setIsDeleteDialogOpen(false);
      setCardToDelete(null);
    },
    onError: (error, deletedCardId) => {
      console.error(`Failed to delete card ${deletedCardId}:`, error.message);
      setIsDeleteDialogOpen(false);
      setCardToDelete(null);
      alert(`Error deleting card: ${error.message}`);
    },
  });

  const handleDeleteClick = (cardId: string) => {
    setCardToDelete(cardId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (cardToDelete) {
      deleteCardMutation.mutate({ cardId: cardToDelete });
    }
  };

  const handleEditClick = (cardFromUseCards: Card) => {
    if (!cardFromUseCards) return;
    const cardForModal: CardWithStringDates = {
        ...cardFromUseCards,
        nextReviewAt: cardFromUseCards.nextReviewAt instanceof Date ? cardFromUseCards.nextReviewAt.toISOString() : String(cardFromUseCards.nextReviewAt ?? ''),
        createdAt: cardFromUseCards.createdAt instanceof Date ? cardFromUseCards.createdAt.toISOString() : String(cardFromUseCards.createdAt ?? ''),
        updatedAt: cardFromUseCards.updatedAt instanceof Date ? cardFromUseCards.updatedAt.toISOString() : String(cardFromUseCards.updatedAt ?? ''),
        // aiContents are not included here for the modal for now
    };
    setEditingCard(cardForModal);
    setIsEditModalOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center py-10"><p>Loading cards...</p></div>;
  }
  if (error) {
    return <div className="p-4 text-red-600 bg-red-100 border border-red-400 rounded"><p>Error loading cards: {error.message}</p></div>;
  }
  if (!cards || cards.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">No cards found in this deck yet.</p>;
  }

  // --- Render Card List ---
  // Use a div wrapper instead of React Fragment just in case
  return (
    <div>
      {/* Card List */}
      <ul className="space-y-4">
        {cards.map((card) => (
          <li key={card.id} className="p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700 transition hover:shadow-md">
            <div className="flex justify-between items-start gap-4">
              {/* Card Content Area */}
              <div className="flex-grow">
                <div className="mb-2">
                  <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">Front</p>
                  <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{card.front}</p>
                </div>
                <div className="mb-3">
                  <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">Back</p>
                  <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{card.back}</p>
                </div>
                {/* AI Content Display Section */}
                {card.aiContents && card.aiContents.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">AI Content:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {card.aiContents.map((content) => (
                        <button
                          key={content.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                          title={`Type: ${content.contentType}, Lang: ${content.language}`}
                        >
                          {content.contentType === AiContentType.EXPLANATION ? 'Expl.' : 'Transl.'} ({content.language})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Action Buttons Area */}
              <div className="flex flex-col space-y-2 flex-shrink-0">
                <button
                  onClick={() => handleEditClick(card)}
                  className="px-2.5 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded hover:bg-yellow-200 dark:bg-yellow-700 dark:text-yellow-100 dark:hover:bg-yellow-600"
                  aria-label={`Edit card`}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(card.id)}
                  disabled={deleteCardMutation.isPending && cardToDelete === card.id}
                  className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 dark:bg-red-700 dark:text-red-100 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Delete card`}
                >
                  {deleteCardMutation.isPending && cardToDelete === card.id ? '...' : 'Delete'}
                </button>
              </div>
            </div>
            {/* Optional: SRS Info */}
             <div className="text-right text-xs text-gray-400 dark:text-gray-500 mt-1">
               Next: {new Date(card.nextReviewAt).toLocaleDateString()} (I:{card.interval}, EF:{card.easeFactor.toFixed(1)})
             </div>
          </li>
        ))}
      </ul>

      {/* Pagination Controls */}
      {isMounted && pagination && pagination.totalItems > ITEMS_PER_PAGE && (
         <div className="mt-6 flex items-center justify-center space-x-4">
            <button
                onClick={() => setOffset(Math.max(0, offset - ITEMS_PER_PAGE))}
                disabled={!pagination._links.previous || isFetching}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
                Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
                {`Page ${Math.floor(offset / ITEMS_PER_PAGE) + 1} / ${Math.ceil(pagination.totalItems / ITEMS_PER_PAGE)} (${pagination.totalItems} items)`}
            </span>
            <button
                onClick={() => setOffset(offset + ITEMS_PER_PAGE)}
                disabled={!pagination._links.next || isFetching}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
                Next
            </button>
        </div>
      )}

      {/* Modals */}
      {isMounted && createPortal(
        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          title="Delete Card"
          description="Are you sure you want to delete this card? This action cannot be undone."
          confirmText="Delete"
          isConfirming={deleteCardMutation.isPending}
        />,
        document.body
      )}
      {isMounted && createPortal(
        <CardEditModal
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          card={editingCard} // Ensure CardEditModal handles this type correctly
          deckId={deckId}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setEditingCard(null);
            console.log('Card update successful, modal closed.');
          }}
        />,
        document.body
      )}
    </div>
  );
};

// Re-export Card type alias (optional)
export type { Card };