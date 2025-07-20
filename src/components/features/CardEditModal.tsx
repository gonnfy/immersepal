"use client";

import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cardUpdateSchema, CardUpdatePayload } from "@/lib/zod";
import { useUpdateCard, Card } from "@/hooks/useCardMutations";
import { AppError, isAppError } from "@/lib/errors";
import { useTranslateText } from "@/hooks/useTranslateText";

interface CardEditModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  card: Card | null;
  deckId: string;
  onSuccess?: (updatedCard: Card) => void;
}

export const CardEditModal: React.FC<CardEditModalProps> = ({
  isOpen,
  onOpenChange,
  card,
  deckId,
  onSuccess,
}) => {
  const [apiError, setApiError] = useState<AppError | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CardUpdatePayload>({
    resolver: zodResolver(cardUpdateSchema),
    defaultValues: {
      front: "",
      back: "",
    },
  });

  const watchedFront = watch("front");

  const { mutate: translateText, isPending: translateIsPending } =
    useTranslateText({
      onSuccess: (data) => {
        setValue("back", data.translation, {
          shouldValidate: true,
          shouldDirty: true,
        });
        setTranslationError(null);
      },
      onError: (error) => {
        setTranslationError(
          error.message || "Translation failed. Please try again.",
        );
      },
    });

  const updateCardMutation = useUpdateCard(deckId, {
    onSuccess: (updatedCard) => {
      console.log("Card updated successfully:", updatedCard);
      setApiError(null);
      onSuccess?.(updatedCard);
      onOpenChange(false);
    },
    onError: (error) => {
      console.error(`Error updating card:`, error);
      setApiError(error);
    },
  });

  useEffect(() => {
    if (isOpen) {
      setApiError(null);
      setTranslationError(null);
      if (card) {
        reset({ front: card.front, back: card.back });
      } else {
        reset({ front: "", back: "" });
      }
    }
  }, [isOpen, card, reset]);

  const onSubmit: SubmitHandler<CardUpdatePayload> = (data) => {
    if (!card) {
      setApiError(
        new AppError("No card selected for editing.", 400, "VALIDATION_ERROR"),
      );
      return;
    }
    setApiError(null);
    updateCardMutation.mutate({ cardId: card.id, data });
  };

  const handleTranslateClick = () => {
    const frontValue = getValues("front");
    if (frontValue && frontValue.trim().length > 0) {
      setTranslationError(null);
      translateText({
        text: frontValue,
        sourceLanguage: "en",
        targetLanguage: "ja",
      });
    } else {
      setTranslationError("Front text is required to translate.");
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const isPending =
    updateCardMutation.isPending || isSubmitting || translateIsPending;

  const detailsString =
    apiError && isAppError(apiError) && apiError.details
      ? JSON.stringify(apiError.details, null, 2)
      : null;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl relative">
        <button
          onClick={handleCancel}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Edit Card
        </h2>
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="front"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Front
            </label>
            <textarea
              id="front"
              {...register("front")}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              aria-invalid={errors.front ? "true" : "false"}
            />
            {errors.front && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.front.message}
              </p>
            )}
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={handleTranslateClick}
              disabled={isPending || !watchedFront}
              className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {translateIsPending ? "Translating..." : "Translate to Back"}
            </button>
          </div>

          <div>
            <label
              htmlFor="back"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Back
            </label>
            <textarea
              id="back"
              {...register("back")}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              aria-invalid={errors.back ? "true" : "false"}
            />
            {errors.back && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.back.message}
              </p>
            )}
            {translationError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {translationError}
              </p>
            )}
          </div>

          {apiError && (
            <div
              className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900 dark:border-red-700 dark:text-red-200"
              role="alert"
            >
              <p className="font-semibold">Error Updating Card</p>
              <p>{apiError.message}</p>
              {detailsString && (
                <pre className="mt-2 text-xs overflow-auto">
                  {detailsString}
                </pre>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
