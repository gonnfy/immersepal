// src/components/features/CardList.tsx (JSX 再構築・最終確認版)

'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // react-dom からインポート
import { useCards, Card } from '@/hooks/useCards';
import { AiContentType } from '@prisma/client'; // @prisma/client から直接インポート
import { useDeleteCard, Card as CardWithStringDates } from '@/hooks/useCardMutations';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { CardEditModal } from './CardEditModal';
import { useGenerateTts } from '@/hooks/useGenerateTts';
import { SpeakerWaveIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { AppError } from '@/lib/errors';

interface CardListProps {
  deckId: string;
}

// function 宣言形式で定義
export function CardList({ deckId }: CardListProps) {
  const ITEMS_PER_PAGE = 10;
  const [offset, setOffset] = useState(0);

  const { cards, pagination, isLoading, isFetching, error: fetchCardsError } = useCards(deckId, {
    offset: offset,
    limit: ITEMS_PER_PAGE,
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [editingCard, setEditingCard] = useState<CardWithStringDates | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  const deleteCardMutation = useDeleteCard(deckId, {
    onSuccess: (deletedCardId) => { console.log(`Successfully deleted card ${deletedCardId}`); setIsDeleteDialogOpen(false); setCardToDelete(null); },
    onError: (error, deletedCardId) => { console.error(`Failed to delete card ${deletedCardId}:`, error.message); setIsDeleteDialogOpen(false); setCardToDelete(null); alert(`Error deleting card: ${error.message}`); }
 });

  const { mutate: generateTtsMutate, isPending: ttsIsPending } = useGenerateTts({
    onSuccess: (data) => { try { new Audio(data.url).play(); setTtsError(null); } catch (audioError) { console.error("Error playing audio:", audioError); setTtsError("Audio playback failed."); } },
    onError: (error: AppError) => { setTtsError(error.message || 'Failed to generate audio.'); },
  });

  const handleDeleteClick = (cardId: string) => { setCardToDelete(cardId); setIsDeleteDialogOpen(true); };
  const handleConfirmDelete = () => { if (cardToDelete) { deleteCardMutation.mutate({ cardId: cardToDelete }); } };
  const handleEditClick = (card: Card) => {
    const cardForModal: CardWithStringDates = {
       ...card,
       createdAt: String(card.createdAt ?? ''),
       updatedAt: String(card.updatedAt ?? ''),
       nextReviewAt: String(card.nextReviewAt ?? ''),
    };
    setEditingCard(cardForModal);
    setIsEditModalOpen(true);
  };
  // ↓↓↓ handlePlayAudio を修正: language も受け取るようにする ↓↓↓
  const handlePlayAudio = (text: string | null, language: string) => {
    if (ttsIsPending) return;
    if (text && text.trim().length > 0) {
      setTtsError(null);
      // ↓↓↓ mutate に language も渡す ↓↓↓
      generateTtsMutate({ text, language });
    } else {
      setTtsError("No text available to synthesize.");
    }
  };

  if (isLoading) { return <div className="text-center p-4">Loading cards...</div>; }
  if (fetchCardsError) { return <div className="p-4 text-red-600 bg-red-100 border border-red-400 rounded">Error: {fetchCardsError.message}</div>; }

  const hasCards = cards && cards.length > 0;
  const isAnyMutationPending = deleteCardMutation.isPending || ttsIsPending;

  // --- Return Full JSX Structure ---
  return (
    // ★ 全体を単一の div で囲む ★
    <div>
      {/* TTS Error Display */}
      {ttsError && (
        <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700" role="alert">
          Audio Error: {ttsError}
        </div>
      )}

      {/* Card List or No Cards Message */}
      {hasCards ? (
        <ul className="space-y-4">
          {cards.map((card) => (
            <li key={card.id} className="p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700 transition hover:shadow-md">
              <div className="flex justify-between items-start gap-4">
                {/* Card Content Area */}
                <div className="flex-grow">
                  {/* Front + Play Button */}
                  <div className="mb-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">Front</p>
                      <button
                        type="button"
                        // ↓↓↓ onClick で言語コード 'en-US' を渡す (環境変数から取るのが望ましい) ↓↓↓
                           onClick={() => {
                            const lang = process.env.NEXT_PUBLIC_TTS_LANGUAGE_CODE_EN || 'en-US';
                            console.log('>>> CLICK FRONT <<< Passing language:', lang);
                            handlePlayAudio(card.front, lang);
                          }}
                        disabled={isAnyMutationPending || !card.front}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed p-0.5" aria-label="Play front audio" title="Play front audio">
                        {/* isPending ではなく ttsIsPending を使う */}
                        {ttsIsPending && card.front /* Add check if text exists */ ? ( <ArrowPathIcon className="h-4 w-4 animate-spin" /> ) : ( <SpeakerWaveIcon className="h-4 w-4" /> )}
                      </button>
                    </div>
                    <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap mt-1">{card.front}</p>
                  </div>
                  {/* Back + Play Button */}
                  <div className="mb-3">
                     <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">Back</p>
                         <button
                          type="button"
                          // ↓↓↓ onClick で言語コード 'ja-JP' を渡す (環境変数から取るのが望ましい) ↓↓↓
                          onClick={() => {
                            const lang = process.env.NEXT_PUBLIC_TTS_LANGUAGE_CODE_JA || 'ja-JP';
                            console.log('>>> CLICK BACK <<< Passing language:', lang);
                            handlePlayAudio(card.back, lang);
                          }}
                          disabled={isAnyMutationPending || !card.back}
                          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed p-0.5" aria-label="Play back audio" title="Play back audio">
                          {ttsIsPending && card.back /* Add check if text exists */ ? ( <ArrowPathIcon className="h-4 w-4 animate-spin" /> ) : ( <SpeakerWaveIcon className="h-4 w-4" /> )}
                        </button>
                      </div>
                    <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap mt-1">{card.back}</p>
                  </div>
                  {/* AI Content Display */}
                  {card.aiContents && card.aiContents.length > 0 && (
                       <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                         <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">AI Content:</p>
                         <div className="flex flex-wrap gap-1.5">
                           {card.aiContents.map((content) => (
                             <span key={content.id} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200" title={`Type: ${content.contentType}, Lang: ${content.language}`}>
                               {/* AiContentType を使用 */}
                               {content.contentType === AiContentType.EXPLANATION ? 'Expl.' : 'Transl.'} ({content.language})
                             </span>
                           ))}
                         </div>
                       </div>
                   )}
                </div>
                {/* Action Buttons Area */}
                <div className="flex flex-col space-y-2 flex-shrink-0">
                   <button type="button" onClick={() => handleEditClick(card)} disabled={deleteCardMutation.isPending} className="px-2.5 py-1 text-xs font-medium text-center text-yellow-700 bg-yellow-100 rounded hover:bg-yellow-200 focus:ring-4 focus:outline-none focus:ring-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:hover:bg-yellow-800/50 dark:focus:ring-yellow-800 disabled:opacity-50 disabled:cursor-not-allowed"> Edit </button>
                   <button type="button" onClick={() => handleDeleteClick(card.id)} disabled={deleteCardMutation.isPending} className="px-2.5 py-1 text-xs font-medium text-center text-red-700 bg-red-100 rounded hover:bg-red-200 focus:ring-4 focus:outline-none focus:ring-red-300 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-800/50 dark:focus:ring-red-800 disabled:opacity-50 disabled:cursor-not-allowed"> {deleteCardMutation.isPending ? '...' : 'Delete'} </button>
                </div>
              </div>
               {/* SRS Info */}
               <div className="text-right text-xs text-gray-400 dark:text-gray-500 mt-1"> Next: {new Date(card.nextReviewAt).toLocaleDateString()} (I:{card.interval}, EF:{card.easeFactor.toFixed(1)}) </div>
            </li>
          ))}
        </ul>
      ) : (
        // カードがない場合のメッセージ
        <p className="text-gray-500 dark:text-gray-400 text-center py-4">No cards found in this deck yet.</p>
      )}

      {/* Pagination Controls */}
      {/* isMounted と pagination, totalItems のチェック */}
      {isMounted && pagination && pagination.totalItems > ITEMS_PER_PAGE && (
         <div className="mt-6 flex items-center justify-center space-x-4">
            <button onClick={() => setOffset(Math.max(0, offset - ITEMS_PER_PAGE))} disabled={!pagination._links.previous || isFetching} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"> Previous </button>
            <span className="text-sm text-gray-700 dark:text-gray-300"> {`Page ${Math.floor(offset / ITEMS_PER_PAGE) + 1} / ${Math.ceil(pagination.totalItems / ITEMS_PER_PAGE)} (${pagination.totalItems} items)`} </span>
            <button onClick={() => setOffset(offset + ITEMS_PER_PAGE)} disabled={!pagination._links.next || isFetching} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"> Next </button>
        </div>
      )}

      {/* Modals (createPortal を使用) */}
      {/* isMounted チェック */}
      {isMounted && createPortal(
        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen} // onOpenChange を渡す
          onConfirm={handleConfirmDelete}
          title="Delete Card"
          description="Are you sure you want to delete this card? This action cannot be undone." // description prop を使用
          confirmText="Delete"
          cancelText="Cancel" // cancelText prop を追加
          isConfirming={deleteCardMutation.isPending}
        />,
        document.body // body にレンダリング
      )}
      {/* isMounted と editingCard のチェック */}
      {isMounted && editingCard && createPortal(
        <CardEditModal
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen} // onOpenChange を渡す
          card={editingCard}
          deckId={deckId}
          onSuccess={() => { setIsEditModalOpen(false); setEditingCard(null); }}
        />,
        document.body // body にレンダリング
      )}
    </div> // 一番外側の div の閉じタグ
  );
} // function CardList の閉じ括弧