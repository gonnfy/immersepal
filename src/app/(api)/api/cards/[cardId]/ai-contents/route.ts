// src/app/(api)/api/cards/[cardId]/ai-contents/route.ts (新規作成)

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AiContentType } from '@prisma/client'; // Prisma Enum をインポート
import { getServerUserId } from '@/lib/auth';
import { saveAiContent } from '@/services/card.service'; // 作成したサービス関数
import {
  handleApiError,
  ValidationError,
  AppError,
  AuthenticationError,
} from '@/lib/errors'; // エラー型
import { type Result } from '@/types';
import { type AICardContent } from '@prisma/client';

// リクエストボディの Zod スキーマ定義
const aiContentCreateApiSchema = z.object({
  contentType: z.nativeEnum(AiContentType), // 正しい Enum か検証
  language: z.string().min(2, { message: 'Language code is required.' }),
  content: z.string().min(1, { message: 'Content cannot be empty.' }),
});

type AiContentCreateApiPayload = z.infer<typeof aiContentCreateApiSchema>;

// context.params の型定義
interface Context {
  params: {
    cardId: string;
  };
}

/**
 * POST handler to create a new AICardContent entry for a specific card.
 */
export async function POST(request: Request, context: Context) {
  try {
    // 1. 認証
    const userId = await getServerUserId();
    if (!userId) {
      // 認証エラーは専用のエラークラスを使うか、直接レスポンスを返す
      return handleApiError(new AuthenticationError());
      // または: return NextResponse.json({ error: 'AUTHENTICATION_FAILED', message: 'Authentication required.' }, { status: 401 });
    }

    // 2. cardId を URL パラメータから取得
    // Next.js の挙動に注意しつつ await を使用
    const { cardId } = await context.params;
    if (!cardId) {
      throw new ValidationError('Card ID is missing in the URL path.');
    }

    // 3. リクエストボディのパースと検証
    let payload: AiContentCreateApiPayload;
    try {
      const rawBody: unknown = await request.json();
      const validation = aiContentCreateApiSchema.safeParse(rawBody);
      if (!validation.success) {
        throw new ValidationError(
          'Invalid request body for saving AI content.',
          validation.error.flatten()
        );
      }
      payload = validation.data;
    } catch (e) {
      if (e instanceof ValidationError) {
        throw e;
      }
      console.error(
        'Error parsing/validating save AI content request body:',
        e
      );
      throw new ValidationError(
        'Invalid JSON body or structure for saving AI content.'
      );
    }

    // 4. サービス関数呼び出し (Result が返ってくる)
    const saveResult: Result<AICardContent, AppError> = await saveAiContent(
      userId,
      cardId,
      payload // { contentType, language, content }
    );

    // 5. Result をチェック
    if (!saveResult.ok) {
      // サービス層からのエラー (NotFound, Permission, Conflict, DB Error) を処理
      return handleApiError(saveResult.error);
    }

    // 6. 成功レスポンス (201 Created)
    // 作成された AICardContent オブジェクトを返す
    return NextResponse.json(saveResult.value, { status: 201 });
  } catch (error: unknown) {
    // 認証、パース/バリデーション、予期せぬエラーなどをここで処理
    return handleApiError(error);
  }
}
