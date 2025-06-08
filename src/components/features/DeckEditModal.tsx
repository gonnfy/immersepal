'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { deckUpdateSchema, DeckUpdatePayload } from 'src/lib/zod'; // Corrected path
import { useUpdateDeck, ApiError } from 'src/hooks/useDeckMutations'; // Corrected path
import type { DeckApiResponse } from 'src/types'; // Corrected path (assuming index.ts exports it)
import type { AppError } from 'src/lib/errors'; // Corrected path
import { AuthError } from '@supabase/supabase-js';

interface DeckEditModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  deck: DeckApiResponse | null;
  onSuccess?: () => void;
}

export const DeckEditModal: React.FC<DeckEditModalProps> = ({
  isOpen,
  onOpenChange,
  deck,
  onSuccess,
}) => {
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DeckUpdatePayload>({
    resolver: zodResolver(deckUpdateSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Reset form when modal opens or the deck data changes
  useEffect(() => {
    if (isOpen && deck) {
      reset({
        name: deck.name,
        description: deck.description ?? '', // Handle null description
      });
      setApiError(null); // Clear previous errors
    }
    // Optional: Clear form when modal closes (uncomment if needed)
    // if (!isOpen) {
    //   reset({ name: '', description: '' });
    //   setApiError(null);
    // }
  }, [isOpen, deck, reset]);

  const handleSuccess = (updatedDeck: DeckApiResponse) => {
    console.log('Deck updated successfully:', updatedDeck);
    setApiError(null);
    onSuccess?.();
    onOpenChange(false);
  };

  const handleError = (error: ApiError | AuthError | AppError) => {
    // Include AppError if needed
    console.error('Error updating deck:', error);
    // Check if error has a message property before accessing it
    const message =
      'message' in error ? error.message : 'An unexpected error occurred.';
    setApiError(message);
  };

  // Setup mutation with callbacks
  const {
    mutate: updateDeckMutate,
    isPending: updateIsPending,
    error: mutationError,
  } = useUpdateDeck();

  const onSubmit: SubmitHandler<DeckUpdatePayload> = (data) => {
    if (!deck) {
      setApiError('Error: No deck selected for editing.');
      return;
    }

    // Convert empty string description back to null if necessary for API/DB
    const dataToSubmit: DeckUpdatePayload = {
      ...data,
      description: data.description === '' ? null : data.description,
    };

    // Optional: Only submit if there are actual changes
    const hasChanges =
      dataToSubmit.name !== deck.name ||
      dataToSubmit.description !== deck.description;
    if (!hasChanges) {
      onOpenChange(false); // Close if no changes
      return;
    }

    setApiError(null); // Clear previous errors before submitting
    updateDeckMutate(
      { deckId: deck.id, data: dataToSubmit },
      { onSuccess: handleSuccess, onError: handleError } // Pass callbacks here
    );
  };

  // Early return if modal is not open
  if (!isOpen) {
    return null;
  }

  // Determine if the submit button should be disabled
  const isProcessing = isSubmitting || updateIsPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md relative">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Edit Deck
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-4">
            <label
              htmlFor="deck-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Deck Name
            </label>
            <input
              id="deck-name"
              type="text"
              {...register('name')}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.name
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              aria-invalid={errors.name ? 'true' : 'false'}
            />
            {errors.name && (
              <p
                className="mt-1 text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label
              htmlFor="deck-description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Description (Optional)
            </label>
            <textarea
              id="deck-description"
              rows={3}
              {...register('description')}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.description
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              aria-invalid={errors.description ? 'true' : 'false'}
            />
            {errors.description && (
              <p
                className="mt-1 text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {errors.description.message}
              </p>
            )}
          </div>

          {/* API Error Display */}
          {apiError && (
            <div
              className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md dark:bg-red-900 dark:border-red-700 dark:text-red-200"
              role="alert"
            >
              <p className="text-sm">{apiError}</p>
            </div>
          )}
          {/* Display mutation error if not handled by apiError state already */}
          {mutationError && !apiError && (
            <div
              className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md dark:bg-red-900 dark:border-red-700 dark:text-red-200"
              role="alert"
            >
              <p className="text-sm">
                {'message' in mutationError
                  ? mutationError.message
                  : 'An unexpected error occurred during submission.'}
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isProcessing
                  ? 'bg-indigo-400 cursor-not-allowed dark:bg-indigo-700'
                  : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
              }`}
              disabled={isProcessing}
            >
              {isProcessing ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
