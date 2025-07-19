# ImmersePal

[![Build Status](https://img.shields.io/github/actions/workflow/status/shibuyus/immersepal/build-and-push.yml?branch=main)](https://github.com/shibuyus/immersepal/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

生成AIと共に、言語学習者が実践的なコンテンツに触れる「イマージョン学習」を加速させるためのWebアプリケーション。

[**➡️ Live Demoはこちら**](https://immersepal.com)

---

###  Demo Account

すぐにアプリを試せるテスト用アカウントをご用意しています。

- **Email:** `a@b.c`
- **Password:** `abc123`

---

## Key Features

- **摩擦なきキャプチャー:** Webサイトや動画で出会った未知のフレーズを、文脈ごとストレスなく保存。
- **リアルなAI音声:** 自然なAI音声で、リスニングと発音練習を強力にサポート。
- **柔軟な学習管理:** デッキのシンプルさと、タグの柔軟性を両立させた独自の学習体験を提供。

---

## Screenshots

[デッキ一覧画面の画像]

[カード詳細画面の画像]

---

## 🛠️ Tech Stack

このプロジェクトは、TypeScriptをベースとしたフルスタック構成で構築されています。

**アプリケーション (Full-Stack TypeScript):**
- **Framework:** Next.js
- **UI Library:** React
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **ORM:** Prisma
- **Authentication:** Supabase Auth
- **Styling:** Tailwind CSS
- **Async State Management:** React Query
- **Internationalization (i18n):** next-intl

**インフラ & DevOps (Infrastructure & DevOps):**
- **Hosting:** Google Cloud Run
- **Storage:** Google Cloud Storage (GCS)
- **Generative AI:** Google Vertex AI, Google Cloud Text-to-Speech
- **IaC (Infrastructure as Code):** Terraform
- **CI/CD:** GitHub Actions
- **Containerization:** Docker

---

## Architecture & Design

このアプリケーションは、スケーラビリティと保守性を重視して設計されています。

- **コスト効率とスケーラビリティ:** ホスティングに`Google Cloud Run`を採用。アクセスがない時間帯はインスタンス数をゼロにするスケール・トゥ・ゼロにより、コストを最小限に抑えています。一方で、急なトラフィック増には自動でスケールアップ可能です。
  
- **フルスタックNext.js:** フロントエンドとバックエンドをNext.jsで統一し、シームレスな開発体験と高いパフォーマンスを目指しています。

- **Infrastructure as Code:** `Terraform`を用いて全てのインフラをコードで管理。手作業による設定ミスを防ぎ、誰でも同じ本番環境を再現可能です。

- **自動化されたCI/CD:** `GitHub Actions`により、`main`ブランチへのマージをトリガーに、テストから本番環境へのデプロイまでが自動化されています。

- **セキュアな認証:** `Workload Identity Federation`を活用し、CI/CDパイプラインはサービスアカウントキーなしで安全にGoogle Cloudリソースを操作します。

---

## 📝 Roadmap

- [ ] モバイルアプリ版の開発 (React Native / Expo)
- [ ] 学習リマインダー通知機能
- [ ] ユーザー間のデッキ共有機能

---

## 🚀　Getting Started

1.  **リポジトリをクローン:**
    ```bash
    git clone https://github.com/shibuyus/immersepal.git
    cd immersepal
    ```

2.  **環境変数の設定:**
    プロジェクトのルートに`.env.local`ファイルを作成し、SupabaseやGoogle Cloudのキーを設定してください。
    ```env
    # .env.local

    # Supabase
    NEXT_PUBLIC_SUPABASE_URL="<YOUR_SUPABASE_URL>"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="<YOUR_SUPABASE_ANON_KEY>"
    DATABASE_URL="<YOUR_SUPABASE_DATABASE_URL_WITH_POOLER>"
    DIRECT_URL="<YOUR_SUPABASE_DIRECT_DATABASE_URL>"
    DB_PASSWORD="<YOUR_SUPABASE_DB_PASSWORD>"
    SUPABASE_SERVICE_ROLE_KEY="<YOUR_SUPABASE_SERVICE_ROLE_KEY>"
    
    # Google Cloud
    GCP_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"
    GCS_BUCKET_NAME="<YOUR_GCS_BUCKET_NAME>"
    GOOGLE_APPLICATION_CREDENTIALS="<YOUR_LOCAL_PATH_TO_GCP_KEY_FILE>.json"
    ```


3.  **依存関係のインストール:**
    このプロジェクトでは`bun`を使用します。
    ```bash
    bun install
    ```

4.  **Prisma Clientの生成:**
    ```bash
    bunx prisma generate
    ```

5.  **開発サーバーの起動:**
    ```bash
    bun run dev
    ```
    ブラウザで `http://localhost:3000` を開いてください。

---

## 📄 ライセンス (License)

このプロジェクトはMITライセンスです。
