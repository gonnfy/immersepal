// src/components/features/CardCreateForm.tsx (手動翻訳ボタン版)

"use client";

import React, { useState } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateCard } from '@/hooks/useCardMutations';
import { useTranslations } from 'next-intl';
import { useTranslateText } from '@/hooks/useTranslateText'; // 作成済みのフックをインポート
// AppError はこのファイルでは直接使わないのでインポート不要

// Validation schema (変更なし)
const cardSchema = z.object({
  front: z.string().min(1, 'Front text cannot be empty'),
  back: z.string().min(1, 'Back text cannot be empty'),
});
type CardFormData = z.infer<typeof cardSchema>;

interface CardCreateFormProps {
  deckId: string;
  onCardCreated?: () => void;
}

export const CardCreateForm: React.FC<CardCreateFormProps> = ({ deckId, onCardCreated }) => {
  const t = useTranslations('cardCreateForm'); // i18n用 (必要なら)
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setValue, // Backフィールド更新用
    getValues, 
    watch
  } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: { front: '', back: '' },
  });

  // --- 翻訳関連の State ---
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // --- 翻訳実行フック ---
  const { mutate: translateText, isPending: translateIsPending } = useTranslateText({
    onSuccess: (data) => {
      console.log('Translation successful:', data.translation);
      // 翻訳結果を Back フィールドにセット
      setValue('back', data.translation, { shouldValidate: true, shouldDirty: true });
      setIsTranslating(false);
      setTranslationError(null); // エラーをクリア
    },
    onError: (error) => {
      console.error('Translation failed:', error);
      setTranslationError(error.message || 'Translation failed. Please try again.');
      setIsTranslating(false);
    },
  });

  // --- カード作成フック (変更なし) ---
  const { mutate: createCard, isPending: createIsPending, error: createError } = useCreateCard(deckId, {
    onSuccess: () => {
      console.log('Card created, resetting form.');
      reset(); // フォームをリセット
      setTranslationError(null); // 翻訳エラーもクリア
      onCardCreated?.(); // 親コンポーネントへの通知
    },
    onError: (err) => { console.error('Card creation failed:', err); },
  });
   
  const watchedFront = watch('front');

  // --- イベントハンドラ ---
  const onSubmit: SubmitHandler<CardFormData> = (data) => {
    createCard(data);
  };

  // ★ 手動翻訳ボタンのクリックハンドラ ★
  const handleTranslateClick = () => {
    const frontValue = getValues('front'); // Front の現在の値を取得
    if (frontValue && frontValue.trim().length > 0) {
      setTranslationError(null); // 前のエラーをクリア
      setIsTranslating(true); // ローディング開始
      // 翻訳を実行 (言語はハードコード)
      translateText({
        text: frontValue,
        sourceLanguage: 'en', // Front は英語と仮定
        targetLanguage: 'ja', // Back は日本語と仮定
      });
    } else {
      // Front が空の場合のフィードバック (任意)
      setTranslationError('Front に翻訳するテキストを入力してください。');
    }
  };

  // 全体の処理中状態 (カード作成中 or 翻訳API呼び出し中)
  const isPending = createIsPending || isTranslating || translateIsPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Front Input */}
      <div className="space-y-1">
        <label htmlFor="front" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t?.('frontLabel') || 'Front'} <span className="text-red-500">*</span>
        </label>
        <Controller
          name="front"
          control={control}
          render={({ field }) => (
            <textarea
              id="front"
              placeholder={t?.('frontPlaceholder') || 'Enter front text (English)...'}
              {...field}
              rows={3}
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.front ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60`} // disabled スタイル追加
              aria-invalid={errors.front ? 'true' : 'false'}
              // onBlur={handleFrontBlur} // onBlur は削除
              disabled={isPending} // 処理中は無効化
            />
          )}
        />
        {errors.front && ( <p className="mt-1 text-sm text-red-600" role="alert"> {errors.front.message} </p> )}

        {/* ★ 手動翻訳ボタンを追加 ★ */}
        <div className="pt-1 text-right">
             <button
                type="button" // フォーム送信を防ぐ
                onClick={handleTranslateClick}
                disabled={isPending || !watchedFront} // 処理中か Front が空なら無効
                className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {/* アイコンを追加しても良い (例: Heroicons の LanguageIcon) */}
                {isTranslating || translateIsPending ? '翻訳中...' : `Translate to ${t?.('backLabel') || 'Back'} (JA)`}
            </button>
        </div>
      </div>
      
      
      {/* Back Input (修正版) */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
            <label htmlFor="back" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t?.('backLabel') || 'Back'} <span className="text-red-500">*</span>
            </label>
        </div>
        {/* ↓↓↓ Controller の name を "back" に修正 ↓↓↓ */}
        <Controller
          name="back" // ★ "back" に修正 ★
          control={control}
          render={({ field }) => (
            <textarea
              id="back" // ★ "back" に修正 ★
              placeholder={t?.('backPlaceholder') || 'Enter back text (Japanese)... or click translate'}
              {...field} // ★ これで "back" フィールドの状態が正しく反映される ★
              rows={3}
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.back ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60`}
              aria-invalid={errors.back ? 'true' : 'false'}
              disabled={isPending}
            />
          )}
        />
        {/* 翻訳エラー表示 */}
        {translationError && ( <p className="mt-1 text-sm text-red-600" role="alert"> {translationError} </p> )}
        {/* バリデーションエラー表示 (翻訳エラーがない時だけ) */}
        {errors.back && !translationError && ( <p className="mt-1 text-sm text-red-600" role="alert"> {errors.back.message} </p> )}
      </div>

      {/* カード作成APIエラー表示 (変更なし) */}
      {createError && (
        <div className="mt-2 p-2 border border-red-300 bg-red-50 dark:bg-red-900/30 rounded-md" role="alert">
          <p className="text-sm text-red-700 dark:text-red-300">
            {/* Consider a more specific error message or use createError.message */}
            {t?.('creationError', { message: createError.message }) || `Error creating card: ${createError.message}`}
          </p>
        </div>
      )}

      {/* 送信ボタン (変更なし) */}
      <div>
        <button
          type="submit"
          disabled={isPending} // 全体の処理中状態を反映
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
           {createIsPending ? (t?.('creatingButton') || 'Creating...') : (t?.('createButton') || 'Add Card')}
        </button>
      </div>
    </form>
  );
};