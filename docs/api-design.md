# API 設計原則 v1.2 (2025-04-25: AICardContent 導入反映版)

## 1. 目的

このドキュメントは、本アプリケーションにおける API 設計の一貫性、保守性、およびクライアント（Web, Mobile アプリなど）からの利用しやすさを確保するための原則を定義します。RESTful な考え方を参考にしつつ、Next.js Route Handlers で実装します。

## 2. クライアントニュートラル (最重要原則)

- API は特定のクライアントに依存せず、Web, Mobile など様々なクライアントから共通利用可能なように設計します。
- API はデータや機能を提供することに焦点を当て、UI 固有のロジックやフォーマットを含めません。

## 3. エンドポイント命名規則

- **言語非依存:** API の URL パスは UI の表示言語から独立させ、ロケールプレフィックスを含みません (例: `/api/decks`)。API ルートハンドラは `src/app/(api)/api/...` 以下に配置します。
- **リソースベース:** URL は名詞中心 (複数形推奨) で設計します (例: `/api/decks`, `/api/cards`, `/api/ai-contents`)。
- **階層構造:** リソース間の関連はパスで表現します (例: `/api/decks/{deckId}/cards`, `/api/cards/{cardId}/ai-contents`)。
- **パスセグメント:** `camelCase` またはリソース名を基本とします。

## 4. HTTP メソッド

- 標準的な使い方に従います: `GET`(取得), `POST`(作成), `PUT`(置換更新), `DELETE`(削除), `PATCH`(部分更新、任意)。

## 5. リクエスト/レスポンス形式

- **データ形式:** JSON のみを使用 (`Content-Type: application/json`)。
- **JSON キー命名規則:** **`camelCase`** で統一します。
- **レスポンス構造 (データモデル変更):**
  - カード (`Card`) 情報を返す API では、以前の `explanation` や `translation` フィールドは含まれません。
  - 代わりに、関連する AI 生成コンテンツ（解説、翻訳）は `aiContents` というネストされた配列として含まれる形を基本とします。各要素には `contentType` (種類), `language` (言語), `content` (内容) が含まれます。
  - **カード取得レスポンス例 (`GET /api/decks/{deckId}/cards` の一部):**

```json
{
  "data": [
    {
      "id": "clxyz123...",
      "front": "apple",
      "back": "りんご",
      "deckId": "deck-abc",
      "createdAt": "2025-04-25T00:00:00.000Z",
      "updatedAt": "2025-04-25T01:00:00.000Z",
      "interval": 0,
      "easeFactor": 2.5,
      "nextReviewAt": "2025-04-25T00:00:00.000Z",
      "frontAudioUrl": null,
      "backAudioUrl": null,
      "aiContents": [
        {
          "id": "aic-abc...",
          "contentType": "EXPLANATION",
          "language": "en",
          "content": "\"Apple\" is a type of round fruit...",
          "createdAt": "2025-04-25T01:00:00.000Z",
          "updatedAt": "2025-04-25T01:00:00.000Z"
        },
        {
          "id": "aic-def...",
          "contentType": "TRANSLATION",
          "language": "ja",
          "content": "りんご", // 翻訳結果の例
          "createdAt": "2025-04-25T01:05:00.000Z",
          "updatedAt": "2025-04-25T01:05:00.000Z"
        }
        // 他の言語の解説や翻訳があればここに追加される
      ]
    }
    // ... more cards
  ],
  "pagination": {
    /* ... */
  }
}
```

## 6. データ転送オブジェクト (DTO) と型定義

- API の Request Body および Response Body の型は `src/types/api.types.ts` で明確に定義します。
- **データモデル変更に伴う型定義の更新:**

  - `CardApiResponse` 型から `explanation`, `translation` を削除し、`aiContents: AICardContentApiResponse[]` を追加する必要があります。
  - 新しい `AICardContentApiResponse` 型を定義する必要があります (内容は `AICardContent` モデルに基づく)。
  - **更新後の型定義例 (`src/types/api.types.ts` で定義される想定):**

```typescript
import { AiContentType } from "@prisma/client"; // PrismaからEnumをインポート

// AICardContent の API レスポンス型 (例)
export interface AICardContentApiResponse {
  id: string;
  contentType: AiContentType; // 'EXPLANATION' | 'TRANSLATION'
  language: string;
  content: string;
  createdAt: string; // または Date
  updatedAt: string; // または Date
  // cardId は通常レスポンスに含めないことが多い
}

// 更新後の Card の API レスポンス型 (例)
export interface CardApiResponse {
  id: string;
  front: string;
  back: string;
  deckId: string;
  createdAt: string; // または Date
  updatedAt: string; // または Date
  interval: number;
  easeFactor: number;
  nextReviewAt: string; // または Date
  frontAudioUrl: string | null;
  backAudioUrl: string | null;
  aiContents: AICardContentApiResponse[]; // ネストされた配列
}

// PaginatedCardsResponse も CardApiResponse を使うように更新
export interface PaginatedCardsResponse {
  data: CardApiResponse[];
  pagination: PaginationMeta;
}

// 他の型定義 (DeckApiResponse, ApiErrorResponse など) は変更なしか、軽微な修正
```

