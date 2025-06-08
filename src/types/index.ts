/**
 * Barrel file for exporting types from the types directory.
 */
import type { AppError } from '../lib/errors'; // AppError をインポート

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export * from './api.types';

// Add exports from other type files here as needed
// export * from './another.types';
