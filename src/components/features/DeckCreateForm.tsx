'use client';

import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { deckCreateSchema, type DeckCreatePayload } from '@/lib/zod';
import { useCreateDeck, ApiError } from '@/hooks/useDeckMutations'; // Import ApiError
import { AuthError } from '@supabase/supabase-js'; // Import AuthError if needed for specific handling

interface DeckCreateFormProps {
  /** Optional callback function triggered on successful deck creation. */
  onSuccess?: () => void;
}

export const DeckCreateForm: React.FC<DeckCreateFormProps> = ({ onSuccess }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DeckCreatePayload>({
    resolver: zodResolver(deckCreateSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const { mutate, isPending, error } = useCreateDeck();

  const onSubmit: SubmitHandler<DeckCreatePayload> = (data) => {
    const payload = {
      ...data,
      description: data.description === '' ? null : data.description,
    };
    mutate(payload, {
      onSuccess: () => {
        reset();
        onSuccess?.();
      },
      onError: (err) => {
        console.error("Form submission error:", err);
      }
    });
  };

  let errorMessage: string | null = null;
  if (error) {
    if (error instanceof ApiError) {
      errorMessage = `Error: ${error.message} (Status: ${error.status})`;
      // Safely access the machine-readable code from the details property
      if (typeof error.details === 'object' && error.details !== null && 'error' in error.details) {
        // Now we know error.details is an object with an 'error' property
        // We might still want to check the type of error.details.error if needed
        const errorCode = (error.details as { error?: unknown }).error; // Cast to access
        if (errorCode) { // Check if errorCode is truthy
             errorMessage += ` [Code: ${errorCode}]`;
        }
      }
    } else if (error instanceof AuthError) {
        errorMessage = `Authentication Error: ${error.message}`;
    } else {
      errorMessage = 'An unexpected error occurred.';
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="deck-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Deck Name <span className="text-red-500">*</span>
        </label>
        <input
          id="deck-name"
          type="text"
          {...register('name')}
          className={`mt-1 block w-full px-3 py-2 border ${
            errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
          aria-invalid={errors.name ? 'true' : 'false'}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="deck-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description (Optional)
        </label>
        <textarea
          id="deck-description"
          {...register('description')}
          rows={3}
          className={`mt-1 block w-full px-3 py-2 border ${
            errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
          aria-invalid={errors.description ? 'true' : 'false'}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Display API Error Message */}
      {errorMessage && (
        <div className="mt-2 p-2 border border-red-300 bg-red-50 dark:bg-red-900/30 rounded-md" role="alert">
          <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? '作成中...' : 'Create Deck'}
        </button>
      </div>
    </form>
  );
};