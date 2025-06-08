# Error Handling Strategy v1.1

**(更新日: 2025-04-29)**

## 1. 目的 (変更なし)

アプリケーション全体で一貫性があり、予測可能で、デバッグしやすく、ユーザーにとっても分かりやすいエラーハンドリングを実現します。

## 2. 基本原則 (変更なし)

- **早期失敗:** 問題が発生したら、可能な限り早い段階で検知し、処理を中断します（ただし、ユーザー操作を不必要に妨げない範囲で）。
- **ログへのコンテキスト付与:** エラーログには、原因調査に必要な情報（リクエストID、ユーザーID、発生箇所、エラー詳細など）を含めます。
- **機密情報の非漏洩:** ユーザー向けの エラーメッセージには、システム内部の情報やスタックトレースなどの機密情報を含めません。
- **エラーレスポンスの標準化:** API が返すエラーレスポンスの形式を統一します。

## 3. カスタムエラークラス (`src/lib/errors.ts`) (変更なし)

アプリケーション固有のエラー状況を示すために、`Error` を継承したカスタムエラークラスを定義します。

- **ベースクラス (`AppError`):**
  - `statusCode` (HTTP status), `errorCode` (machine-readable string like `NOT_FOUND`), and optional `details` を持ちます。
- **具象クラス (例):**
  - `ValidationError` (400, `VALIDATION_ERROR`)
  - `AuthenticationError` (401, `AUTHENTICATION_FAILED`)
  - `PermissionError` (403, `PERMISSION_DENIED`)
  - `NotFoundError` (404, `RESOURCE_NOT_FOUND`)
  - `ConflictError` (409, `RESOURCE_CONFLICT`)
  - `ExternalApiError` (503, `EXTERNAL_API_FAILURE`)
  - `DatabaseError` (500, `DATABASE_ERROR`)
- **`isAppError`**: Type guard function.

## 4. エラーハンドリング: レイヤー別 (修正・統合)

### 4.1. Service Layer (`src/services/`)

- **General Guideline:** Services should handle expected operational errors (e.g., resource not found, validation failure, external API failure, DB constraint violation) and communicate them clearly to the caller (API layer). Unexpected errors (e.g., programming bugs, infrastructure issues) might still result in uncaught exceptions but should be minimized.
- **Two Patterns Used:**

  1.  **Returning `Result<T, AppError>` (Preferred for Mutations/Complex Logic):**
      - **Used In:** `deck.service::updateDeck`, `card.service::saveAiContent`, `ai.service::generateExplanation`, `ai.service::generateTranslation`, `ai.service::generateTtsAudio`.
      - **Why:** This pattern makes success and failure explicit in the return type. It forces the caller (API layer or potentially RSCs) to actively check the outcome using `if (result.ok)`. This is generally preferred for operations that modify data or involve external calls where failure is common and needs specific handling. It also aligns better with potential future direct usage from React Server Components (RSCs), as throwing errors directly from RSC data fetching can be problematic. It also aligns conceptually with error handling in languages like Go or Rust.
      - **Implementation:** Functions return `Promise<Result<SuccessType, AppError>>`. On success, return `{ ok: true, value: ... }`. On failure, create an appropriate `AppError` subclass (e.g., `NotFoundError`, `ConflictError`, `ExternalApiError`) and return `{ ok: false, error: ... }`. Internal `try...catch` blocks are used to catch errors (e.g., from Prisma or external APIs) and convert them into the error part of the `Result`. (See Section 5 for limited `try...catch` usage).
  2.  **Throwing `AppError` (Used for Getters/Deletes):**
      - **Used In:** `deck.service::getDeckById`, `deck.service::deleteDeck`, `card.service::getCardsByDeckId` (throws `DatabaseError`), `card.service::deleteCard`.
      - **Why:** For simpler "get" operations or delete operations where the primary expected error is "Not Found" (or a general DB error), directly throwing a specific `AppError` (like `NotFoundError` or `DatabaseError`) can be slightly more concise. The API layer's `handleApiError` is designed to catch these.
      - **Implementation:** Use `prisma.findUniqueOrThrow` or perform checks and `throw new NotFoundError(...)` etc. Use `try...catch` for unexpected database errors and `throw new DatabaseError(...)`. (See Section 5 for limited `try...catch` usage).

- **Decision Rationale (Result vs. Throw in Services):**
  - While initially some services used `throw` more broadly, the decision was made to adopt the `Result` pattern more consistently, especially for AI service calls and update operations. This was based on:
    - Desire for more explicit error handling paths.
    - Better alignment with potential future direct usage from RSCs.
    - Consistency with error handling idioms in languages like Go/Rust (a potential future direction mentioned by the user).
    - Existing use in `updateCard`/`updateDeck`.
  - Getters and Deletes remain using `throw` primarily for simplicity where `NotFoundError` is the main expected failure path, which `handleApiError` correctly translates to a 404 response.

### 4.2. API Route Handlers (`src/app/(api)/...`)

