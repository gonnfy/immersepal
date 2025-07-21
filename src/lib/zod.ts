import { z } from "zod";

export const deckCreateSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Deck name is required." }) // 日本語メッセージはi18n対応を後で検討
    .max(100, { message: "Deck name must be 100 characters or less." }),
  description: z
    .string()
    .max(500, { message: "Description must be 500 characters or less." })
    .optional()
    .nullable(),
});

export type DeckCreatePayload = z.infer<typeof deckCreateSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});
export type ChangePasswordPayload = z.infer<typeof changePasswordSchema>;

export const cardCreateSchema = z.object({
  front: z
    .string()
    .min(1, { message: "Front content is required." })
    .max(1000, { message: "Front content must be 1000 characters or less." }),
  back: z
    .string()
    .min(1, { message: "Back content is required." })
    .max(1000, { message: "Back content must be 1000 characters or less." }),
});
export type CardCreatePayload = z.infer<typeof cardCreateSchema>;

export const cardUpdateSchema = z
  .object({
    front: z
      .string()
      .min(1, { message: "Front content cannot be empty if provided." })
      .max(1000, { message: "Front content must be 1000 characters or less." })
      .optional(),
    back: z
      .string()
      .min(1, { message: "Back content cannot be empty if provided." })
      .max(1000, { message: "Back content must be 1000 characters or less." })
      .optional(),
  })
  .refine((data) => data.front !== undefined || data.back !== undefined, {
    message: "At least one field (front or back) must be provided for update.",
    path: ["front", "back"],
  });

export type CardUpdatePayload = z.infer<typeof cardUpdateSchema>;

export const deckUpdateSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: "Deck name cannot be empty if provided." })
      .max(100, { message: "Deck name must be 100 characters or less." })
      .optional(),
    description: z
      .string()
      .max(500, { message: "Description must be 500 characters or less." })
      .nullable()
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message:
      "At least one field (name or description) must be provided for update.",
  });

export type DeckUpdatePayload = z.infer<typeof deckUpdateSchema>;

export const cardRatingSchema = z.object({
  rating: z.enum(["AGAIN", "HARD", "GOOD", "EASY"]),
});

export type CardRatingPayload = z.infer<typeof cardRatingSchema>;
