// src/app/[locale]/(app)/test/page.tsx
'use client';

import React, { useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

export default function DialogTestPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  const handleConfirm = () => {
    alert('Confirmed!');
    setIsDialogOpen(false);
  };

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
        might be with the dialog&apos;s internal styles, Tailwind setup, {/* ★★★ Fixed ' */}
        or global CSS conflicts.
      </p>

      <ConfirmationDialog
        isOpen={isDialogOpen}
        onOpenChange={handleOpenChange}
        onConfirm={handleConfirm}
        title="Test Dialog: Is this centered?"
        description="This dialog should appear fixed and centered within the browser viewport, regardless of this text."
        confirmText="Confirm Test"
        cancelText="Cancel Test"
      />

      <div style={{ height: '150vh', background: '#eee', marginTop: '20px' }}>
        Scrollable area below the dialog trigger point (dialog should stay centered).
      </div>
    </div>
  );
}