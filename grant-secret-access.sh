#!/bin/bash

# このスクリプトは、指定されたサービスアカウントに対して、
# リストアップされた全てのシークレットへのアクセス権を付与します。

# GCPプロジェクトIDとサービスアカウントのメールアドレスを設定
GCP_PROJECT_ID=$(gcloud config get-value project)
SERVICE_ACCOUNT_EMAIL="anki-ai-github-actions@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

# 権限を付与するシークレットの一覧
SECRETS=(
  "DATABASE_URL"
  "DIRECT_URL"
  "DB_PASSWORD"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "GOOGLE_APPLICATION_CREDENTIALS"
  "GCP_PROJECT_ID"
  "GCS_BUCKET_NAME"
  "VERTEX_AI_MODEL_NAME"
  "VERTEX_AI_REGION"
  "NEXT_PUBLIC_TTS_LANGUAGE_CODE_EN"
  "NEXT_PUBLIC_TTS_VOICE_NAME_EN"
  "NEXT_PUBLIC_TTS_LANGUAGE_CODE_JA"
  "NEXT_PUBLIC_TTS_VOICE_NAME_JA"
)

echo "Granting 'Secret Manager Secret Accessor' role to ${SERVICE_ACCOUNT_EMAIL}..."
echo "------------------------------------"

# ループで各シークレットに権限を付与
for SECRET_ID in "${SECRETS[@]}"; do
  echo "Granting access to secret: $SECRET_ID"
  gcloud secrets add-iam-policy-binding "$SECRET_ID" \
    --project="$GCP_PROJECT_ID" \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --condition=None # 既存のポリシーを上書きしないように念のため条件なしを指定
done

echo "------------------------------------"
echo "Script finished."