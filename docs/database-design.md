# データベース設計 v1.1 (AICardContent 導入)

**(更新日: 2025-04-25)**

## 1. 背景と目的

当初のデータベース設計では、`Card` モデル内に AI が生成する解説 (`explanation`) と翻訳 (`translation`) を直接カラムとして保持していました。

しかし、今後のアプリケーションの発展、特に**多言語対応**（1つのカードに対して複数言語の解説や翻訳を持たせる可能性）や、**ユーザーの多様な学習スタイル**（例: 学習中の言語での解説と母国語の翻訳を併用したい）への対応を考慮した結果、AI が生成するテキストコンテンツをより柔軟に管理できる設計が必要と判断しました。

そのため、拡張性と柔軟性を高めることを目的に、AI 生成コンテンツ（現時点では解説と翻訳）を `Card` モデルから分離し、専用のテーブル (`AICardContent`) で管理する方針へと変更します。

## 2. 主要な変更点

1.  **`AICardContent` テーブルの新設:**
    - AI によって生成されたテキストコンテンツ（解説、翻訳）を格納するための新しいテーブルを作成します。
    - 各コンテンツがどのカードに属するか (`cardId`)、コンテンツの種類 (`contentType`)、コンテンツの言語 (`language`) を区別して管理します。
2.  **`Card` モデルの変更:**
    - 既存の `explanation` および `translation` カラムを削除します。
    - （注意: `frontAudioUrl` と `backAudioUrl` は、現時点ではシンプルさを考慮し `Card` モデルに残します。将来的に `AICardContent` で管理することも検討可能です。）
3.  **リレーションの追加:**
    - `Card` モデルと `AICardContent` モデルの間に 1 対多のリレーションを設定します (`Card` 1件に対して複数の `AICardContent` レコードが紐づく）。

## 3. 新しいスキーマ定義 (`prisma/schema.prisma`)

### 3.1. Enum: `AiContentType` (新規追加)

コンテンツの種類（解説か翻訳か）を定義します。

```prisma
enum AiContentType {
  EXPLANATION // 解説
  TRANSLATION // 翻訳
}
```

### 3.2. Model: `AICardContent` (新規追加)

AI 生成コンテンツを格納する新しいモデルです。

```prisma
model AICardContent {
  id          String        @id @default(cuid())
  cardId      String        // どのカードのコンテンツか (Cardへの参照)
  card        Card          @relation(fields: [cardId], references: [id], onDelete: Cascade) // Cardとのリレーション
  contentType AiContentType // コンテンツの種類 (EXPLANATION | TRANSLATION)
  language    String        // コンテンツの言語コード (e.g., 'en', 'ja', 'es')
  content     String        @db.Text // 解説や翻訳のテキスト本体

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  // 同じカードに同じ種類・同じ言語のコンテンツは原則1つ
  @@unique([cardId, contentType, language])
  @@index([cardId]) // カードIDでの検索用
  @@index([cardId, contentType]) // 特定タイプのコンテンツ取得用
}
```

### 3.3. Model: `Card` (変更後 - AI関連部分)

`explanation`, `translation` を削除し、`aiContents` リレーションを追加します。

```prisma
model Card {
  id            String    @id @default(cuid())
  front         String    @db.Text
  back          String    @db.Text
  deckId        String
  deck          Deck      @relation(fields: [deckId], references: [id], onDelete: Cascade)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  // userId     String?   @db.Uuid // RLS用にあれば

  // --- 音声URLは Card に残す (現時点) ---
  frontAudioUrl String?   @db.Text
  backAudioUrl  String?   @db.Text

  // --- SRSメタデータ ---
  interval      Int       @default(0)
  easeFactor    Float     @default(2.5)
  nextReviewAt  DateTime  @default(now()) @db.Timestamptz // 型修正: Timestamptz

  // --- リレーション ---
  studyLogs     StudyLog[]
  // ↓↓↓ AICardContent へのリレーション ↓↓↓
  aiContents    AICardContent[]

  @@index([deckId])
  @@index([nextReviewAt])
  // 複合インデックス（必要に応じて検討）
  // @@index([deckId, nextReviewAt])
}
```

_(注: Card モデルの `nextReviewAt` の型を `@db.Timestamptz` に修正しました。PostgreSQL でタイムゾーン付きのタイムスタンプを扱う場合、こちらがより適切です。)_

### 3.4. リレーション図 (Mermaid 形式)

```mermaid
erDiagram
    Card ||--o{ AICardContent : has
    Card {
        String id PK
        String front Text
        String back Text
        String deckId FK
        String frontAudioUrl Text nullable
        String backAudioUrl Text nullable
        DateTime createdAt
        DateTime updatedAt
        Int interval
        Float easeFactor
        DateTime nextReviewAt Timestamptz
        # ... other Card fields ...
    }
    AICardContent {
        String id PK
        String cardId FK
        AiContentType contentType
        String language
        String content Text
        DateTime createdAt
        DateTime updatedAt
    }
    enum AiContentType {
        EXPLANATION
        TRANSLATION
    }
```

_(Mermaid 図も型情報を少し追加しました)_

## 4. 採用理由

- **多言語対応の実現:** 1つのカードに対し、複数言語の解説・翻訳を `language` フィールドで区別して格納できる。
- **コンテンツ種類の拡張性:** 将来的に「難易度別解説」や「例文」など、新しい種類の AI コンテンツを追加する場合、`AiContentType` Enum を拡張するだけで対応可能。
- **`Card` モデルの関心の分離:** カードのコア情報（表裏、SRS データ）と、付加的な AI 生成コンテンツを分離できる。
- **ユーザーの多様な学習スタイルへの対応:** 「英語の解説」と「日本語の翻訳」を同時に取得・表示するなど、柔軟な情報提示が可能になる。

## 5. パフォーマンスに関する考慮事項

`Card` データと一緒に `AICardContent` を取得する際には、Prisma の `include` 機能を使用します。関連するテーブルアクセスが増える可能性はありますが、以下の対策によりパフォーマンスへの影響は最小限に抑えられる見込みです。

- `AICardContent` テーブルに適切なインデックス（`cardId`, `contentType`, `language` など）を設定する。
- フロントエンドで不要なコンテンツまで取得しないように、必要な `contentType` や `language` でフィルタリングする（例: ユーザー設定に基づいて表示する言語を選択）。

これらの対策により、UX に影響が出るほどの顕著なパフォーマンス低下は通常発生しないと考えられます。

## 6. 影響範囲 (概要)

このデータベース設計変更は、アプリケーションの以下の部分に影響を与えます。

- **Prisma スキーマ:** 上記の通り変更し、マイグレーションを実行する必要があります。
- **サービス層 (`card.service.ts`, `ai.service.ts` など):** AI コンテンツの保存ロジック（`prisma.aICardContent.create` を使用）および取得ロジック（`include: { aiContents: true }` など）の修正が必要です。
- **API レスポンスと型定義 (`types/api.types.ts`):** カードデータの型定義から `explanation`, `translation` を削除し、代わりに `aiContents` 配列を含むように修正が必要です。
- **フロントエンド:** カードデータを表示するコンポーネント (`CardList` など) や、AI コンテンツを利用する機能（解説表示、翻訳表示など）の修正が必要です。データ構造の変更に対応する必要があります。
