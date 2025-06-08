# API 設計 v1.2 (音声対応・AICardContent 拡充)

**(更新日: 2025-04-29)**

## 1. 目的 (変更なし)

このドキュメントは、本アプリケーションにおける API 設計の一貫性、保守性、およびクライアント（Web, Mobile アプリなど）からの利用しやすさを確保するための原則を定義します。RESTful な考え方を参考にしつつ、Next.js Route Handlers で実装します。

## 2. クライアントニュートラル (最重要原則 - 変更なし)

- API は特定のクライアントに依存せず、Web, Mobile など様々なクライアントから共通利用可能なように設計します。
- API はデータや機能を提供することに焦点を当て、UI 固有のロジックやフォーマットを含めません。

## 3. 認証 (新規追加)

- 多くのエンドポイント (特に `/api/decks`, `/api/cards` 以下) は認証が必須です。
- リクエストヘッダーに `Authorization: Bearer <Supabase JWT>` を含める必要があります。
- 認証されていない場合はステータスコード `401 Unauthorized` とエラー `{ "error": "AUTHENTICATION_FAILED", "message": "..." }` が返されます (`handleApiError` 形式)。

## 4. エンドポイント命名規則 (変更なし)

- **言語非依存:** API の URL パスは UI の表示言語から独立させ、ロケールプレフィックスを含みません (例: `/api/decks`)。API ルートハンドラは `src/app/(api)/api/...` 以下に配置します。
- **リソースベース:** URL は名詞中心 (複数形推奨) で設計します (例: `/api/decks`, `/api/cards`, `/api/ai-contents`)。
- **階層構造:** リソース間の関連はパスで表現します (例: `/api/decks/{deckId}/cards`, `/api/cards/{cardId}/ai-contents`)。
- **パスセグメント:** `camelCase` またはリソース名を基本とします。

## 5. HTTP メソッド (変更なし)

- 標準的な使い方に従います: `GET`(取得), `POST`(作成), `PUT`(置換更新), `DELETE`(削除), `PATCH`(部分更新、任意)。

## 6. リクエスト/レスポンス形式 (修正)

- **データ形式:** JSON のみを使用 (`Content-Type: application/json`)。
- **JSON キー命名規則:** **`camelCase`** で統一します。
- **レスポンス構造 (データモデル変更):**

  - カード (`Card`) 情報を返す API では、以前の `explanation`, `translation`, `frontAudioUrl`, `backAudioUrl` フィールドは含まれません。
  - 代わりに、関連する AI 生成コンテンツ（解説、翻訳、音声パス）は `aiContents` というネストされた配列として含まれる形を基本とします。各要素には `contentType` (種類), `language` (言語), `content` (内容/パス) が含まれます。
  - **カード取得レスポンス例 (`GET /api/decks/{deckId}/cards` の一部 - 更新版):**

  ```json
  {
    "data": [
      {
        "id": "clxyz123...",
        "front": "apple",
        "back": "りんご",
        "deckId": "deck-abc",
        "createdAt": "2025-04-29T00:00:00.000Z",
        "updatedAt": "2025-04-29T01:00:00.000Z",
        "interval": 0,
        "easeFactor": 2.5,
        "nextReviewAt": "2025-04-29T00:00:00.000Z",
        // frontAudioUrl, backAudioUrl は削除
        "aiContents": [
          {
            "id": "aic-abc...",
            "contentType": "EXPLANATION",
            "language": "en",
            "content": "\"Apple\" is a type of round fruit...", // テキスト
            "createdAt": "2025-04-29T01:00:00.000Z",
            "updatedAt": "2025-04-29T01:00:00.000Z"
          },
          {
            "id": "aic-def...",
            "contentType": "TRANSLATION",
            "language": "ja",
            "content": "りんご", // テキスト
            "createdAt": "2025-04-29T01:05:00.000Z",
            "updatedAt": "2025-04-29T01:05:00.000Z"
          },
          {
            "id": "aic-ghi...",
            "contentType": "AUDIO_PRIMARY",
            "language": "en-US",
            "content": "tts-audio/apple-en-us-uuid.mp3", // GCS パス
            "createdAt": "2025-04-29T01:10:00.000Z",
            "updatedAt": "2025-04-29T01:10:00.000Z"
          },
          {
            "id": "aic-jkl...",
            "contentType": "AUDIO_SECONDARY",
            "language": "ja-JP",
            "content": "tts-audio/ringo-ja-jp-uuid.mp3", // GCS パス
            "createdAt": "2025-04-29T01:15:00.000Z",
            "updatedAt": "2025-04-29T01:15:00.000Z"
          }
          // 他の言語の解説や音声があればここに追加される
        ]
      }
      // ... more cards
    ],
    "pagination": {
      /* ... */
    }
  }
  ```

