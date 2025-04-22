This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

## Additional Info

# Directory Structure
```
api-design.md
coding-style.md
error-handling.md
feature-deck-details.md
testing-strategy.md
```

# Files

## File: api-design.md
````markdown
# API 設計原則

## 1. 目的

このドキュメントは、本アプリケーションにおける API 設計の一貫性、保守性、およびクライアント（Web, Mobile アプリなど）からの利用しやすさを確保するための原則を定義します。RESTful な考え方を参考にしつつ、Next.js API Routes のコンテキストに合わせて適用します。

## 2. クライアントニュートラル

API は特定のクライアント（例：Web ブラウザ）の実装詳細に依存せず、データや機能を提供することに焦点を当てます。クライアント側が必要なデータを取得し、自身のロジックで表示や処理を行うことを基本とします。

## 3. エンドポイント命名規則

* **リソースベース:** URL は操作（Verb）ではなく、操作対象のリソース（Noun）を表す名詞を中心に設計します。原則として複数形を使用します（例: `/decks`, `/cards`）。
* **階層構造:** リソース間の関連はパスの階層で表現します（例: `/decks/{deckId}/cards`）。
* **パスセグメント:** 基本的に `camelCase` またはリソース名そのものを使用します。複数単語の場合は `kebab-case` も許容しますが、一貫性を保ちます。（プロジェクトとして **`camelCase` を推奨**）

## 4. HTTP メソッド

標準的な HTTP メソッドを以下のように使い分けます。

* `GET`: リソースの取得
* `POST`: リソースの新規作成
* `PUT`: リソースの完全な置換・更新
* `PATCH`: リソースの部分的な更新（必須ではなく、`PUT` での更新を基本としても良い）
* `DELETE`: リソースの削除

## 5. リクエスト/レスポンス形式

* **データ形式:** リクエストボディ、レスポンスボディ共に **JSON** を使用します。
* **ヘッダー:** `Content-Type: application/json` を適切に設定します。

## 6. データ転送オブジェクト (DTO)

* API でやり取りされるデータの構造は、`src/types/api.types.ts` で TypeScript の `type` または `interface` を用いて明確に定義します。
* リクエストボディのバリデーションは、API Routes のハンドラ内で `src/lib/zod.ts` で定義された Zod スキーマを用いて行います。

## 7. 認証・認可

* **認証:** Supabase Auth が提供する JWT を用いたステートレス認証を基本とします。クライアントは `Authorization: Bearer <token>` ヘッダーでトークンを送信します。
* **認可:**
    * 保護された API エンドポイントでは、必ず `src/lib/auth.ts` のヘルパー等を用いてトークンを検証し、有効なユーザーセッションであることを確認します。
    * ユーザー自身のデータへのアクセス制御は、主に **Supabase の Row Level Security (RLS)** によってデータベースレベルで強制します。API ルート側で追加の認可チェックが必要な場合のみ実装します。

## 8. ステータスコード

標準的な HTTP ステータスコードを適切に返却します。

