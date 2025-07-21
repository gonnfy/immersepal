import type { AppError } from "../lib/errors"; // AppError をインポート

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export * from "./api.types";