## 7. データ転送オブジェクト (DTO) と型定義 (修正)

- API の Request Body および Response Body の型は `src/types/api.types.ts` で明確に定義します。
- **データモデル変更に伴う型定義の更新:**
  - `CardApiResponse` 型から `frontAudioUrl`, `backAudioUrl` を削除し、`aiContents: AICardContentApiResponse[]` を追加。
  - 新しい `AICardContentApiResponse` 型を定義。
  - `DeckApiResponse` に `cardCount` を追加。
- **更新後の型定義例 (`src/types/api.types.ts` で定義される想定):**

```typescript
// src/types/api.types.ts (抜粋・更新版)
import { AiContentType } from '@prisma/client'; // PrismaからEnumをインポート

// AICardContent の API レスポンス型
export interface AICardContentApiResponse {
  id: string;
  contentType: AiContentType; // EXPLANATION, TRANSLATION, AUDIO_*
  language: string; // 'en', 'ja', 'en-US', 'ja-JP' etc.
  content: string; // Text or GCS Path
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

// 更新後の Card の API レスポンス型
export interface CardApiResponse {
  id: string;
  front: string;
  back: string;
  deckId: string;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
  interval: number;
  easeFactor: number;
  nextReviewAt: string; // ISO 8601 string
  // frontAudioUrl, backAudioUrl は削除
  aiContents: AICardContentApiResponse[]; // ネストされた配列
}

// PaginatedCardsResponse も CardApiResponse を使うように更新
export interface PaginatedCardsResponse
  extends PaginatedResponse<CardApiResponse> {}

// DeckApiResponse (cardCount 追加)
export interface DeckApiResponse {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  cardCount: number; // ★追加
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

export interface PaginatedDecksResponse
  extends PaginatedResponse<DeckApiResponse> {}

// 汎用ページネーションメタデータ
export interface PaginationMeta {
  offset: number;
  limit: number;
  totalItems: number;
  _links?: {
    self: string;
    first?: string;
    prev?: string;
    next?: string;
    last?: string;
  };
}

// 汎用ページネーションレスポンス
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// 標準エラーレスポンス
export interface ApiErrorResponse {
  error: string; // e.g., "NOT_FOUND", "VALIDATION_ERROR"
  message: string;
  details?: unknown;
}

// 他の Payload 型 (DeckCreatePayload, DeckUpdatePayload など) も必要に応じて定義
```

- Request Body のバリデーションは API Route Handler 内で Zod (`src/lib/zod.ts`) を用いて行います。

## 8. 認証・認可 (修正)

- **認証:** Supabase Auth の JWT を利用 (`Authorization: Bearer <token>`)。
- **認可:** 主に Supabase **RLS** で DB レベルで制御。API Route や Service 層でも必要に応じて所有権チェックを実施。`AICardContent` に対する操作も `Card` の所有権に基づいて認可する必要があります。

## 9. ステータスコード (変更なし)

