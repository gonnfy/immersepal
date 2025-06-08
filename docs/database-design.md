# データベース設計 v1.2 (AICardContent 拡充: 音声対応)

**(更新日: 2025-04-29)**

## 1. 背景と目的 (変更なし)

当初のデータベース設計では、`Card` モデル内に AI が生成する解説 (`explanation`) と翻訳 (`translation`) を直接カラムとして保持していました。

しかし、今後のアプリケーションの発展、特に**多言語対応**（1つのカードに対して複数言語の解説や翻訳を持たせる可能性）や、**ユーザーの多様な学習スタイル**（例: 学習中の言語での解説と母国語の翻訳を併用したい）への対応を考慮した結果、AI が生成するテキストコンテンツをより柔軟に管理できる設計が必要と判断しました。

さらに、**音声コンテンツ**（テキスト読み上げ）の導入に伴い、テキストだけでなく音声ファイルの参照情報も一元的に管理する必要が出てきました。

そのため、拡張性と柔軟性を高めることを目的に、AI 生成コンテンツ（解説、翻訳、音声ファイル情報）を `Card` モデルから分離し、専用のテーブル (`AICardContent`) で管理する方針へと変更します。

## 2. 主要な変更点

1.  **`AICardContent` テーブルの新設:**
    - AI によって生成されたコンテンツ（解説テキスト、翻訳テキスト、**音声ファイルの GCS パス**）を格納するための新しいテーブルを作成します。
    - 各コンテンツがどのカードに属するか (`cardId`)、コンテンツの種類 (`contentType`)、コンテンツの言語 (`language`) を区別して管理します。
2.  **`Card` モデルの変更:**
    - 既存の `explanation` および `translation` カラムを削除します。
    - **(追記)** 既存の `frontAudioUrl` および `backAudioUrl` カラムを削除。音声情報も `AICardContent` で管理するため。
    - `AICardContent` モデルとの 1 対多リレーションを設定 (`aiContents AICardContent[]`)。
3.  **`AiContentType` Enum の更新:**
    - コンテンツの種類（解説、翻訳、**または音声**）を定義する Enum を更新し、音声の種類を詳細化しました。
