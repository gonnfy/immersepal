// src/app/[locale]/api/decks/route.ts

import { NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/auth'; // サーバーサイドでユーザーIDを取得するヘルパー
import { deckCreateSchema, DeckCreatePayload } from '@/lib/zod'; // Zod スキーマと型をインポート
import { createDeck, getAllDecks } from '@/services/deck.service'; // Deck Service 関数をインポート
import { AppError, isAppError, ValidationError } from '@/lib/errors'; // カスタムエラークラスと型ガード, ValidationErrorを追加
import { ZodError } from 'zod'; // Zod のエラー型
// import { handleApiError } from '@/lib/errors'; // 必要に応じてエラーハンドリング関数をインポート

/**
 * 新しいデッキを作成する (POST)
 */
export async function POST(request: Request) {
  try {
    // 1. 認証: リクエストからユーザーIDを取得
    const userId = await getServerUserId();
    if (!userId) {
      // 認証されていない場合は 401 Unauthorized エラー
      return NextResponse.json({ error: 'AUTHENTICATION_FAILED', message: 'Authentication required.' }, { status: 401 });
    }

    // 2. リクエストボディを取得・パース
    let body: DeckCreatePayload;
    try {
      body = await request.json();
    } catch (e) {
      // JSON パースエラー
      return NextResponse.json({ error: 'INVALID_REQUEST_BODY', message: 'Invalid JSON format.' }, { status: 400 });
    }


    // 3. バリデーション: Zod スキーマでリクエストボディを検証
    const validatedData = deckCreateSchema.parse(body);

    // 4. Service 呼び出し: デッキ作成処理を実行
    const newDeck = await createDeck(userId, validatedData);

    // 5. 成功レスポンス: 作成されたデッキ情報とステータスコード 201 を返す
    return NextResponse.json(newDeck, { status: 201 });

  } catch (error) {
    // 6. エラーハンドリング
    // ★ デバッグログを追加 ★

    if (error instanceof ZodError) {
      console.log('[API CATCH BLOCK] Handling ZodError...');
      // Zod バリデーションエラー
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Invalid input data.', details: error.errors }, { status: 400 });
    }
    if (isAppError(error)) {
      console.log(`[API CATCH BLOCK] Handling AppError (${error.errorCode})...`);
      // 自分で定義したアプリケーションエラー (ConflictError, DatabaseError など)
      return NextResponse.json({
          error: error.errorCode, // 事前に定義したエラーコード
          message: error.message,
          details: error.details
      }, { status: error.statusCode }); // エラーに応じたステータスコード
    }

    console.error('[API CATCH BLOCK] Handling unexpected error...');
    // 予期せぬその他のエラー
    // console.error('Unexpected API Error in POST /api/decks:', error); // 元のログは詳細化のため上記に統合
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' }, { status: 500 });
  }
}

/**
 * ログインユーザーのデッキ一覧を取得する (GET)
 */
export async function GET(request: Request) {
  try {
    // 1. 認証: リクエストからユーザーIDを取得
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: 'AUTHENTICATION_FAILED', message: 'Authentication required.' }, { status: 401 });
    }

    // 2. クエリパラメータの読み取りと検証
    const { searchParams } = new URL(request.url);

    const DEFAULT_LIMIT = 10;
    const MAX_LIMIT = 100;
    const DEFAULT_OFFSET = 0;

    let limitStr = searchParams.get('limit');
    let offsetStr = searchParams.get('offset');

    let limit = parseInt(limitStr || '', 10);
    let offset = parseInt(offsetStr || '', 10);

    // バリデーションとデフォルト値の設定
    if (limitStr !== null && (isNaN(limit) || limit <= 0)) {
        // limit が指定されているが不正な値の場合
        return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Invalid limit parameter. Must be a positive integer.' }, { status: 400 });
    } else if (limitStr === null || isNaN(limit)) {
        // limit が指定されていないか、数値でない場合 (デフォルト値適用)
        limit = DEFAULT_LIMIT;
    } else {
        // limit が有効な数値の場合、上限値を適用
        limit = Math.min(limit, MAX_LIMIT);
    }

    if (offsetStr !== null && (isNaN(offset) || offset < 0)) {
        // offset が指定されているが不正な値の場合
        return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Invalid offset parameter. Must be a non-negative integer.' }, { status: 400 });
    } else if (offsetStr === null || isNaN(offset)) {
        // offset が指定されていないか、数値でない場合 (デフォルト値適用)
        offset = DEFAULT_OFFSET;
    }
    // offset が有効な数値の場合はそのまま使用

    // 3. Service 呼び出し: デッキ一覧取得処理を実行 (ページネーションパラメータ付き)
    const { data: decks, totalItems } = await getAllDecks(userId, { limit, offset });

    // 4. ページネーションレスポンスの構築
    const baseUrl = '/api/decks'; // 基本 URL (request.url から動的に取得も可能)
    const selfLink = `${baseUrl}?offset=${offset}&limit=${limit}`;
    let nextLink: string | null = null;
    if (offset + limit < totalItems) {
      nextLink = `${baseUrl}?offset=${offset + limit}&limit=${limit}`;
    }
    let previousLink: string | null = null;
    if (offset > 0) {
      const prevOffset = Math.max(0, offset - limit);
      previousLink = `${baseUrl}?offset=${prevOffset}&limit=${limit}`;
    }

    const responseBody = {
      data: decks,
      pagination: {
        offset: offset,
        limit: limit,
        totalItems: totalItems,
        _links: {
          self: selfLink,
          next: nextLink,
          previous: previousLink,
        },
      },
    };

    // 5. 成功レスポンス: 構築したレスポンスボディとステータスコード 200 を返す
    return NextResponse.json(responseBody, { status: 200 });

  } catch (error) {
    // 6. エラーハンドリング
    // console.error('[API GET /api/decks] Error caught:', error); // デバッグ用ログ

    // バリデーションエラーは上で処理済み
    if (isAppError(error)) {
      // 自分で定義したアプリケーションエラー (DatabaseError など)
      // console.log(`[API GET /api/decks] Handling AppError (${error.errorCode})...`);
      return NextResponse.json({
          error: error.errorCode,
          message: error.message,
          details: error.details
      }, { status: error.statusCode });
    }

    // 予期せぬその他のエラー
    console.error('Unexpected API Error in GET /api/decks:', error); // サーバーログに記録
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' }, { status: 500 });
  }
}