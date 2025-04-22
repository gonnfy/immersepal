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

