# Dockerfile (prisma generate 追加版)

# ==============================================================================
# ステージ 1: ビルドステージ (Builder)
# ==============================================================================
FROM oven/bun:1.2.2 AS builder
WORKDIR /app

# 依存関係とPrismaスキーマを先にコピーしてキャッシュを有効活用
COPY package.json bun.lock ./
COPY prisma ./prisma/
RUN bun install --frozen-lockfile

# ★ Prisma Client を生成するコマンドを追加 ★
# これにより、node_modules/@prisma/client にあなた専用のコードが生成されます。
RUN bunx prisma generate

# アプリケーションのコード全体をコピー
COPY . .

# ビルド時に必要な公開環境変数を設定
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG GCP_PROJECT_ID
ARG GOOGLE_APPLICATION_CREDENTIALS
ARG GCS_BUCKET_NAME
ARG VERTEX_AI_REGION
ARG VERTEX_AI_MODEL_NAME
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV GCP_PROJECT_ID=${GCP_PROJECT_ID}
ENV GOOGLE_APPLICATION_CREDENTIALS=${GOOGLE_APPLICATION_CREDENTIALS}
ENV GCS_BUCKET_NAME=${GCS_BUCKET_NAME}
ENV VERTEX_AI_REGION=${VERTEX_AI_REGION}
ENV VERTEX_AI_MODEL_NAME=${VERTEX_AI_MODEL_NAME}
# アプリケーションをビルド
RUN bun run build


# ==============================================================================
# ステージ 2: プロダクションステージ (Runner)
# ==============================================================================
FROM oven/bun:1.2.2 AS runner
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

# ビルドステージから必要なファイルをコピー
# Prisma Clientの生成結果も .next/standalone/node_modules に含まれます
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

ENV NODE_ENV=production
ENV PORT 8080
EXPOSE 8080

CMD ["node", "server.js"]