- **Centralized Handling:** All API route handlers (`GET`, `POST`, `PUT`, `DELETE`) wrap their main logic in a `try...catch` block at the top level. (See Section 5 for limited `try...catch` usage for specific operations like JSON parsing).
- **`handleApiError` Utility:** The `catch` block (and logic checking failed `Result` objects from services) **must** pass the caught error or the `error` from the `Result` object to the `handleApiError(error)` function located in `lib/errors.ts`.
- **Functionality:** `handleApiError` inspects the type of the error (`instanceof NotFoundError`, etc.) and returns a standardized `NextResponse` object with the appropriate HTTP status code (400, 401, 403, 404, 409, 500, 503) and a JSON body (`{ error: string, message: string, details?: unknown }`). This ensures consistent error responses across the entire API.
- **予期せぬ `Error` を catch した場合:**
  - **完全なエラー情報（スタックトレース含む）をログに記録します。**
  - クライアントには**汎用的な 500 エラーレスポンス**を返します: `{ "error": "INTERNAL_SERVER_ERROR", "message": "サーバー内部で予期せぬエラーが発生しました。" }`。**内部エラーの詳細はクライアントに漏洩させません。**

### 4.3. Frontend (Client Components / Hooks)

- **React Query:** API calls are primarily made using React Query hooks (`useQuery`, `useMutation` like `useDecks`, `useGenerateTts`, `useSaveAiContent`).
- **Error Handling:** These hooks expose `error`, `isError` states. Components should use these states to display appropriate error messages or UI feedback to the user. The `error` object received will typically be the `AppError` instance (or a generic error for network issues) constructed by the `apiClient` or returned by the API layer's error handler, containing the `message`, `errorCode`, `statusCode`, and potentially `details`. Callbacks like `onError` in `useMutation` options are used for side effects like showing toasts or alerts.
- **ユーザーへの表示:** エラーの種類に応じて、ユーザーに分かりやすいエラーメッセージを表示します（i18n 利用）。Toast 通知やフォームのインラインメッセージなどを使い分けます。
- **Error Boundary:** React の **Error Boundary** を利用して、レンダリング中の予期せぬエラーでアプリ全体がクラッシュするのを防ぎます。

## 5. `try...catch` の限定的な使用方針 (Next.js サーバーサイド) (変更なし、旧セクション4を移動)

**背景:**

Next.js のサーバーサイドコンテキスト (RSC, API Routes, Server Actions) では、フレームワークが内部的に `throw` を利用するケースがあります (例: `Suspense` のための Promise、`next/navigation` の `notFound()` や `redirect()`)。Next.js 公式ドキュメント (Learn Ch.13 Handling Errors) でも、`redirect()` が `try...catch` で捕捉される可能性について言及されています。

そのため、関数全体を囲むような広範囲な `try...catch` は、これらのフレームワークの挙動を意図せず妨げてしまうリスクがあり、原則として避けるべきです。

**基本方針:**

- トップレベルや広範囲な `try...catch` は使用しない (API Route Handler の最上位を除く)。
- エラーハンドリングは、可能な限り Result 型 (`{ ok: true, value: T } | { ok: false, error: E }`) や、事前のチェック (バリデーション、権限確認など) でエラー条件を判定し、早期リターン (`return { ok: false, error: ... }`) やカスタムエラー (`AppError` のサブクラス) の `throw` で行うことを基本とする。

**限定的な `try...catch` の使用:**

ただし、以下の特定のケースでは、Next.js 公式ドキュメントでも示唆されているように、**範囲を限定した `try...catch`** を使用することが現実的かつ推奨されます。

1.  **データベース操作 (Service 層):**

    - **対象:** `prisma.create()`, `prisma.update()`, `prisma.delete()` など。
    - **理由:** データベース接続エラー、予期せぬ制約違反、タイムアウトなど、事前に完全に予測・回避することが困難なランタイムエラーが発生する可能性があるため。
    - **目的:** これらの予期せぬ Prisma/DB エラーを捕捉し、ログに記録した上で、制御可能なカスタムエラー (例: `DatabaseError`) に変換して `Result` 型 (`{ ok: false, error: new DatabaseError(...) }`) として返すか、あるいは `throw new DatabaseError(...)` するため。
    - **例 (`services/card.service.ts` の `updateCard` 内):**
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
    - **対象:** `await request.json()` の呼び出し。
    - **理由:** クライアントから送信されるリクエストボディが不正な JSON 形式である可能性は常にあり、これは実行時にパースエラー (`SyntaxError`) として `throw` されるため。
    - **目的:** パースエラーを捕捉し、サーバーが 500 エラーでクラッシュするのを防ぎ、クライアントに適切な 400 Bad Request (`ValidationError`) を返すため。
    - **例 (`app/.../route.ts` 内):**
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

## 6. ログ記録 (変更なし、旧セクション7)

- API Routes で捕捉した全てのエラー（特に 500 系）は、**Google Cloud Logging** に記録します。
- リクエストID、ユーザーID（可能な場合）、エラーコード、メッセージ、スタックトレースなど、デバッグに必要なコンテキストを含めます。
- ログレベル（INFO, WARN, ERROR）を適切に使い分けます。

## 7. 監視 (変更なし、旧セクション8)

- **Google Cloud Monitoring** や **Error Reporting** を使用して、エラー率（特に 5xx）のスパイクや特定のエラーコードの頻発を監視し、アラートを設定します。