- 標準的な HTTP ステータスコード (200, 201, 204, 400, 401, 403, 404, 409, 500 など) を適切に返却します。

## 10. エラーレスポンス (修正)

- `docs/error-handling.md` で定義された標準 JSON 形式 (`{ error: string, message: string, details?: any }`) で返却します。`error` プロパティには `lib/errors.ts` で定義された `errorCode` を使用します。
- API はエラー発生時、可能な限りこの標準形式で JSON を返します（`handleApiError` により生成）。
- `AICardContent` の操作に関するエラー（例: ユニーク制約違反 `[cardId, contentType, language]`）も適切なエラーコード (`RESOURCE_CONFLICT` など) で返す必要があります。

## 11. API レスポンスのローカライズ (変更なし)

- API の URL は言語に依存しません。
- API が返す**エラーメッセージ等**をリクエスト元の言語に合わせる必要がある場合は、将来的に HTTP リクエストヘッダーの **`Accept-Language`** を参照して処理することを検討します (現状未実装)。AI コンテンツ (`aiContents`) の言語は `language` フィールドで示されます。

## 12. バージョニング (変更なし)

- 初期リリースでは考慮しません。将来的に破壊的変更が必要な場合は URL パス (`/api/v2/...`) 等でバージョニングします。

## 13. 非同期 API Route Handler における `params` の扱い (Next.js 15+ 注意点 - 変更なし)