- Request Body のバリデーションは API Route Handler 内で Zod (`src/lib/zod.ts`) を用いて行います。

## 7. 認証・認可

- **認証:** Supabase Auth の JWT を利用 (`Authorization: Bearer <token>`)。
- **認可:** 主に Supabase **RLS** で DB レベルで制御。API Route や Service 層でも必要に応じて所有権チェックを実施。`AICardContent` に対する操作も `Card` の所有権に基づいて認可する必要があります。

## 8. ステータスコード

- 標準的な HTTP ステータスコード (200, 201, 204, 400, 401, 403, 404, 409, 500 など) を適切に返却します。

## 9. エラーレスポンス

- `docs/error-handling.md` で定義された標準 JSON 形式 (`{ error: string, message: string, details?: any }`) で返却します。`error` プロパティには `lib/errors.ts` で定義された `errorCode` を使用します。
- `AICardContent` の操作に関するエラー（例: ユニーク制約違反 `[cardId, contentType, language]`）も適切なエラーコード (`RESOURCE_CONFLICT` など) で返す必要があります。

## 10. API レスポンスのローカライズ

- API の URL は言語に依存しません。
- API が返す**エラーメッセージ等**をリクエスト元の言語に合わせる必要がある場合は、将来的に HTTP リクエストヘッダーの **`Accept-Language`** を参照して処理することを検討します (現状未実装)。AI コンテンツ (`aiContents`) の言語は `language` フィールドで示されます。

## 11. バージョニング

- 初期リリースでは考慮しません。将来的に破壊的変更が必要な場合は URL パス (`/api/v2/...`) 等でバージョニングします。

## 12. 非同期 API Route Handler における `params` の扱い (Next.js 15+ 注意点)

- (変更なし) `async` 関数として定義された API Route Handler 内で `params` の値を使用する場合は、プロパティにアクセスする前に、**必ず `context.params` オブジェクト全体を `await` してください。**

**背景:**

Next.js 15 (およびそれ以前の準備バージョン) では、パフォーマンス最適化の一環として、API Route Handler に渡される `params` オブジェクト（通常、第二引数の `context` オブジェクト経由でアクセス: `context.params`）は非同期 API として扱われるようになりました。

**問題:**

`async function` として定義されたハンドラ内で、`context.params` のプロパティ（例: `context.params.deckId` や `context.params.locale`）に `await` を使用せずに直接アクセスしようとすると、実行時に `Error: Route ... used \`params.property\`. \`params\` should be awaited...` というエラーまたは警告が発生します。

**解決策:**

`async` 関数として定義された API Route Handler 内で `params` の値を使用する場合は、プロパティにアクセスする前に、**必ず `context.params` オブジェクト全体を `await` してください。**

**実装例:**

```typescript
// src/app/[locale]/(api)/api/decks/[deckId]/route.ts (GETハンドラの例)

import { NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth";
import { getDeckById } from "@/services/deck.service";
import { handleApiError } from "@/lib/errors";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deckData = await getDeckById(userId, deckId);
    return NextResponse.json(deckData);
  } catch (error) {
    return handleApiError(error);
  }
}
```

## 13. データモデル図 (参考)

新しいデータモデル (`AICardContent` 追加) の関係性を以下に示します。

```mermaid
erDiagram
    Card ||--o{ AICardContent : has
    Deck ||--|{ Card : contains
    User ||--|{ Deck : owns

    User {
        String id PK
        String email nullable unique
        String name nullable
        # ... other fields ...
    }
    Deck {
        String id PK
        String name
        String description nullable
        String userId FK
        # ... other fields ...
    }
    Card {
        String id PK
        String front
        String back
        String deckId FK
        String frontAudioUrl nullable
        String backAudioUrl nullable
        Int interval
        Float easeFactor
        DateTime nextReviewAt
        # ... other fields ...
    }
    AICardContent {
        String id PK
        String cardId FK
        AiContentType contentType
        String language
        String content Text
        # ... other fields ...
    }
    enum AiContentType {
        EXPLANATION
        TRANSLATION
    }
```
