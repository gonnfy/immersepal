import React from 'react';
import { DeckCreateForm } from './DeckCreateForm';

interface DeckCreateModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess?: () => void; // Optional callback after successful creation
}

export function DeckCreateModal({ isOpen, onOpenChange, onSuccess }: DeckCreateModalProps) {
  const handleSuccess = () => {
    onOpenChange(false); // Close modal on success
    if (onSuccess) {
      onSuccess();
    }
  };

  // Handle closing the modal when clicking the overlay
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if the click target is the overlay itself, not its children
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  if (!isOpen) {
    return null; // Don't render anything if the modal is closed
  }

  return (
    // Portal equivalent (rendered at the end of body usually, but here just fixed position)
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-labelledby="deck-create-modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        aria-hidden="true"
        onClick={handleOverlayClick} // Close on overlay click
      ></div>

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transform transition-all sm:my-8">
        <div className="p-6 space-y-4">
          <h2 id="deck-create-modal-title" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
            Create New Deck
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter the name for your new deck. Click save when you're done.
          </p>
          {/* Deck Create Form */}
          <DeckCreateForm onSuccess={handleSuccess} />

          {/* Optional: Add a close button if needed */}
          {/* <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            X {/* Replace with an icon if available *}
          {/* </button> */}
        </div>
      </div>
    </div>
  );
}