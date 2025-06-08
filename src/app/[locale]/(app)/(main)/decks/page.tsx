// src/app/[locale]/(app)/(main)/decks/page.tsx (エラーハンドリング表示強化 + フォーマット修正版)
"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDecks } from "@/hooks/useDecks";
import { useDeleteDeck } from "@/hooks/useDeckMutations";
import { DeckCreateForm } from "@/components/features/DeckCreateForm";
import { DeckEditModal } from "@/components/features/DeckEditModal";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { type DeckApiResponse } from "@/types"; // Import types
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

function DecksPage() {
  const { isLoading: authLoading } = useAuth(); // user も取得しておく (デバッグ用ログなど)

  const ITEMS_PER_PAGE = 10;
  const [offset, setOffset] = useState(0);

  // useDecks フック: デッキ一覧を取得
  const {
    decks,
    pagination,
    isLoading: decksIsLoading, // 初期ロード中か
    isFetching: decksIsFetching, // データ取得中か (ページ移動時など)
    error: decksError, // デッキ取得時のエラー
  } = useDecks({
    offset: offset,
    limit: ITEMS_PER_PAGE,
  });

  // useDeleteDeck フック: デッキ削除処理
  const {
    mutate: deleteDeckMutate,
    isPending: isDeletingDeck, // 削除処理中か
    error: deleteDeckError, // デッキ削除時のエラー
  } = useDeleteDeck();

  // --- Component State ---
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<DeckApiResponse | null>(
    null,
  );
  const [editingDeck, setEditingDeck] = useState<DeckApiResponse | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // Portal 用

  // Portal マウント用 Effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // --- Event Handlers ---
  const handleDeleteClick = (deck: DeckApiResponse) => {
    setDeckToDelete(deck);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deckToDelete) {
      deleteDeckMutate({ deckId: deckToDelete.id });
      setIsConfirmOpen(false);
      setDeckToDelete(null);
    }
  };

  const handleEditClick = (deck: DeckApiResponse) => {
    setEditingDeck(deck);
    setIsEditModalOpen(true);
  };

  // --- Helper Components ---
  const Spinner = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
  );

  // --- Render Logic ---

  // 全体のローディング状態 (認証情報ロード中 または 初回デッキデータロード中)
  const isLoading = authLoading || (decksIsLoading && !pagination); // pagination がまだ無い場合を初回ロードとする

  // 初回ロード中はスピナー表示
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  }

  // ★ デッキ取得エラーが発生した場合の表示 ★
  if (!decksIsLoading && decksError) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-red-600">
          Error Loading Decks
        </h1>
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Failed to load your decks.</strong>
          <span className="block sm:inline ml-2">
            {decksError instanceof Error
              ? decksError.message
              : "An unknown error occurred."}
          </span>
          <p className="text-sm mt-2">
            Please try refreshing the page. If the problem persists, contact
            support.
          </p>
          {/* 認証エラー(401)や権限エラー(403)の場合、ログインページへのリンクなどを追加しても良い */}
        </div>
      </div>
    );
  }

  // 正常系のレンダリング
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Decks</h1>
      {/* デバッグ用: ログインユーザーID表示 */}
      {/* <p className="text-xs text-gray-500 mb-4">Logged in as: {user?.id ?? 'No user'}</p> */}

      {/* デッキ作成フォーム */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Create New Deck</h2>
        <DeckCreateForm
          onSuccess={() => console.log("Deck created callback!")}
        />
      </div>

      <h2 className="text-2xl font-semibold mb-4">Existing Decks</h2>

      {/* デッキ一覧 */}
      {decks && ( // decks が存在する（エラーではない）場合
        <>
          {decks.length === 0 &&
            offset === 0 &&
            !decksIsFetching && ( // 初回ロードでデッキがない場合
              <p className="text-gray-500 dark:text-gray-400">
                You haven&apos;t created any decks yet.
              </p>
            )}
          {decks.length > 0 && ( // デッキが存在する場合
            <ul className="space-y-3 mb-6">
              {decks.map((deck: DeckApiResponse) => (
                <li
                  key={deck.id}
                  className="p-4 border rounded-md shadow-sm bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  <div className="flex justify-between items-center">
                    <Link
                      href={`/decks/${deck.id}`}
                      className="text-lg font-medium hover:underline"
                    >
                      {deck.name}
                    </Link>
                    <div className="space-x-2 flex-shrink-0">
                      <Link
                        href={`/decks/${deck.id}`}
                        className="text-blue-500 hover:underline text-sm"
                      >
                        View
                      </Link>
                      <button
                        type="button" // Ensure type="button"
                        className="text-yellow-500 hover:underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleEditClick(deck)}
                        disabled={isDeletingDeck || decksIsFetching} // データ取得中や削除中も無効化
                      >
                        Edit
                      </button>
                      <button
                        type="button" // Ensure type="button"
                        className="text-red-500 hover:underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleDeleteClick(deck)}
                        disabled={isDeletingDeck || decksIsFetching} // データ取得中や他の削除処理中も無効化
                      >
                        {isDeletingDeck && deckToDelete?.id === deck.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                  {deck.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {deck.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Cards: {deck.cardCount ?? 0}
                  </p>{" "}
                  {/* カード数表示 */}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* データ取得中のスピナー表示 (初回ロード後) */}
      {decksIsFetching && !decksIsLoading && (
        <div className="flex justify-center items-center mt-4">
          <Spinner /> <span className="ml-2">Loading decks...</span>
        </div>
      )}

      {/* ページネーション */}
      {!isLoading &&
        !decksError &&
        pagination &&
        pagination.totalItems > ITEMS_PER_PAGE && (
          <div className="mt-6 flex items-center justify-center space-x-4">
            <button
              type="button" // Ensure type="button"
              onClick={() => setOffset(Math.max(0, offset - ITEMS_PER_PAGE))}
              disabled={
                !pagination._links.previous || decksIsFetching || isDeletingDeck
              } // 条件追加
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {`Showing ${pagination.totalItems > 0 ? offset + 1 : 0} - ${Math.min(pagination.totalItems, offset + ITEMS_PER_PAGE)} of ${pagination.totalItems}`}
            </span>
            <button
              type="button" // Ensure type="button"
              onClick={() => setOffset(offset + ITEMS_PER_PAGE)}
              disabled={
                !pagination._links.next || decksIsFetching || isDeletingDeck
              } // 条件追加
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        )}

      {/* ★ デッキ削除エラー表示 ★ */}
      {deleteDeckError && (
        <div
          className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md"
          role="alert"
        >
          <p className="font-semibold">Error Deleting Deck</p>
          <p>{deleteDeckError.message}</p>
          {/* 必要なら詳細情報を表示 */}
        </div>
      )}

      {/* --- Modals (変更なし) --- */}
      {isMounted &&
        deckToDelete &&
        createPortal(
          <ConfirmationDialog
            isOpen={isConfirmOpen}
            onOpenChange={setIsConfirmOpen}
            onConfirm={handleConfirmDelete}
            title="Delete Deck"
            description={`Are you sure you want to delete "${deckToDelete.name}"? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            isConfirming={isDeletingDeck}
          />,
          document.body,
        )}
      {isMounted &&
        editingDeck &&
        createPortal(
          <DeckEditModal
            isOpen={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            deck={editingDeck}
            onSuccess={() => {
              setIsEditModalOpen(false);
              setEditingDeck(null);
              console.log("Deck update successful, modal closed.");
            }}
          />,
          document.body,
        )}
    </div>
  );
}

export default DecksPage;