4.  **リレーションの追加:**
    - `Card` モデルと `AICardContent` モデルの間に 1 対多のリレーションを設定します (`Card` 1件に対して複数の `AICardContent` レコードが紐づく）。

### 2.1. `AICardContent` テーブルの新設 (変更なし)

(このセクションは元の v1.1 の内容を指していると思われるため、実質的には上記 1. と統合される)
... (v1.1 の内容がここにあったと仮定) ...

### 2.2. `Card` モデルの変更

- 既存の `explanation` および `translation` カラムを削除。
- **(追記)** 既存の `frontAudioUrl` および `backAudioUrl` カラムを削除。音声情報も `AICardContent` で管理するため。
- `AICardContent` モデルとの 1 対多リレーションを設定 (`aiContents AICardContent[]`)。

### 2.3. `AiContentType` Enum の更新

コンテンツの種類（解説、翻訳、**または音声**）を定義します。

```prisma
// (prisma/schema.prisma より抜粋)
enum AiContentType {
  EXPLANATION       // 解説テキスト
  TRANSLATION       // 翻訳テキスト
  AUDIO_PRIMARY     // Card.front (主要テキスト) の音声
  AUDIO_SECONDARY   // Card.back (第2テキスト/答え) の音声
  AUDIO_EXPLANATION // EXPLANATION コンテンツの音声
  AUDIO_TRANSLATION // TRANSLATION コンテンツの音声
}
```

**(追記)** 音声の種類を、それがどのテキスト（主要、第2、解説、翻訳）に対応するかを示す形で定義しました。これにより、多言語の音声にも対応できます。

### 2.4. AICardContent モデルの詳細

AI 生成コンテンツ（または音声ファイル情報）を格納する新しいモデルです。

```prisma
// (prisma/schema.prisma より抜粋)
model AICardContent {
  id            String        @id @default(cuid())
  cardId        String        // どのカードか
  card          Card          @relation(fields: [cardId], references: [id], onDelete: Cascade)
  contentType   AiContentType // ★ 更新された Enum を使用 ★
  language      String        // コンテンツの言語 ('en', 'ja') または音声の言語 ('en-US', 'ja-JP')
  content       String        @db.Text // テキスト本体、または音声ファイルの GCS パス/URL
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@unique([cardId, contentType, language])
  @@index([cardId])
  @@index([cardId, contentType])
}
```

**(追記)** `contentType` が `AUDIO_*` の場合、`content` フィールドには音声ファイルの GCS 上のパス (例: `tts-audio/uuid.mp3`) が格納されます。`language` フィールドにはその音声の言語コード (例: `en-US`) が入ります。

## 3. 新しいスキーマ定義 (`prisma/schema.prisma` より抜粋)

以下に、今回の変更に関連する主要なモデル (`Card`, `AICardContent`) と Enum (`AiContentType`) の定義を示します。完全なスキーマは `prisma/schema.prisma` を参照してください。

```prisma
// --- Enum 定義 ---
enum AiContentType {
  EXPLANATION       // 解説テキスト
  TRANSLATION       // 翻訳テキスト
  AUDIO_PRIMARY     // Card.front (主要テキスト) の音声
  AUDIO_SECONDARY   // Card.back (第2テキスト/答え) の音声
  AUDIO_EXPLANATION // EXPLANATION コンテンツの音声
  AUDIO_TRANSLATION // TRANSLATION コンテンツの音声
}

// --- モデル定義 ---

model Card {
  id            String   @id @default(cuid())
  front         String   @db.Text
  back          String   @db.Text

  // --- SRSメタデータ (変更なし) ---
  interval      Int      @default(0)
  easeFactor    Float    @default(2.5)
  nextReviewAt  DateTime @default(now()) @db.Timestamptz

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // --- リレーション (deck, studyLogs は変更なし) ---
  deckId        String
  deck          Deck     @relation(fields: [deckId], references: [id], onDelete: Cascade)
  studyLogs     StudyLog[]

  // ↓↓↓ AICardContent へのリレーションを【追加】↓↓↓
  aiContents    AICardContent[]

  // --- インデックス (変更なし) ---
  @@index([deckId])
  @@index([nextReviewAt])
}

model AICardContent {
  id            String   @id @default(cuid())
  cardId        String   // どのカードのコンテンツか (Cardへの参照)
  card          Card     @relation(fields: [cardId], references: [id], onDelete: Cascade) // Cardとのリレーション
  contentType   AiContentType // Enum: EXPLANATION, TRANSLATION, AUDIO_*
  language      String   // コンテンツの言語コード (e.g., 'en', 'ja', 'en-US', 'ja-JP')
  content       String   @db.Text // テキスト本体、または音声ファイルの GCS パス

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // 同じカードに同じ種類・同じ言語のコンテンツは原則1つ
  @@unique([cardId, contentType, language])
  @@index([cardId]) // カードIDでの検索用
  @@index([cardId, contentType]) // 特定タイプのコンテンツ取得用
}

// (User, Deck, StudyLog モデルは変更なしのため省略)
```

### 3.1. リレーション図 (Mermaid 形式 - 更新版)

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

## 4. 採用理由

- **多言語対応の実現:** 1つのカードに対し、複数言語の解説・翻訳・**音声**を `language` フィールドで区別して格納できる。
- **コンテンツ種類の拡張性:** 将来的に「難易度別解説」や「例文」など、新しい種類の AI コンテンツを追加する場合、`AiContentType` Enum を拡張するだけで対応可能。
- **`Card` モデルの関心の分離:** カードのコア情報（表裏、SRS データ）と、付加的な AI 生成コンテンツ（テキスト、音声パス）を分離できる。
- **ユーザーの多様な学習スタイルへの対応:** 「英語の解説」と「日本語の翻訳」を同時に取得・表示したり、複数の言語の音声を選択したりするなど、柔軟な情報提示が可能になる。
- **音声データ管理の統合:** テキストコンテンツと音声ファイルの参照情報を同じテーブルで管理することで、データの一貫性を保ちやすくなる。

## 5. パフォーマンスに関する考慮事項

`Card` データと一緒に `AICardContent` を取得する際には、Prisma の `include` 機能を使用します。関連するテーブルアクセスが増える可能性はありますが、以下の対策によりパフォーマンスへの影響は最小限に抑えられる見込みです。

- `AICardContent` テーブルに適切なインデックス（`cardId`, `contentType`, `language` など）を設定する。
- フロントエンドで不要なコンテンツまで取得しないように、必要な `contentType` や `language` でフィルタリングする（例: ユーザー設定に基づいて表示する言語を選択）。

これらの対策により、UX に影響が出るほどの顕著なパフォーマンス低下は通常発生しないと考えられます。

## 6. 影響範囲 (概要)

このデータベース設計変更は、アプリケーションの以下の部分に影響を与えます。

- **Prisma スキーマ:** 上記の通り変更し、マイグレーションを実行する必要があります。
- **サービス層 (`card.service.ts`, `ai.service.ts` など):** AI コンテンツの保存ロジック（`prisma.aICardContent.create` を使用）および取得ロジック（`include: { aiContents: true }` など）の修正が必要です。**音声ファイルの GCS パス保存ロジックもここに含まれます。**
- **API レスポンスと型定義 (`types/api.types.ts`):** カードデータの型定義から `explanation`, `translation`, **`frontAudioUrl`, `backAudioUrl`** を削除し、代わりに `aiContents` 配列を含むように修正が必要です。`AICardContent` の型定義も更新が必要です。
- **フロントエンド:** カードデータを表示するコンポーネント (`CardList` など) や、AI コンテンツを利用する機能（解説表示、翻訳表示、**音声再生**など）の修正が必要です。データ構造の変更に対応する必要があります。**音声再生は `AICardContent` から GCS パスを取得し、署名付き URL を取得して再生するフローになります。**
