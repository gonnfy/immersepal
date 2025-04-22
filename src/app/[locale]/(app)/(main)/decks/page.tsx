// src/app/[locale]/(app)/(main)/decks/page.tsx (正しいコード)
'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation'; // useParams をインポート
import { useDecks } from '@/hooks/useDecks';
// useCreateDeck はフォームで使うのでここでは不要かも
import { useDeleteDeck } from '@/hooks/useDeckMutations'; // 削除フックをインポート
import { DeckCreateForm } from '@/components/features/DeckCreateForm';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'; // 確認ダイアログをインポート
import { type DeckApiResponse } from '@/types';
import Link from 'next/link'; // ★ Linkをインポート (詳細表示用) ★
import { useAuth } from '@/hooks/useAuth'; // ★ useAuth をインポート (ログイン状態確認用) ★

function DecksPage() {
  const { user: authUser, isLoading: authLoading } = useAuth(); // 認証状態を取得
  const ITEMS_PER_PAGE = 10; // 1ページあたりの表示件数 (定数として定義)
  const [offset, setOffset] = useState(0); // 現在のオフセット (初期値 0)

  // 更新された useDecks フックの呼び出し (修正: data ネストを削除)
  const { decks, pagination, isLoading, isFetching, error } = useDecks({
    offset: offset,
    limit: ITEMS_PER_PAGE,
  });

  const { mutate: deleteDeckMutate, isPending: isDeletingDeck, error: deleteDeckError } = useDeleteDeck();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<DeckApiResponse | null>(null);
  const params = useParams();
  const locale = typeof params?.locale === 'string' && params.locale ? params.locale : 'en';

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

  // スピナーコンポーネント定義 (簡易版)
  const Spinner = () => <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>;

  // 認証状態のローディング中は何も表示しないか、ローディング表示
  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
  }

  // 未認証の場合はログインを促すなど (必要に応じて)
  // if (!authUser) {
  //   return <div>Please log in to view your decks.</div>;
  // }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Decks</h1>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Create New Deck</h2>
        <DeckCreateForm onSuccess={() => console.log('Deck created callback!')} />
      </div>

      <h2 className="text-2xl font-semibold mb-4">Existing Decks</h2>
      {/* ローディング表示 (isFetching を使うとバックグラウンド更新中もわかる) */}
      {(isLoading || isFetching) && !error && (
           <div className="flex justify-center items-center mt-4">
               <Spinner />
               <span className="ml-2">Loading...</span>
           </div>
      )}
      {/* エラー表示 */}
      {error && (
          <div className="text-red-600 mt-4 bg-red-100 border border-red-400 p-4 rounded">
              Error loading decks: {error.message}
          </div>
      )}
      {/* データ表示 */}
      {!isLoading && !error && decks && (
        <>
          {decks.length === 0 && !isFetching && ( // フェッチ中でなければ表示
            <p>You haven't created any decks yet.</p>
          )}
          {decks.length > 0 && (
            <ul className="space-y-3">
              {/* 修正: deck の型を追加 */}
              {decks.map((deck: DeckApiResponse) => (
                <li key={deck.id} className="p-4 border rounded-md shadow-sm bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                  <div className="flex justify-between items-center">
                    <Link href={`/decks/${deck.id}`} className="text-lg font-medium hover:underline">
                      {deck.name}
                    </Link>
                    <div className="space-x-2">
                      <Link href={`/decks/${deck.id}`} className="text-blue-500 hover:underline text-sm">View</Link>
                      <button className="text-yellow-500 hover:underline text-sm disabled:opacity-50" disabled>Edit</button>
                      <button
                        className="text-red-500 hover:underline text-sm disabled:opacity-50"
                        onClick={() => handleDeleteClick(deck)}
                        disabled={isDeletingDeck || isFetching} // データ取得中も無効化
                      >
                        {isDeletingDeck && deckToDelete?.id === deck.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  {deck.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{deck.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* ページネーションコントロール */}
      {!isLoading && !error && pagination && pagination.totalItems > 0 && (
        <div className="mt-6 flex items-center justify-center space-x-4">
          {/* Previous Button */}
          <button
            onClick={() => setOffset(Math.max(0, offset - ITEMS_PER_PAGE))}
            disabled={!pagination._links.previous || isFetching} // 前のページがないか、データ取得中は無効
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Previous
          </button>

          {/* Page Info */}
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {`Showing ${offset + 1} - ${Math.min(pagination.totalItems, offset + ITEMS_PER_PAGE)} of ${pagination.totalItems}`}
          </span>

          {/* Next Button */}
          <button
            onClick={() => setOffset(offset + ITEMS_PER_PAGE)}
            disabled={!pagination._links.next || isFetching} // 次のページがないか、データ取得中は無効
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      )}

      {/* 確認ダイアログ */}
      {deckToDelete && (
        <ConfirmationDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmDelete}
          title="Delete Deck"
          description={`Are you sure you want to delete "${deckToDelete.name}"? This cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          isConfirming={isDeletingDeck && deckToDelete?.id === deckToDelete.id} // 削除対象の時だけ isConfirming を true に
        />
      )}

      {/* 削除エラー表示 (任意) */}
      {deleteDeckError && (
         <div className="text-red-600 mt-4">
           Error deleting deck: {deleteDeckError.message}
         </div>
      )}
    </div>
  );
}

// ★★★ 必ずデフォルトエクスポートする ★★★
export default DecksPage;