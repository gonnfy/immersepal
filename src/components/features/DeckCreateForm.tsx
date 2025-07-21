"use client";

import React, { useState } from "react";
import { useCreateDeck, ApiError } from "@/hooks/useDeckMutations";
import { useTranslations } from "next-intl";

const Spinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

interface DeckCreateFormProps {
  onSuccess?: () => void;
}

export const DeckCreateForm: React.FC<DeckCreateFormProps> = ({
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const t = useTranslations("DeckCreateForm");
  const { mutate, isPending, error } = useCreateDeck();

  // Zodのエラー詳細を保持するための型を定義
  type FieldErrors = {
    [key: string]: string[] | undefined;
  };

  // エラー詳細を取得
  const getFieldError = (fieldName: string): string | undefined => {
    if (error && error instanceof ApiError && error.details) {
      const details = error.details as { fieldErrors?: FieldErrors };
      return details.fieldErrors?.[fieldName]?.[0];
    }
    return undefined;
  };

  const nameError = getFieldError("name");
  const descriptionError = getFieldError("description");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name || isPending) return;

    const payload = {
      name,
      description: description === "" ? null : description,
    };

    mutate(payload, {
      onSuccess: () => {
        setName("");
        setDescription("");
        onSuccess?.();
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
    >
      <div>
        <label
          htmlFor="deck-name"
          className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
        >
          {t("deckNameLabel")}
        </label>
        <input
          id="deck-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("deckNamePlaceholder")}
          className={`w-full p-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
            nameError
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          } dark:bg-gray-800 dark:text-white`}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? "deck-name-error" : undefined}
        />
        {nameError && (
          <p id="deck-name-error" className="text-red-600 text-sm mt-1">
            {nameError}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="deck-description"
          className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
        >
          {t("descriptionLabel")}
        </label>
        <textarea
          id="deck-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          className={`w-full p-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
            descriptionError
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          } dark:bg-gray-800 dark:text-white`}
          aria-invalid={!!descriptionError}
          aria-describedby={
            descriptionError ? "deck-description-error" : undefined
          }
        />
        {descriptionError && (
          <p id="deck-description-error" className="text-red-600 text-sm mt-1">
            {descriptionError}
          </p>
        )}
      </div>

      {error && !nameError && !descriptionError && (
        <p className="text-red-600 text-sm">{error.message}</p>
      )}

      <button
        type="submit"
        className="w-full flex justify-center items-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
        disabled={isPending || !name}
      >
        {isPending ? <Spinner /> : t("createButton")}
      </button>
    </form>
  );
};