* **成功:** `200 OK`, `201 Created`, `204 No Content`
* **クライアントエラー:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`
* **サーバーエラー:** `500 Internal Server Error`, `503 Service Unavailable`

## 9. エラーレスポンス

エラー発生時は、`error-handling.md` で定義された標準 JSON 形式でレスポンスを返却します。（例: `{ "error": "ERROR_CODE", "message": "説明", "details": [...] }`）

## 10. JSON キー命名規則

API で使用する JSON オブジェクトのキーは **`camelCase`** で統一します。

## 11. バージョニング

初期リリースでは考慮しません。将来的に API の破壊的変更が必要になった場合は、URL パス (`/api/v2/...`) またはカスタムヘッダーによるバージョニングを検討します。

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
````

## File: coding-style.md
````markdown
# コーディングスタイルガイド

## 1. 目的

コードの一貫性、可読性、保守性を高めるためのスタイルガイドです。

## 2. 自動化ツール

* **フォーマッター:** **Prettier** を使用します。設定はプロジェクトルートのファイル (`prettier.config.js` or `package.json`) に従います。エディタでの自動整形と CI でのチェック (`prettier --check`) を推奨します。
* **リンター:** **ESLint** を使用します。設定は `.eslintrc.json` に従い、TypeScript, React, React Hooks, Next.js 用のプラグインを適切に設定します。エディタでのリアルタイムチェックと CI でのチェック (`eslint .`) を推奨します。

## 3. TypeScript

* `tsconfig.json` で `strict: true` を有効にします。
* `any` 型の使用は原則禁止します。具体的な型、`unknown`、ジェネリクスを適切に使用します。
* 型エイリアス (`type`) とインターフェース (`interface`) は、プロジェクト内で一貫した方針で使用します。（例: オブジェクトや関数の型には `type` を優先的に使用する）。
* ユーティリティ型 (`Partial`, `Readonly` など) を適切に活用します。

## 4. 命名規則

* **変数、関数:** `camelCase`
* **クラス、コンポーネント、型エイリアス、インターフェース:** `PascalCase`
* **定数:** `UPPER_SNAKE_CASE`
* **ファイル名:**
    * 一般的な `.ts` ファイル: `kebab-case.ts` (推奨)
    * React コンポーネントファイル (`.tsx`): `PascalCase.tsx`
    * テストファイル: `*.test.ts` または `*.spec.ts`

## 5. React / Next.js

* 関数コンポーネントと Hooks を使用します。
* React Hooks のルールを遵守します。
* Next.js App Router の規約（ディレクトリ構造、ファイル命名など）に従います。
* コンポーネントは小さく、単一責任の原則 (SRP) を意識します。

## 6. コメント

* コードを読めばわかる「何をしているか」ではなく、**「なぜ」** そのような実装にしたのか、という意図や背景、複雑なロジックの要点を説明するために書きます。
* `lib` や `services` 内の複雑な関数や公開するモジュールには JSDoc 形式でのコメントを推奨します。
* コミット前に不要なコメントアウトされたコードは削除します。

## 7. インポート (`import`)

* ESLint のプラグイン (`eslint-plugin-import` など) や Prettier を利用して、インポート順序を自動で整理します (例: 外部ライブラリ → 内部絶対パス (`@/`) → 相対パス)。
* `tsconfig.json` の `paths` を設定し、深い階層からの相対パス (`../../...`) を避けるために絶対パス (`@/components/...`) を可能な限り使用します。

## 8. エラーハンドリング

`docs/error-handling.md` で定義された戦略に従います。

## 9. シンプルさ

複雑すぎる実装や時期尚早な最適化よりも、明確でシンプルなコードを優先します。
````

## File: error-handling.md
````markdown
# エラーハンドリング戦略

## 1. 目的

アプリケーション全体で一貫性があり、予測可能で、デバッグしやすく、ユーザーにとっても分かりやすいエラーハンドリングを実現します。

## 2. 基本原則

* **早期失敗:** 問題が発生したら、可能な限り早い段階で検知し、処理を中断します（ただし、ユーザー操作を不必要に妨げない範囲で）。
* **ログへのコンテキスト付与:** エラーログには、原因調査に必要な情報（リクエストID、ユーザーID、発生箇所、エラー詳細など）を含めます。
* **機密情報の非漏洩:** ユーザー向けの エラーメッセージには、システム内部の情報やスタックトレースなどの機密情報を含めません。
* **エラーレスポンスの標準化:** API が返すエラーレスポンスの形式を統一します。

## 3. カスタムエラークラス (`src/lib/errors.ts`)

アプリケーション固有のエラー状況を示すために、`Error` を継承したカスタムエラークラスを定義します。

* **ベースクラス (例):**
    ```typescript
    export class AppError extends Error {
      public readonly statusCode: number;
      public readonly errorCode: string; // エラーコード (文字列Enumなど)
      public readonly details?: any; // 追加情報

      constructor(message: string, statusCode: number, errorCode: string, details?: any) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype); // V8 workaround
        Error.captureStackTrace(this, this.constructor); // Optional: for better stack traces
      }
    }
    ```
* **具象クラス (例):**
    * `ValidationError extends AppError` (statusCode: 400, errorCode: 'VALIDATION_ERROR')
    * `AuthenticationError extends AppError` (statusCode: 401, errorCode: 'AUTHENTICATION_FAILED')
    * `PermissionError extends AppError` (statusCode: 403, errorCode: 'PERMISSION_DENIED')
    * `NotFoundError extends AppError` (statusCode: 404, errorCode: 'RESOURCE_NOT_FOUND')
    * `ConflictError extends AppError` (statusCode: 409, errorCode: 'RESOURCE_CONFLICT')
    * `ExternalApiError extends AppError` (statusCode: 503, errorCode: 'EXTERNAL_API_FAILURE')
    * `DatabaseError extends AppError` (statusCode: 500, errorCode: 'DATABASE_ERROR') // 500系はコードを返さない場合も

## 4. バックエンド (Service 層)

* データベース操作や外部 API 呼び出しは `try...catch` で囲みます。
* Prisma や GCP Client Library などがスローする固有のエラーを捕捉し、上で定義した適切な `AppError` にラップ（変換）して throw します。元のエラーはログ記録のために保持することもあります。
* ビジネスルール違反（例：他人のデッキを編集しようとした）の場合も、適切な `AppError` (例: `PermissionError`) を throw します。

## 4. try...catch の限定的な使用方針 (Next.js サーバーサイド)

**(このセクションを既存のセクションの後に追加)**

**背景:**

Next.js のサーバーサイドコンテキスト (RSC, API Routes, Server Actions) では、フレームワークが内部的に `throw` を利用するケースがあります (例: `Suspense` のための Promise、`next/navigation` の `notFound()` や `redirect()`)。Next.js 公式ドキュメント (Learn Ch.13 Handling Errors) でも、`redirect()` が `try...catch` で捕捉される可能性について言及されています。

そのため、関数全体を囲むような広範囲な `try...catch` は、これらのフレームワークの挙動を意図せず妨げてしまうリスクがあり、原則として避けるべきです。

**基本方針:**

* トップレベルや広範囲な `try...catch` は使用しない。
* エラーハンドリングは、可能な限り Result 型 (`{ ok: true, value: T } | { ok: false, error: E }`) や、事前のチェック (バリデーション、権限確認など) でエラー条件を判定し、早期リターン (`return { ok: false, error: ... }`) やカスタムエラー (`AppError` のサブクラス) の `throw` で行うことを基本とする。

**限定的な `try...catch` の使用:**

ただし、以下の特定のケースでは、Next.js 公式ドキュメントでも示唆されているように、**範囲を限定した `try...catch`** を使用することが現実的かつ推奨されます。

1.  **データベース操作 (Service 層):**
    * **対象:** `prisma.create()`, `prisma.update()`, `prisma.delete()` など。
    * **理由:** データベース接続エラー、予期せぬ制約違反、タイムアウトなど、事前に完全に予測・回避することが困難なランタイムエラーが発生する可能性があるため。
    * **目的:** これらの予期せぬ Prisma/DB エラーを捕捉し、ログに記録した上で、制御可能なカスタムエラー (例: `DatabaseError`) に変換して `Result` 型 (`{ ok: false, error: new DatabaseError(...) }`) として返すか、あるいは `throw new DatabaseError(...)` するため。
    * **例 (`services/card.service.ts` の `updateCard` 内):**
      ```typescript
      try {
        const updatedCard = await prisma.card.update({ ... });
        return { ok: true, value: updatedCard };
      } catch (error) {
        console.error('Database error during card update:', error);
        return { ok: false, error: new DatabaseError('Failed to update card.', error instanceof Error ? error : undefined) };
      }
      ```

2.  **リクエストボディの JSON パース (API Route Handler):**
    * **対象:** `await request.json()` の呼び出し。
    * **理由:** クライアントから送信されるリクエストボディが不正な JSON 形式である可能性は常にあり、これは実行時にパースエラー (`SyntaxError`) として `throw` されるため。
    * **目的:** パースエラーを捕捉し、サーバーが 500 エラーでクラッシュするのを防ぎ、クライアントに適切な 400 Bad Request (`ValidationError`) を返すため。
    * **例 (`app/.../route.ts` 内):**
      ```typescript
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return handleApiError(new ValidationError('Invalid JSON body.')); // または直接 NextResponse を返す
      }
      // body を使った処理...
      ```

**結論:**

`try...catch` を完全に排除するのではなく、**「フレームワークの邪魔をせず、かつ、避けられないランタイムエラーを適切に処理する」** というバランスを取るために、データベース操作や JSON パースなど、**限定的かつ具体的な箇所**でのみ `try...catch` を使用する方針とします。それ以外のエラーハンドリングは Result 型や事前チェックを基本とします。

## 5. バックエンド (API Routes)

* 各ルートハンドラでトップレベルの `try...catch` を使用します。
* **`AppError` を catch した場合:**
    * `error.statusCode` を HTTP ステータスコードとして設定します。
    * 標準形式の JSON レスポンスを返します: `{ "error": error.errorCode, "message": error.message, "details": error.details }`。メッセージは必要に応じて i18n 化します。
* **予期せぬ `Error` を catch した場合:**
    * **完全なエラー情報（スタックトレース含む）をログに記録します。**
    * クライアントには**汎用的な 500 エラーレスポンス**を返します: `{ "error": "INTERNAL_SERVER_ERROR", "message": "サーバー内部で予期せぬエラーが発生しました。" }`。**内部エラーの詳細はクライアントに漏洩させません。**

## 6. フロントエンド

* API 呼び出しを `try...catch` するか、データフェッチライブラリ（React Query/SWR）のエラーハンドリング機能を利用します。
* API からのレスポンスステータスコードとエラーレスポンスボディを確認します。
* エラーの種類に応じて、ユーザーに分かりやすいエラーメッセージを表示します（i18n 利用）。Toast 通知やフォームのインラインメッセージなどを使い分けます。
* React の **Error Boundary** を利用して、レンダリング中の予期せぬエラーでアプリ全体がクラッシュするのを防ぎます。

## 7. ログ記録

* API Routes で捕捉した全てのエラー（特に 500 系）は、**Google Cloud Logging** に記録します。
* リクエストID、ユーザーID（可能な場合）、エラーコード、メッセージ、スタックトレースなど、デバッグに必要なコンテキストを含めます。
* ログレベル（INFO, WARN, ERROR）を適切に使い分けます。

## 8. 監視

* **Google Cloud Monitoring** や **Error Reporting** を使用して、エラー率（特に 5xx）のスパイクや特定のエラーコードの頻発を監視し、アラートを設定します。
````

## File: feature-deck-details.md
````markdown
# Plan: Deck Detail Page Feature

This document outlines the plan for implementing the Deck Detail Page feature.

## Phase 1: Backend Data Fetching Logic

1.  **Enhance `deck.service.ts`:**
    *   Define a new asynchronous function `getDeckById(userId: string, deckId: string)`.
    *   Use `prisma.deck.findUniqueOrThrow` (or `findUnique` with manual error handling) to retrieve a specific deck by its `id`.
    *   Use Prisma's `include` option to fetch associated `cards` along with the deck data.
    *   Verify `userId` matches the deck's `userId` for authorization. Throw `PermissionError` if mismatched.
    *   Handle potential `NotFoundError` if the deck doesn't exist.
    *   Handle other potential `DatabaseError` instances.

2.  **Implement API Endpoint (`GET /api/decks/[deckId]`)**:
    *   In `src/app/[locale]/(api)/api/decks/[deckId]/route.ts`, add a new `async function GET(request: Request, { params }: { params: { deckId: string; locale: string } })`.
    *   **Refined Error Handling:**
        *   Check authentication using `getServerUserId()`. Return 401 (`UNAUTHORIZED`) if no user ID.
        *   Use a `try...catch` block for the main logic.
        *   Inside `try`: Call `getDeckById(userId, deckId)`. Return deck data with 200 status on success.
        *   Inside `catch`:
            *   Log the error server-side.
            *   Check `isAppError(error)`:
                *   `NotFoundError`: Return 404 (`NOT_FOUND`).
                *   `PermissionError`: Return 403 (`FORBIDDEN`).
                *   `DatabaseError`: Return 500 (`DATABASE_ERROR`).
                *   Other `AppError`: Return 500 (using `error.name`).
            *   Unexpected errors: Return 500 (`INTERNAL_SERVER_ERROR`).
        *   Return errors as structured JSON: `{ error: 'CODE', message: 'Description' }`.

## Phase 2: Frontend Page Implementation

1.  **Create Page Component (`src/app/[locale]/(app)/(main)/decks/[deckId]/page.tsx`)**:
    *   Create the new file.
    *   Define a React Server Component (RSC) receiving `params` (`deckId`, `locale`).
    *   Fetch data from `GET /api/decks/[deckId]` using `fetch`.
    *   Handle loading and error states based on the API response.
    *   On success:
        *   Display deck `name` and `description`.
        *   Map over the `cards` array and display `front`/`back` for each.
        *   Utilize UI components for styling.

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant Page as DeckDetailPage <br> (page.tsx)
    participant API as GET /api/decks/[deckId] <br> (route.ts)
    participant Service as deck.service.ts
    participant DB as Prisma/Database

    User->>Page: Navigates to /decks/[deckId]
    Page->>API: Fetch deck data (using fetch API)
    API->>Service: Calls getDeckById(userId, deckId)
    Service->>DB: prisma.deck.findUnique({ where: { id, userId }, include: { cards: true } })
    DB-->>Service: Returns deck data with cards (or throws error)
    alt Deck Found & Authorized
        Service-->>API: Returns deck data
        API-->>Page: Returns JSON response (200 OK)
        Page->>User: Renders deck name, description, and card list
    else Not Found / Unauthorized / DB Error
        Service-->>API: Throws specific error (NotFoundError, PermissionError, DatabaseError)
        API-->>Page: Returns JSON error response (404, 403, 500)
        Page->>User: Renders appropriate error message
    end
````

## File: testing-strategy.md
````markdown
# テスト戦略

## 1. 目的

本アプリケーションの品質を確保し、継続的な改善と安定した運用を可能にするため、以下のテスト戦略を定義します。

* バグの早期発見と修正コストの低減
* リグレッション（機能低下）の防止
* 安全なリファクタリングの実現
* 仕様のドキュメント化
* デプロイへの信頼性向上

## 2. 基本方針

* **テストピラミッド/トロフィー:** ユニットテストを土台とし、結合テスト、E2E テストをバランス良く組み合わせます。
* **振る舞いのテスト:** 実装の詳細ではなく、コードが外部から見てどのように振る舞うべきかをテストします。
* **テストの品質:** テストは信頼性が高く（Flaky Test を避ける）、実行速度が速く、保守しやすい状態を保ちます。
* **テストファイルの配置:** テスト対象のソースファイルと同じディレクトリに `*.test.ts` または `*.spec.ts` として配置します (Co-location)。

## 3. テストの種類とツール

* **ユニットテスト (Unit Tests):**
    * **対象:** 個別の関数、フック、UI コンポーネントの表示ロジック、ユーティリティ (`lib`, `hooks`, `components/ui`, `services` のコアロジック)。
    * **ツール:** Vitest (または Jest), React Testing Library (RTL)。
    * **目的:** モジュール単体のロジック検証。依存関係はモック化。高速実行。カバレッジ目標の中心（例: `lib`/`services` で 70-80%）。
* **結合テスト (Integration Tests):**
    * **対象:** 複数モジュール間の連携。API ルートと Service 層の連携、Service 層と DB (テスト用 DB) の連携、UI コンポーネントとカスタムフック/API モックの連携など。
    * **ツール:** Vitest (または Jest), RTL, Supertest (API Routes), Mock Service Worker (MSW), テスト用データベース。
    * **目的:** モジュール間のインターフェースやデータフローの検証。
* **E2E テスト (End-to-End Tests):**
    * **対象:** 主要なユーザーストーリー（例: ログイン〜デッキ作成〜単語登録〜学習完了）。
    * **ツール:** Playwright (推奨) または Cypress。
    * **目的:** システム全体がユーザー視点で正しく動作することの最終確認。コストが高いため、クリティカルパスに限定して実施。

## 4. テスト対象範囲

* **バックエンド (`app/(api)`, `services`, `lib`):** ユニットテストと結合テストを重点的に実施。
* **フロントエンド (`app/(app)`, `components`, `hooks`):** ユニットテスト (RTL) と結合テスト (RTL) を中心に。重要なフローは E2E でカバー。
* **データベース:** Service 層の結合テストで検証。RLS ポリシーは手動確認または専用のテストスクリプトで検証。
* **AI 連携:** 基本的に AI クライアントはモック化してテスト。必要であれば、AI サービス自体との疎通を確認するテストを別途用意（CI では頻繁に実行しない）。

## 5. テスト実行

* **ローカル:** 開発者が開発中に随時実行。
* **CI/CD:** GitHub Actions で Push/PR をトリガーに自動実行。テスト失敗時はマージ/デプロイをブロック。

## 6. テストデータ

テストデータの準備・管理方法を定義する必要があります（例: ファクトリ関数、テストDB のシーディングスクリプト）。

## 7. テストカバレッジ

* CI でカバレッジレポートを生成・確認します。
* カバレッジ率はテストされていない箇所を見つけるための**指標**とし、絶対的な品質基準とはしません。重要なロジックや複雑な分岐を網羅することを目指します。
````
