// src/app/[locale]/(app)/(main)/decks/page.tsx
'use client';

import React, { useState, useEffect } from 'react'; // ★ Add useEffect
import { createPortal } from 'react-dom'; // ★ Add createPortal
// import { useParams } from 'next/navigation'; // ★ Removed unused import
import { useDecks } from '@/hooks/useDecks';
import { useDeleteDeck } from '@/hooks/useDeckMutations';
import { DeckCreateForm } from '@/components/features/DeckCreateForm';
import { DeckEditModal } from '@/components/features/DeckEditModal'; // ★ Add DeckEditModal import
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { type DeckApiResponse } from '@/types'; // Import types
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

function DecksPage() {
  const { isLoading: authLoading } = useAuth();

  const ITEMS_PER_PAGE = 10;
  const [offset, setOffset] = useState(0);

  const { decks, pagination, isLoading: decksIsLoading, isFetching: decksIsFetching, error: decksError } = useDecks({
    offset: offset,
    limit: ITEMS_PER_PAGE,
  });

  const { mutate: deleteDeckMutate, isPending: isDeletingDeck, error: deleteDeckError } = useDeleteDeck();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<DeckApiResponse | null>(null);
  // const params = useParams(); // ★ Removed unused variable

  // ★★★ Add state for edit modal ★★★
  const [editingDeck, setEditingDeck] = useState<DeckApiResponse | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // For Portal
  // ★★★★★★★★★★★★★★★★★★★★★★★

  // ★ Add useEffect for Portal mount ★
  useEffect(() => {
    setIsMounted(true);
  }, []);
  // ★★★★★★★★★★★★★★★★★★★★★★★

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

  // ★★★ Add handleEditClick function ★★★
  const handleEditClick = (deck: DeckApiResponse) => {
    setEditingDeck(deck);
    setIsEditModalOpen(true);
  };
  // ★★★★★★★★★★★★★★★★★★★★★★★

  const Spinner = () => <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>;

  const isLoading = authLoading || decksIsLoading;

  if (isLoading && !pagination) {
      return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Decks</h1>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Create New Deck</h2>
        <DeckCreateForm onSuccess={() => console.log('Deck created callback!')} />
      </div>

      <h2 className="text-2xl font-semibold mb-4">Existing Decks</h2>
      {!decksIsLoading && decksError && (
        <div className="text-red-600 bg-red-100 border border-red-400 p-4 rounded mb-4">
          <p>Error loading decks:</p>
          <pre>{decksError instanceof Error ? decksError.message : JSON.stringify(decksError)}</pre>
        </div>
      )}
      {!isLoading && !decksError && decks && ( // Ensure decks is also checked
         <>
           {decks.length === 0 && offset === 0 && !decksIsFetching && ( // Check offset and fetching
             <p>You haven&apos;t created any decks yet.</p> // ★★★ Fixed '
           )}
           {decks.length > 0 && (
             <ul className="space-y-3 mb-6">
               {decks.map((deck: DeckApiResponse) => ( // Added type for deck
                 <li key={deck.id} className="p-4 border rounded-md shadow-sm bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                   <div className="flex justify-between items-center">
                     <Link href={`/decks/${deck.id}`} className="text-lg font-medium hover:underline">
                       {deck.name}
                     </Link>
                     <div className="space-x-2">
                       <Link href={`/decks/${deck.id}`} className="text-blue-500 hover:underline text-sm">View</Link>
                       <button
                         // ★ Remove disabled, add onClick ★
                         className="text-yellow-500 hover:underline text-sm disabled:opacity-50"
                         onClick={() => handleEditClick(deck)}
                         // disabled // ★ Removed ★
                       >
                         Edit
                       </button>
                       <button
                         className="text-red-500 hover:underline text-sm disabled:opacity-50"
                         onClick={() => handleDeleteClick(deck)}
                         disabled={isDeletingDeck || decksIsFetching} // Disable while fetching too
                       >
                         {isDeletingDeck && deckToDelete?.id === deck.id ? 'Deleting...' : 'Delete'}
                       </button>
                     </div>
                   </div>
                   {deck.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{deck.description}</p>}
                 </li>
               ))}
             </ul>
           )}
         </>
       )}
        {(decksIsLoading || decksIsFetching) && !decksError && ( // Loading/Fetching indicator
            <div className="flex justify-center items-center mt-4">
                <Spinner /> <span className="ml-2">Loading decks...</span>
            </div>
       )}

       {/* Pagination Controls */}
       {!isLoading && !decksError && pagination && pagination.totalItems > 0 && (
         <div className="mt-6 flex items-center justify-center space-x-4">
           <button
             onClick={() => setOffset(Math.max(0, offset - ITEMS_PER_PAGE))}
             disabled={!pagination._links.previous || decksIsFetching}
             className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
           >
             Previous
           </button>
           <span className="text-sm text-gray-700 dark:text-gray-300">
             {`Showing ${pagination.totalItems > 0 ? offset + 1 : 0} - ${Math.min(pagination.totalItems, offset + ITEMS_PER_PAGE)} of ${pagination.totalItems}`}
           </span>
           <button
             onClick={() => setOffset(offset + ITEMS_PER_PAGE)}
             disabled={!pagination._links.next || decksIsFetching}
             className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
           >
             Next
           </button>
         </div>
       )}

      {/* Delete Confirmation Dialog */}
      {deckToDelete && (
        <ConfirmationDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmDelete}
          title="Delete Deck"
          // ★★★ Ensure no unescaped ' here ★★★
          description={`Are you sure you want to delete "${deckToDelete.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          isConfirming={isDeletingDeck} // Only disable confirm button during delete op
        />
      )}

      {/* Delete Error Display */}
      {deleteDeckError && (
          <div className="text-red-600 mt-4">
            Error deleting deck: {deleteDeckError.message}
          </div>
      )}
      {/* ★★★ Add DeckEditModal rendering ★★★ */}
      {isMounted && editingDeck && createPortal(
        <DeckEditModal
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen} // Pass setter to allow modal to close itself
          deck={editingDeck} // Pass the deck data to edit
          onSuccess={() => {
            setIsEditModalOpen(false); // Close modal on success
            setEditingDeck(null);     // Clear editing state
            console.log('Deck update successful, modal closed.');
            // Optional: Add success toast/message here
          }}
        />,
        document.body // Render directly into body
      )}
      {/* ★★★★★★★★★★★★★★★★★★★★★★★★★ */}
    </div>
  );
}

export default DecksPage;