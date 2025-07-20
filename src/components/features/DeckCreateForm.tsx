"use client";

import React, { useState } from "react";
import { useCreateDeck } from "@/hooks/useDeckMutations";
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
      className="space-y-4 p-4 border rounded-lg bg-gray-50"
    >
      <div>
        <label
          htmlFor="deck-name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t("deckNameLabel")}
        </label>
        <input
          id="deck-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("deckNamePlaceholder")}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label
          htmlFor="deck-description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t("descriptionLabel")}
        </label>
        <textarea
          id="deck-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error.message}</p>}

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
