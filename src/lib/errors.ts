// 標準エラーコードの例 (プロジェクトに合わせて定義)
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT', // ★ 既存リソースとの衝突 (例: Unique制約)
  EXTERNAL_API_FAILURE: 'EXTERNAL_API_FAILURE',
  DATABASE_ERROR: 'DATABASE_ERROR', // ★ データベース関連エラー
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const; // Readonlyにする

type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// アプリケーション共通のベースエラークラス
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    errorCode: ErrorCode,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.name = this.constructor.name; // エラークラス名を設定
    Object.setPrototypeOf(this, new.target.prototype);
    // Error.captureStackTrace(this, this.constructor); // Node.js 環境なら有効
  }
}

// --- 具体的なエラークラス ---

export class ValidationError extends AppError {
  constructor(message: string = 'Invalid input data.', details?: unknown) {
    super(message, 400, ERROR_CODES.VALIDATION_ERROR, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed.') {
    super(message, 401, ERROR_CODES.AUTHENTICATION_FAILED);
  }
}

export class PermissionError extends AppError {
  constructor(message: string = 'Permission denied.') {
    super(message, 403, ERROR_CODES.PERMISSION_DENIED);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found.') {
    super(message, 404, ERROR_CODES.RESOURCE_NOT_FOUND);
  }
}

// ★ デッキ作成時のユニーク制約違反などに使用 ★
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict.') {
    super(message, 409, ERROR_CODES.RESOURCE_CONFLICT);
  }
}

// lib/errors.ts の ExternalApiError クラスを修正

// (他の import やクラス定義はそのまま)

export class ExternalApiError extends AppError {
  /**
   * Constructs an ExternalApiError.
   * @param message - Human-readable description. Defaults to 'External API request failed.'.
   * @param originalError - Optional: The original error caught.
   * @param details - Optional: Additional details (like safety ratings). // ← details を追加
   */
  constructor(
    message: string = 'External API request failed.',
    originalError?: Error,
    details?: unknown // ★ オプションの details 引数を追加 ★
  ) {
    // ★ AppError の第4引数 (details) に渡すように修正 ★
    //    details があればそれを、なければ originalError を渡す例
    super(
      message,
      503,
      ERROR_CODES.EXTERNAL_API_FAILURE,
      details ?? originalError
    );
  }
}

// (他のエラークラスや isAppError などはそのまま)

// ★ 予期せぬデータベースエラーなどに使用 ★
export class DatabaseError extends AppError {
  constructor(
    message: string = 'Database operation failed.',
    originalError?: Error
  ) {
    // DBエラーの詳細はログには出すが、クライアントには返さない想定
    super(message, 500, ERROR_CODES.DATABASE_ERROR, originalError);
  }
}

// 予期せぬサーバー内部エラー
export class InternalServerError extends AppError {
  constructor(
    message: string = 'An unexpected internal server error occurred.',
    originalError?: Error
  ) {
    super(message, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, originalError);
  }
}

// Type guard to check if an error is an AppError
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};
import { NextResponse } from 'next/server';
// Note: Assuming AppError, ERROR_CODES, InternalServerError, isAppError are defined above in the same file.
// If Prisma errors need specific handling, import Prisma from '@prisma/client'

/**
 * Centralized API error handler for Next.js API routes.
 * Logs the error and returns a standardized JSON response.
 * @param error - The error caught in the try-catch block.
 * @returns A NextResponse object with the appropriate status code and error details.
 */
export const handleApiError = (error: unknown): NextResponse => {
  console.error('API Error:', error); // Log the error for server-side debugging

  if (isAppError(error)) {
    // Handle known application errors
    return NextResponse.json(
      {
        message: error.message,
        errorCode: error.errorCode,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // Example: Handle Prisma specific errors (Uncomment and adjust if needed)
  // import { Prisma } from '@prisma/client';
  // import { ConflictError, DatabaseError } from './errors'; // Assuming these are defined
  // if (error instanceof Prisma.PrismaClientKnownRequestError) {
  //   if (error.code === 'P2002') { // Unique constraint violation
  //     const conflictError = new ConflictError('Resource already exists.');
  //     return NextResponse.json(
  //       { message: conflictError.message, errorCode: conflictError.errorCode },
  //       { status: conflictError.statusCode }
  //     );
  //   }
  //   // Handle other known Prisma errors
  //   const dbError = new DatabaseError('Database request failed.', error);
  //   return NextResponse.json(
  //     { message: dbError.message, errorCode: dbError.errorCode },
  //     { status: dbError.statusCode }
  //   );
  // }

  // Handle unexpected errors
  // Ensure InternalServerError is defined above or imported
  const internalError = new InternalServerError(
    'An unexpected error occurred.',
    error instanceof Error ? error : undefined
  );
  return NextResponse.json(
    {
      message: internalError.message,
      errorCode: internalError.errorCode,
    },
    { status: internalError.statusCode }
  );
};