- `async` 関数として定義された API Route Handler 内で `params` の値を使用する場合は、プロパティにアクセスする前に、**必ず `context.params` オブジェクト全体を `await` してください。**

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
```

## 14. 具体的な API エンドポイント (修正・追加)

### 14.1. デッキ API (`/api/decks`)

#### GET /api/decks

- **(修正)** ログインしているユーザー自身のデッキ一覧を**ページネーション付きで**取得します。
- **認証:** 必須。
- **クエリパラメータ:** `offset` (number, default: 0), `limit` (number, default: 10)
- **成功レスポンス (200 OK):** `PaginatedDecksResponse` 型
- **エラーレスポンス:** 401, 400, 500 - `handleApiError` 形式。

#### POST /api/decks

- **(修正)** ログインしているユーザー用に新しいデッキを作成します。
- **認証:** 必須。
- **リクエストボディ:** `DeckCreatePayload` 型 (`{ name: string, description?: string }`)
- **成功レスポンス (201 Created):** 作成されたデッキ情報 (`DeckApiResponse` 型、`cardCount` 含む)
- **エラーレスポンス:** 401, 400, 409, 500 - `handleApiError` 形式。

### 14.2. 個別デッキ API (`/api/decks/{deckId}`)

#### GET /api/decks/{deckId}

- **(修正)** ログインしているユーザーが所有する特定のデッキを取得します。
- **認証:** 必須。
- **成功レスポンス (200 OK):** `DeckApiResponse` 型 (`cardCount` 含む)
- **エラーレスポンス:** 401, 403, 404, 500 - `handleApiError` 形式。

#### PUT /api/decks/{deckId}

- **(修正)** ログインしているユーザーが所有する特定のデッキを更新します。
- **認証:** 必須。
- **リクエストボディ:** `DeckUpdatePayload` 型 (`{ name?: string, description?: string | null }`)
- **成功レスポンス (200 OK):** 更新後のデッキ情報 (`DeckApiResponse` 型、`cardCount` 含む)
- **エラーレスポンス:** 401, 400, 404, 409, 500 - `handleApiError` 形式。

#### DELETE /api/decks/{deckId}

- **(修正)** ログインしているユーザーが所有する特定のデッキを削除します。
- **認証:** 必須。
- **成功レスポンス (204 No Content):** ボディなし。
- **エラーレスポンス:** 401, 404, 500 - `handleApiError` 形式。

### 14.3. カード API (`/api/decks/{deckId}/cards`, `/api/decks/{deckId}/cards/{cardId}`)

- **(追記/TODO)** これらの API も同様に認証・認可チェックを追加する必要があります。
- レスポンスの `CardApiResponse` 型が更新されています (上記セクション 6, 7 参照)。

### 14.4. AI 関連 API (新規追加)

#### POST /api/translate

- テキストを翻訳します。
- **認証:** 不要（または将来的に必要に応じて追加）。
- **リクエストボディ:** `{ text: string, sourceLanguage: string, targetLanguage: string }`
- **成功レスポンス (200 OK):** `{ success: true, translation: string }`
- **エラーレスポンス:** 400, 503, 500 - `handleApiError` 形式。

#### POST /api/tts

- テキストから音声を生成し、GCS に保存、再生用 URL と GCS パスを返します。
- **認証:** 不要（または将来的に必要に応じて追加）。
- **リクエストボディ:** `{ text: string, language: string }` (例: "en-US", "ja-JP")
- **成功レスポンス (200 OK):** `{ success: true, signedUrl: string, gcsPath: string }`
- **エラーレスポンス:** 400, 503, 500 - `handleApiError` 形式。

#### GET /api/tts/signed-url

- GCS パスから再生用の短時間有効な署名付き URL を取得します。
- **認証:** 不要。
- **クエリパラメータ:** `gcsPath` (string, 必須)
- **成功レスポンス (200 OK):** `{ success: true, signedUrl: string }`
- **エラーレスポンス:** 400, 404, 503, 500 - `handleApiError` 形式。

#### POST /api/cards/{cardId}/ai-contents

- 特定のカードに紐づく `AICardContent` レコードを作成します。
- **認証:** 必須。
- **リクエストボディ:** `{ contentType: AiContentType, language: string, content: string }`
- **成功レスポンス (201 Created):** 作成された `AICardContent` オブジェクト (`AICardContentApiResponse` 型)
- **エラーレスポンス:** 401, 400, 403, 404, 409, 500 - `handleApiError` 形式。

## 15. データモデル図 (参考 - 更新版)

```mermaid
erDiagram
    User ||--o{ Deck : owns
    User ||--o{ StudyLog : records
    Deck ||--o{ Card : contains
    Card ||--o{ AICardContent : has
    Card ||--o{ StudyLog : relates_to

    User {
        String id PK "UUID"
        String email Unique nullable
        String name nullable
        String avatarUrl nullable
        DateTime createdAt
        DateTime updatedAt
    }

    Deck {
        String id PK "CUID"
        String name
        String description nullable
        String userId FK "UUID"
        DateTime createdAt
        DateTime updatedAt
        # cardCount (Calculated, not in DB model)
    }

    Card {
        String id PK "CUID"
        String front Text
        String back Text
        String deckId FK "CUID"
        Int interval
        Float easeFactor
        DateTime nextReviewAt Timestamptz
        DateTime createdAt
        DateTime updatedAt
        # aiContents AICardContent[] (Relation)
        # frontAudioUrl, backAudioUrl REMOVED
    }

    AICardContent {
        String id PK "CUID"
        String cardId FK "CUID"
        AiContentType contentType "Enum"
        String language "e.g., en, ja, en-US"
        String content Text "Text or GCS Path"
        DateTime createdAt
        DateTime updatedAt
    }

    StudyLog {
        String id PK "CUID"
        DateTime reviewedAt
        StudyRating rating "Enum"
        Int previousInterval
        Float previousEaseFactor
        Int newInterval
        Float newEaseFactor
        DateTime nextReviewAt
        String userId FK "UUID"
        String cardId FK "CUID"
    }

    enum AiContentType {
        EXPLANATION
        TRANSLATION
        AUDIO_PRIMARY
        AUDIO_SECONDARY
        AUDIO_EXPLANATION
        AUDIO_TRANSLATION
    }

    enum StudyRating {
        AGAIN
        HARD
        GOOD
        EASY
    }
```
