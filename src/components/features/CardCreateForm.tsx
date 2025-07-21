"use client";

import React, { useState } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cardCreateSchema } from "@/lib/zod";
import { useCreateCard } from "@/hooks/useCardMutations";
import { ApiError } from "@/hooks/useDeckMutations";
import { useTranslations } from "next-intl";
import { useTranslateText } from "@/hooks/useTranslateText";

type CardFormData = z.infer<typeof cardCreateSchema>;

interface CardCreateFormProps {
  deckId: string;
  onCardCreated?: () => void;
}

export const CardCreateForm: React.FC<CardCreateFormProps> = ({
  deckId,
  onCardCreated,
}) => {
  const t = useTranslations("cardCreateForm");
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    getValues,
    watch,
  } = useForm<CardFormData>({
    resolver: zodResolver(cardCreateSchema),
    defaultValues: { front: "", back: "" },
  });

  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const { mutate: translateText, isPending: translateIsPending } =
    useTranslateText({
      onSuccess: (data) => {
        console.log("Translation successful:", data.translation);
        setValue("back", data.translation, {
          shouldValidate: true,
          shouldDirty: true,
        });
        setIsTranslating(false);
        setTranslationError(null);
      },
      onError: (error) => {
        console.error("Translation failed:", error);
        setTranslationError(
          error.message || "Translation failed. Please try again.",
        );
        setIsTranslating(false);
      },
    });

  const {
    mutate: createCard,
    isPending: createIsPending,
    error: createError,
  } = useCreateCard(deckId, {
    onSuccess: () => {
      console.log("Card created, resetting form.");
      reset();
      setTranslationError(null);
      onCardCreated?.();
    },
    onError: (err) => {
      console.error("Card creation failed:", err);
    },
  });

  const watchedFront = watch("front");

  const onSubmit: SubmitHandler<CardFormData> = (data) => {
    createCard(data);
  };

  // Zodのエラー詳細を保持するための型を定義
  type FieldErrors = {
    [key: string]: string[] | undefined;
  };

  // APIエラーから特定フィールドのエラーメッセージを取得するヘルパー
  const getApiError = (fieldName: "front" | "back"): string | undefined => {
    if (createError && createError instanceof ApiError && createError.details) {
      const details = createError.details as { fieldErrors?: FieldErrors };
      return details.fieldErrors?.[fieldName]?.[0];
    }
    return undefined;
  };

  const apiFrontError = getApiError("front");
  const apiBackError = getApiError("back");

  const handleTranslateClick = () => {
    const frontValue = getValues("front");
    if (frontValue && frontValue.trim().length > 0) {
      setTranslationError(null);
      setIsTranslating(true);
      translateText({
        text: frontValue,
        sourceLanguage: "en",
        targetLanguage: "ja",
      });
    } else {
      setTranslationError("Front に翻訳するテキストを入力してください。");
    }
  };

  const isPending = createIsPending || isTranslating || translateIsPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Front Input */}
      <div className="space-y-1">
        <label
          htmlFor="front"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {t?.("frontLabel") || "Front"} <span className="text-red-500">*</span>
        </label>
        <Controller
          name="front"
          control={control}
          render={({ field }) => (
            <textarea
              id="front"
              placeholder={
                t?.("frontPlaceholder") || "Enter front text (English)..."
              }
              {...field}
              rows={3}
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.front
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60`} // disabled スタイル追加
              aria-invalid={errors.front ? "true" : "false"}
              disabled={isPending}
            />
          )}
        />
        {errors.front && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.front?.message}
          </p>
        )}
        {apiFrontError && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {apiFrontError}
          </p>
        )}

        <div className="pt-1 text-right">
          <button
            type="button"
            onClick={handleTranslateClick}
            disabled={isPending || !watchedFront}
            className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTranslating || translateIsPending
              ? "翻訳中..."
              : `Translate to ${t?.("backLabel") || "Back"} (JA)`}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label
            htmlFor="back"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t?.("backLabel") || "Back"} <span className="text-red-500">*</span>
          </label>
        </div>
        <Controller
          name="back"
          control={control}
          render={({ field }) => (
            <textarea
              id="back"
              placeholder={
                t?.("backPlaceholder") ||
                "Enter back text (Japanese)... or click translate"
              }
              {...field}
              rows={3}
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.back
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60`}
              aria-invalid={errors.back ? "true" : "false"}
              disabled={isPending}
            />
          )}
        />
        {translationError && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {" "}
            {translationError}{" "}
          </p>
        )}
        {errors.back && !translationError && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.back?.message}
          </p>
        )}
        {apiBackError && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {apiBackError}
          </p>
        )}
      </div>

      {createError && !apiFrontError && !apiBackError && (
        <div
          className="mt-2 p-2 border border-red-300 bg-red-50 dark:bg-red-900/30 rounded-md"
          role="alert"
        >
          <p className="text-sm text-red-700 dark:text-red-300">
            {t?.("creationError", { message: createError.message }) ||
              `Error creating card: ${createError.message}`}
          </p>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createIsPending
            ? t?.("creatingButton") || "Creating..."
            : t?.("createButton") || "Add Card"}
        </button>
      </div>
    </form>
  );
};
