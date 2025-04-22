// src/app/[locale]/(app)/test/page.tsx (テスト用コード)

'use client'; // ダイアログの状態を管理するため Client Component にする

import React, { useState } from 'react';
// Corrected import path assuming '@/' alias points to 'src/'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

export default function DialogTestPage() {
  // ダイアログの表示状態を管理する state (最初から表示させるため true に設定)
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  // 確認ボタンが押された時の仮の処理
  const handleConfirm = () => {
    alert('Confirmed!');
    setIsDialogOpen(false); // 確認したら閉じる（テスト用）
  };

  // キャンセル時やオーバーレイクリックでダイアログを閉じる処理
  const handleOpenChange = (isOpen: boolean) => {
    setIsDialogOpen(isOpen);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Confirmation Dialog Isolation Test</h1>
      <p>
        If the dialog below appears correctly centered on the screen,
        the positioning issue is likely caused by interactions with other
        components or styles in its original context (e.g., within CardList).
      </p>
      <p>
        If the dialog below is still misplaced or cut off, the issue
        might be with the dialog's internal styles, Tailwind setup,
        or global CSS conflicts.
      </p>

      {/* 他の要素を置かずに ConfirmationDialog だけをレンダリング */}
      {/* isOpen が true なので最初から表示されるはず */}
      <ConfirmationDialog
        isOpen={isDialogOpen}
        onOpenChange={handleOpenChange}
        onConfirm={handleConfirm}
        title="Test Dialog: Is this centered?"
        description="This dialog should appear fixed and centered within the browser viewport, regardless of this text."
        confirmText="Confirm Test"
        cancelText="Cancel Test"
      />

      {/* ページが長い場合にスクロールが発生するようにダミーコンテンツを追加 (任意) */}
      <div style={{ height: '150vh', background: '#eee', marginTop: '20px' }}>
        Scrollable area below the dialog trigger point (dialog should stay centered).
      </div>
    </div>
  );
}