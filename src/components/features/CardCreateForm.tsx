"use client"; // Add this directive

import React from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// Removed Tamagui imports
import { useCreateCard } from '@/hooks/useCardMutations';
import { useTranslations } from 'next-intl'; // Use the correct client hook

// Validation schema for the form
const cardSchema = z.object({
  front: z.string().min(1, 'Front text cannot be empty'),
  back: z.string().min(1, 'Back text cannot be empty'),
});

type CardFormData = z.infer<typeof cardSchema>;

interface CardCreateFormProps {
  deckId: string;
  onCardCreated?: () => void; // Optional callback after successful creation
}

export const CardCreateForm: React.FC<CardCreateFormProps> = ({ deckId, onCardCreated }) => {
  const t = useTranslations('cardCreateForm'); // Use the correct hook
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      front: '',
      back: '',
    },
  });

  const { mutate: createCard, isPending, error } = useCreateCard(deckId, {
    onSuccess: () => {
      console.log('Card created, resetting form.');
      reset(); // Reset form fields
      onCardCreated?.(); // Call optional callback
      // Optionally show a success toast/message
    },
    onError: (err) => {
      console.error('Card creation failed:', err);
      // Optionally show an error toast/message
    },
  });

  const onSubmit: SubmitHandler<CardFormData> = (data) => {
    console.log('Submitting new card:', data);
    createCard(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Front Input */}
      <div className="space-y-1"> {/* Replaced YStack */}
        <label htmlFor="front" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t ? t('frontLabel') : 'Front'} <span className="text-red-500">*</span>
        </label>
        <Controller
          name="front"
          control={control}
          render={({ field }) => (
            <textarea
              id="front"
              placeholder={t ? t('frontPlaceholder') : 'Enter front text...'}
              {...field}
              rows={3}
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.front ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
              aria-invalid={errors.front ? 'true' : 'false'}
            />
          )}
        />
        {errors.front && (
          <p className="mt-1 text-sm text-red-600" role="alert"> {/* Replaced Paragraph */}
            {errors.front.message}
          </p>
        )}
      </div>

      {/* Back Input */}
      <div className="space-y-1"> {/* Replaced YStack */}
        <label htmlFor="back" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t ? t('backLabel') : 'Back'} <span className="text-red-500">*</span>
        </label>
        <Controller
          name="back"
          control={control}
          render={({ field }) => (
            <textarea
              id="back"
              placeholder={t ? t('backPlaceholder') : 'Enter back text...'}
              {...field}
              rows={3}
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.back ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
              aria-invalid={errors.back ? 'true' : 'false'}
            />
          )}
        />
        {errors.back && (
          <p className="mt-1 text-sm text-red-600" role="alert"> {/* Replaced Paragraph */}
            {errors.back.message}
          </p>
        )}
      </div>

      {/* API Error Message */}
      {error && (
        <div className="mt-2 p-2 border border-red-300 bg-red-50 dark:bg-red-900/30 rounded-md" role="alert">
          <p className="text-sm text-red-700 dark:text-red-300"> {/* Replaced Paragraph */}
            {t ? t('creationError', { message: error.message }) : `Error: ${error.message}`}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <div> {/* Wrapper div */}
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* Replaced Spinner with text */}
          {isPending ? (t ? t('creatingButton') : 'Creating...') : (t ? t('createButton') : 'Add Card')}
        </button>
      </div>
    </form>
  );
};