# API 設計原則 v1.1 (2025-04-22)

## 1. 目的

このドキュメントは、本アプリケーションにおける API 設計の一貫性、保守性、およびクライアント（Web, Mobile アプリなど）からの利用しやすさを確保するための原則を定義します。RESTful な考え方を参考にしつつ、Next.js Route Handlers で実装します。

## 2. クライアントニュートラル (最重要原則)

* API は特定のクライアントに依存せず、Web, Mobile など様々なクライアントから共通利用可能なように設計します。
* API はデータや機能を提供することに焦点を当て、UI 固有のロジックやフォーマットを含めません。

## 3. エンドポイント命名規則

* **言語非依存:** ★ API の URL パスは UI の表示言語から独立させ、ロケールプレフィックスを含みません (例: `/api/decks`)。API ルートハンドラは `src/app/(api)/api/...` 以下に配置します。★
* **リソースベース:** URL は名詞中心 (複数形推奨) で設計します (例: `/api/decks`, `/api/cards`)。
* **階層構造:** リソース間の関連はパスで表現します (例: `/api/decks/{deckId}/cards`)。
* **パスセグメント:** `camelCase` またはリソース名を基本とします。

## 4. HTTP メソッド

* 標準的な使い方に従います: `GET`(取得), `POST`(作成), `PUT`(置換更新), `DELETE`(削除), `PATCH`(部分更新、任意)。

## 5. リクエスト/レスポンス形式

* **データ形式:** JSON のみを使用 (`Content-Type: application/json`)。
* **JSON キー命名規則:** **`camelCase`** で統一します。

## 6. データ転送オブジェクト (DTO)

* API の Request Body および Response Body の型は `src/types/api.types.ts` で明確に定義します。
* Request Body のバリデーションは API Route Handler 内で Zod (`src/lib/zod.ts`) を用いて行います。

## 7. 認証・認可

* **認証:** Supabase Auth の JWT を利用 (`Authorization: Bearer <token>`)。
* **認可:** 主に Supabase **RLS** で DB レベルで制御。API Route や Service 層でも必要に応じて所有権チェックを実施。

## 8. ステータスコード

* 標準的な HTTP ステータスコード (200, 201, 204, 400, 401, 403, 404, 409, 500 など) を適切に返却します。

## 9. エラーレスポンス

* `docs/error-handling.md` で定義された標準 JSON 形式 (`{ error: string, message: string, details?: any }`) で返却します。`error` プロパティには `lib/errors.ts` で定義された `errorCode` を使用します。

## 10. API レスポンスのローカライズ

* API の URL は言語に依存しません。
* もし API が返す**エラーメッセージ等**をリクエスト元の言語に合わせる必要がある場合は、将来的に HTTP リクエストヘッダーの **`Accept-Language`** を参照して処理することを検討します (現状未実装)。

## 11. バージョニング

* 初期リリースでは考慮しません。将来的に破壊的変更が必要な場合は URL パス (`/api/v2/...`) 等でバージョニングします。

# --- api-design.md に追記する内容 ---

## 12. 非同期 API Route Handler における `params` の扱い (Next.js 15+ 注意点)

**背景:**

Next.js 15 (およびそれ以前の準備バージョン) では、パフォーマンス最適化の一環として、API Route Handler に渡される `params` オブジェクト（通常、第二引数の `context` オブジェクト経由でアクセス: `context.params`）は非同期 API として扱われるようになりました。

**問題:**

`async function` として定義されたハンドラ内で、`context.params` のプロパティ（例: `context.params.deckId` や `context.params.locale`）に `await` を使用せずに直接アクセスしようとすると、実行時に `Error: Route ... used \`params.property\`. \`params\` should be awaited...` というエラーまたは警告が発生します。

**解決策:**

`async` 関数として定義された API Route Handler 内で `params` の値を使用する場合は、プロパティにアクセスする前に、**必ず `context.params` オブジェクト全体を `await` してください。**

**実装例:**

```typescript
// src/app/[locale]/(api)/api/decks/[deckId]/route.ts (GETハンドラの例)

import { NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/auth';
import { getDeckById } from '@/services/deck.service';
import { handleApiError } from '@/lib/errors';

// context の型を定義 (例)
type Context = {
  params: { locale: string; deckId: string };
};

export async function GET(request: Request, context: Context) {
  try {
    // --- NG な書き方 ---
    // const deckId_bad = context.params.deckId; // ← await しないとエラーが出る

    // --- OK な書き方 ---
    // context.params を await してから分割代入で取り出す
    const { deckId, locale } = await context.params;

    // --- 以降の処理 ---
    const userId = await getServerUserId();
    if (!userId) {
      // ... 認証エラー処理 ...
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deckData = await getDeckById(userId, deckId);
    return NextResponse.json(deckData);

  } catch (error) {
    return handleApiError(error);
  }
}