// src/components/features/CardList.tsx
'use client'; // This component uses hooks, so it needs to be a client component

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCards } from '@/hooks/useCards';
// Import Card type from useCardMutations (expects string dates), alias it for clarity
import { useDeleteCard, Card as CardWithStringDates } from '@/hooks/useCardMutations';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { CardEditModal } from './CardEditModal'; // Import the new modal

// import { YStack, Text, Spinner, Button } from 'tamagui'; // Example if using Tamagui

interface CardListProps {
  deckId: string;
}

// Local Card type definition removed.


export const CardList: React.FC<CardListProps> = ({ deckId }) => {
  // useCards returns cards with Date objects for date fields
  const { cards, isLoading, error } = useCards(deckId);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false); // State to track client-side mount

  // State for Edit Modal - uses Card type with string dates
  const [editingCard, setEditingCard] = useState<CardWithStringDates | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Set mounted state after component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);


  // Instantiate the delete mutation hook
  const deleteCardMutation = useDeleteCard(deckId, {
    onSuccess: (deletedCardId) => {
      console.log(`Successfully deleted card ${deletedCardId} and invalidated query.`);
      setIsDeleteDialogOpen(false); // Close dialog on success
      setCardToDelete(null);
      // Optionally show a success toast/message here
    },
    onError: (error, deletedCardId) => {
      console.error(`Failed to delete card ${deletedCardId}:`, error.message);
      // Keep dialog open or close? Let's close it for now.
      setIsDeleteDialogOpen(false);
      setCardToDelete(null);
      // Optionally show an error toast/message here
      alert(`Error deleting card: ${error.message}`); // Simple alert for now
    },
  });

  // Handler to open the confirmation dialog
  const handleDeleteClick = (cardId: string) => {
    setCardToDelete(cardId);
    setIsDeleteDialogOpen(true);
  };

  // Handler to confirm deletion
  const handleConfirmDelete = () => {
    if (cardToDelete) {
      deleteCardMutation.mutate({ cardId: cardToDelete });
      // Dialog will be closed via onSuccess/onError callbacks
    }
  };

  // Handler to open the edit modal
  // Accepts a card object from useCards (with Date fields)
  // Converts it to CardWithStringDates before setting state
  const handleEditClick = (cardFromUseCards: any) => { // Using 'any' for the input type from useCards
    if (!cardFromUseCards) return;
    // Create the object for the modal state, converting dates to ISO strings
    const cardForModal: CardWithStringDates = {
      ...cardFromUseCards,
      // Ensure conversion only happens if it's actually a Date object
      nextReviewAt: cardFromUseCards.nextReviewAt instanceof Date
        ? cardFromUseCards.nextReviewAt.toISOString()
        : String(cardFromUseCards.nextReviewAt ?? ''), // Handle null/undefined
      createdAt: cardFromUseCards.createdAt instanceof Date
        ? cardFromUseCards.createdAt.toISOString()
        : String(cardFromUseCards.createdAt ?? ''), // Handle null/undefined
      updatedAt: cardFromUseCards.updatedAt instanceof Date
        ? cardFromUseCards.updatedAt.toISOString()
        : String(cardFromUseCards.updatedAt ?? ''), // Handle null/undefined
    };
    setEditingCard(cardForModal);
    setIsEditModalOpen(true);
  };

  if (isLoading) {
    return (
      <div>
        <p>Loading cards...</p>
        {/* <Spinner size="large" color="$blue10" /> */}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: 'red' }}>
        <p>Error loading cards: {error.message}</p>
        {/* Optionally show error code or details */}
        {/* {error instanceof AppError && <p>Code: {error.errorCode}</p>} */}
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return <p>No cards found in this deck.</p>;
  }


// Render the Confirmation Dialog outside the main list structure
return (
  <>
    {/* <YStack space="$3"> */}
    <div>
      <h2>Cards in this Deck ({cards?.length ?? 0})</h2>
      {cards && cards.length > 0 ? (
        <ul>
          {cards.map((card) => ( // card from useCards has Date objects
            <li key={card.id} style={{ border: '1px solid #ccc', marginBottom: '10px', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* <YStack space="$2" padding="$3" borderRadius="$3" backgroundColor="$backgroundFocus"> */}
              <div>
                <p><strong>Front:</strong> {card.front}</p>
                {/* <Text fontWeight="bold">Front:</Text> <Text>{card.front}</Text> */}
                <p><strong>Back:</strong> {card.back}</p>
                {/* <Text fontWeight="bold">Back:</Text> <Text>{card.back}</Text> */}
                {/* Add more details as needed, e.g., next review date */}
                <p><small>Next Review: {new Date(card.nextReviewAt).toLocaleDateString()}</small></p>
                {/* <Text fontSize="$2" color="$color11">Next Review: {new Date(card.nextReviewAt).toLocaleDateString()}</Text> */}
              </div>
              {/* Action Buttons Container */}
              <div className="flex space-x-2 ml-4 self-start">
                 {/* Edit Button */}
                 <button
                   onClick={() => handleEditClick(card)} // Pass the card object from useCards
                   className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                   aria-label={`Edit card ${card.front}`}
                 >
                   Edit
                 </button>
                 {/* Delete Button */}
                 <button
                   onClick={() => handleDeleteClick(card.id)}
                   disabled={deleteCardMutation.isPending && cardToDelete === card.id}
                   className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   aria-label={`Delete card ${card.front}`}
                 >
                   {deleteCardMutation.isPending && cardToDelete === card.id ? 'Deleting...' : 'Delete'}
                 </button>
              </div>
              {/* </YStack> */}
            </li>
          ))}
        </ul>
      ) : (
        <p>No cards found in this deck.</p> // Handle case where cards array exists but is empty
      )}
    </div>
    {/* </YStack> */}

    {/* Render Confirmation Dialog via Portal if mounted */}
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
      document.body // Target the body element
    )}

    {/* Render CardEditModal via Portal if mounted */}
    {isMounted && createPortal(
      <CardEditModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        card={editingCard} // Pass the state variable holding the card (with string dates)
        deckId={deckId}
        onSuccess={() => {
          setIsEditModalOpen(false); // Close modal on success
          setEditingCard(null); // Clear editing card state
          // Optionally add success feedback like a toast
          console.log('Card update successful, modal closed.');
        }}
      />,
      document.body // Target the body element
    )}
  </>
);
};