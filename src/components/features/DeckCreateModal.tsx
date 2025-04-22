// src/components/features/DeckCreateModal.tsx
import React from 'react';
import { DeckCreateForm } from './DeckCreateForm';

interface DeckCreateModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess?: () => void;
}

export function DeckCreateModal({ isOpen, onOpenChange, onSuccess }: DeckCreateModalProps) {
  const handleSuccess = () => {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm" // Added background/blur to overlay div
      aria-labelledby="deck-create-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={handleOverlayClick} // Close on overlay click
    >
      {/* Modal Content - Stop propagation */}
      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transform transition-all sm:my-8"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
       >
        <div className="p-6 space-y-4">
          <h2 id="deck-create-modal-title" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
            Create New Deck
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
             {/* ★★★ Fixed ' */}
            Enter the name for your new deck. Click save when you&apos;re done.
          </p>
          <DeckCreateForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}