import { z } from 'zod';

// --- デッキ作成用スキーマと型 ---
export const deckCreateSchema = z.object({
  name: z.string()
    .min(1, { message: 'Deck name is required.' }) // 日本語メッセージはi18n対応を後で検討
    .max(100, { message: 'Deck name must be 100 characters or less.' }),
  description: z.string()
    .max(500, { message: 'Description must be 500 characters or less.' })
    .optional() // 任意入力
    .nullable(), // null も許容 (フォーム未入力時に null になる場合を考慮)
});

// スキーマから TypeScript 型を生成してエクスポート
export type DeckCreatePayload = z.infer<typeof deckCreateSchema>;

// --- 他のスキーマ (例: 学習結果更新用) ---
export const reviewResultSchema = z.object({
  cardId: z.string().cuid(), // cuid形式を期待する場合
  rating: z.enum(['AGAIN', 'HARD', 'GOOD', 'EASY']), // Enumの値と一致
});

export type ReviewResultPayload = z.infer<typeof reviewResultSchema>;

// --- パスワード変更用スキーマ (例) ---
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6), // 必要ならより複雑なルールを追加
});
export type ChangePasswordPayload = z.infer<typeof changePasswordSchema>;

// --- 他に必要な Zod スキーマをここに追加 ---
// --- カード作成用スキーマ ---
export const cardCreateSchema = z.object({
  front: z.string().min(1, { message: 'Front content is required.' }).max(1000, { message: 'Front content must be 1000 characters or less.' }),
  back: z.string().min(1, { message: 'Back content is required.' }).max(1000, { message: 'Back content must be 1000 characters or less.' }),
  // deckId は API ルートハンドラでパスパラメータから取得するため、ここには含めない
});
export type CardCreatePayload = z.infer<typeof cardCreateSchema>;


// --- カード更新用スキーマ ---
export const cardUpdateSchema = z.object({
  front: z.string()
    .min(1, { message: 'Front content cannot be empty if provided.' }) // 空文字での更新を防ぐ場合
    .max(1000, { message: 'Front content must be 1000 characters or less.' })
    .optional(), // 任意入力
  back: z.string()
    .min(1, { message: 'Back content cannot be empty if provided.' }) // 空文字での更新を防ぐ場合
    .max(1000, { message: 'Back content must be 1000 characters or less.' })
    .optional(), // 任意入力
}).refine(data => data.front !== undefined || data.back !== undefined, {
  message: "At least one field (front or back) must be provided for update.",
  path: ["front", "back"], // エラーメッセージを関連付けるフィールド
}); // front か back のどちらかは必須とする

// スキーマから TypeScript 型を生成してエクスポート
export type CardUpdatePayload = z.infer<typeof cardUpdateSchema>;
// --- デッキ更新用スキーマ ---
export const deckUpdateSchema = z.object({
  name: z.string()
    .min(1, { message: 'Deck name cannot be empty if provided.' })
    .max(100, { message: 'Deck name must be 100 characters or less.' })
    .optional(),
  description: z.string()
    .max(500, { message: 'Description must be 500 characters or less.' })
    .nullable() // Allow null for clearing description
    .optional(),
}).refine(data => data.name !== undefined || data.description !== undefined, {
  message: "At least one field (name or description) must be provided for update.",
  // Zod 3.23+ では refine の第二引数で path を指定可能
  // path: ["name", "description"], // 関連フィールドを指定
});

// スキーマから TypeScript 型を生成してエクスポート
export type DeckUpdatePayload = z.infer<typeof deckUpdateSchema>;