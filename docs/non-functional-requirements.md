# 非機能要件 v1.1 (2025-04-22)

このドキュメントは、アプリケーションの品質特性に関する要件と方針を定義します。

## 1. パフォーマンス

* **目標:** ユーザーがストレスなく利用できる応答速度。
* **指標:** Core Web Vitals「良好」、主要操作 < 1s、通常 API < 500ms (P95)。AI コンテンツ取得 < 500ms。
* **対策:** DB インデックス、React Query キャッシュ、AI 結果キャッシュ、Next.js レンダリング最適化、Cloud Run スケール。

## 2. スケーラビリティ

* **目標 (MVP/初期):** ピーク時同時接続ユーザー数 千人規模 (`~5,000`)。
* **目標 (将来):** 常時接続 100 万人超 (※大幅なアーキテクチャ変更前提)。
* **構成:** Cloud Run, Supabase PostgreSQL, GCP AI/GCS。
* **対策:** DB接続 Pooler URL + `?pgbouncer=true&connection_limit=1`。将来的に DB スケーリング等を検討。

## 3. セキュリティ

* **認証:** Supabase Auth (Email/Password, JWT Cookie)。
* **認可:** **Supabase RLS** 必須。Service 層でも所有権チェック。
* **入力検証:** Zod (`lib/zod.ts`) を用い、API Routes で検証。
* **API 保護:** レート制限は将来検討。要認証 API は `getServerUserId` で確認。
* **機密情報管理:** `.env.local`, Google Secret Manager + Cloud Run 環境変数。
* **依存関係:** 定期的な脆弱性チェック・アップデート。

## 4. 信頼性・可用性

* **目標:** 稼働率 99.5% 〜 99.9%。
* **エラーハンドリング:** カスタム `AppError` (`lib/errors.ts`)。API で標準化されたエラーレスポンス (`docs/error-handling.md`)。カード更新のみ `Result` パターン試行済。
* **監視:** Google Cloud Monitoring/Logging/Error Reporting 活用。アラート設定。
* **バックアップ・リカバリ:** Supabase 自動バックアップ、GCS バージョニング検討、CI/CD ロールバック手順。
* **冗長性:** クラウドサービスのリージョン内冗長性活用。

## 5. 保守性

* **コード品質:** ESLint/Prettier 強制。TypeScript `strict`。Clean Code (`docs/coding-style.md`)。
* **テスト:** ユニット/結合/E2E。CI で自動実行 (`docs/testing-strategy.md`)。コアロジックのカバレッジ重視。
* **ドキュメンテーション:** `README.md`, `docs/` ディレクトリ、JSDoc。
* **ディレクトリ構造:** レイヤー分離、関心事分離。**★ API ルートは `src/app/(api)/api/...` に配置し、UI ルーティング (`src/app/[locale]/...`) から分離。**
* **依存関係:** 定期的な管理。
* **CI/CD:** GitHub Actions で自動化。

## 6. 国際化 (i18n)

* **ライブラリ:** `next-intl`。
* **ルーティング:** パスベース。**★ UI ページのみ `app/[locale]/...` を使用。** デフォルトロケール `en` はプレフィックスなし。`ja` は `/ja` 付き。
* **API:** API ルート (`/api/...`) はロケールプレフィックスを**含まない**。API レスポンスの言語は、必要なら `Accept-Language` ヘッダーで判定 (現状未実装)。
* **実装:** `middleware.ts` (`api` 除外 matcher)、`NextIntlClientProvider`, `useTranslations` 等。

## 7. アクセシビリティ (a11y)

* WCAG を意識し、可能な範囲で配慮する (努力目標)。

## 8. その他開発関連

* **実行環境 (開発):** **`npm run dev`** を使用。
* **UI ライブラリ:** Tamagui 導入済みだが、React 19/Next.js 15 との互換性問題発生中。主要箇所で標準 HTML + Tailwind に代替中。根本解決はバージョンダウン等を検討。

---