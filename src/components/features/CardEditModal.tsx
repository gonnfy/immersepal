'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cardUpdateSchema, CardUpdatePayload } from '@/lib/zod';
import { useUpdateCard, Card } from '@/hooks/useCardMutations'; // Assuming Card type is exported here
import { AppError } from '@/lib/errors';

interface CardEditModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  card: Card | null;
  deckId: string;
  onSuccess?: () => void;
}

export const CardEditModal: React.FC<CardEditModalProps> = ({
  isOpen,
  onOpenChange,
  card,
  deckId,
  onSuccess,
}) => {
  const [apiError, setApiError] = useState<string | null>(null);

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

  // Reset form when card prop changes
  useEffect(() => {
    if (card) {
      reset({
        front: card.front,
        back: card.back,
      });
      setApiError(null); // Clear previous errors when a new card is loaded
    } else {
      // Reset to empty if card becomes null (e.g., modal closed and reopened without a card)
      reset({ front: '', back: '' });
      setApiError(null);
    }
  }, [card, reset]);

  const handleSuccess = (updatedCard: Card) => {
    console.log('Card updated successfully:', updatedCard);
    setApiError(null);
    onSuccess?.(); // Call external success handler if provided
    onOpenChange(false); // Close modal on success
  };

  const handleError = (error: AppError) => {
    console.error('Error updating card:', error);
    setApiError(error.message || 'An unexpected error occurred.');
    // Optionally, handle specific error codes from error.errorCode
  };

  const { mutate, isPending } = useUpdateCard(deckId, {
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const onSubmit: SubmitHandler<CardUpdatePayload> = (data) => {
    if (!card) {
      console.error('Cannot submit: No card selected for editing.');
      setApiError('Cannot submit: No card selected for editing.');
      return;
    }
    setApiError(null); // Clear previous API errors before submitting
    console.log('Submitting update for card:', card.id, 'with data:', data);
    mutate({ cardId: card.id, data });
  };

  const handleClose = () => {
    onOpenChange(false);
    // Optionally reset form here if desired when closing via cancel/overlay
    // reset({ front: card?.front || '', back: card?.back || '' });
    setApiError(null); // Clear errors on close
  };

  if (!isOpen || !card) {
    return null; // Don't render anything if not open or no card
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleClose} // Close on overlay click
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal content
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
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                errors.front ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              aria-invalid={errors.front ? 'true' : 'false'}
            />
            {errors.front && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
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
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                errors.back ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              aria-invalid={errors.back ? 'true' : 'false'}
            />
            {errors.back && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.back.message}
              </p>
            )}
          </div>

          {/* Display API Error */}
          {apiError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md dark:bg-red-900 dark:border-red-700 dark:text-red-200" role="alert">
              <p className="text-sm">{apiError}</p>
            </div>
          )}
          {/* Display general form error from refine */}
           {errors.root && ( // Check for root errors if using refine on the schema object itself
             <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md dark:bg-red-900 dark:border-red-700 dark:text-red-200" role="alert">
               <p className="text-sm">{errors.root.message}</p>
             </div>
           )}


          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500"
              disabled={isPending || isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isPending || isSubmitting}
            >
              {isPending || isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};