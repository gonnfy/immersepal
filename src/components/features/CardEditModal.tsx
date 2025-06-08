'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cardUpdateSchema, CardUpdatePayload } from '@/lib/zod';
import { useUpdateCard, Card } from '@/hooks/useCardMutations'; // Use Card type from mutations (string dates)
import { AppError, isAppError } from '@/lib/errors';

interface CardEditModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  card: Card | null; // Expects Card with string dates
  deckId: string;
  onSuccess?: (updatedCard: Card) => void; // Callback on successful update
}

export const CardEditModal: React.FC<CardEditModalProps> = ({
  isOpen,
  onOpenChange,
  card,
  deckId,
  onSuccess,
}) => {
  const [apiError, setApiError] = useState<AppError | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CardUpdatePayload>({
    resolver: zodResolver(cardUpdateSchema),
    defaultValues: {
      front: '',
      back: '',
    },
  });

  const updateCardMutation = useUpdateCard(deckId, {
    onSuccess: (updatedCard) => {
      // Remove unused variables parameter
      console.log('Card updated successfully:', updatedCard);
      setApiError(null);
      onSuccess?.(updatedCard); // Call the prop onSuccess
      onOpenChange(false); // Close modal
    },
    onError: (error) => {
      // Remove unused _variables parameter
      // Use error directly
      console.error(`Error updating card:`, error);
      setApiError(error);
    },
  });

  // Effect to handle modal display state and reset form
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      setApiError(null); // Clear previous API errors when opening
      if (card) {
        // Reset form with current card data when modal opens or card changes
        reset({ front: card.front, back: card.back });
      } else {
        // Reset to empty if no card is provided (should ideally not happen if opened correctly)
        reset({ front: '', back: '' });
      }
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
        // Optionally reset form when closing, though reset on open might be sufficient
        // reset({ front: '', back: '' });
      }
    }
  }, [isOpen, card, reset]);

  // Effect to handle closing via Escape key or backdrop click
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onOpenChange(false);
      setApiError(null); // Clear API error on close
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (event.target === dialog) {
        handleClose();
      }
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('click', handleClickOutside);

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('click', handleClickOutside);
    };
  }, [onOpenChange]);

  const onSubmit: SubmitHandler<CardUpdatePayload> = (data) => {
    if (!card) {
      console.error('Attempted to submit edit form without a card.');
      setApiError(
        new AppError('No card selected for editing.', 400, 'VALIDATION_ERROR')
      );
      return;
    }
    setApiError(null); // Clear previous API error before new submission
    console.log('Submitting card update:', { cardId: card.id, data });
    updateCardMutation.mutate({ cardId: card.id, data });
  };

  const handleCancel = () => {
    onOpenChange(false);
    setApiError(null); // Clear API error on cancel
  };

  const isPending = updateCardMutation.isPending || isSubmitting;

  // Stringify details outside JSX to satisfy TypeScript
  const detailsString =
    apiError && isAppError(apiError) && apiError.details
      ? JSON.stringify(apiError.details, null, 2)
      : null;

  return (
    <dialog
      ref={dialogRef}
      className="p-6 rounded-lg shadow-xl bg-white dark:bg-gray-800 w-full max-w-md backdrop:bg-black backdrop:opacity-50"
    >
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Edit Card
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <label
            htmlFor="front"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Front
          </label>
          <textarea
            id="front"
            {...register('front')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
            aria-invalid={errors.front ? 'true' : 'false'}
          />
          {errors.front && (
            <p
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {errors.front.message}
            </p>
          )}
        </div>

        <div className="mb-6">
          <label
            htmlFor="back"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Back
          </label>
          <textarea
            id="back"
            {...register('back')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
            aria-invalid={errors.back ? 'true' : 'false'}
          />
          {errors.back && (
            <p
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {errors.back.message}
            </p>
          )}
        </div>

        {/* Display API Error */}
        {apiError && (
          <div
            className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900 dark:border-red-700 dark:text-red-200"
            role="alert"
          >
            <p className="font-semibold">Error Updating Card</p>
            <p>{apiError.message}</p>
            {detailsString && (
              <pre className="mt-2 text-xs overflow-auto">{detailsString}</pre>
            )}
          </div>
        )}
        {/* Display Zod refine error */}
        {errors.root && ( // Check for root errors from refine
          <p
            className="mt-1 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {errors.root.message}
          </p>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500 dark:focus:ring-offset-gray-800"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800"
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </dialog>
  );
};
