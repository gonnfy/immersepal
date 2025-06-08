#!/bin/bash

# このスクリプトは .env ファイルを読み込み、Google Secret Manager にシークレットを作成します。
# コメント行と空行はスキップします。

# GCPプロジェクトIDをgcloudの現在の設定から取得します。
GCP_PROJECT_ID=$(gcloud config get-value project)
ENV_FILE=".env"

# --- 事前チェック ---
if [ -z "$GCP_PROJECT_ID" ]; then
    echo "Error: GCP Project ID not found. Please run 'gcloud config set project YOUR_PROJECT_ID'."
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found in the current directory."
    exit 1
fi

echo "Target Project: $GCP_PROJECT_ID"
echo "Reading secrets from: $ENV_FILE"
echo "------------------------------------"

# .env ファイルを1行ずつ読み込む
while IFS= read -r line || [[ -n "$line" ]]; do
    # 空行とコメント行(#で始まる行)をスキップ
    if [[ -z "$line" ]] || [[ "$line" == \#* ]]; then
        continue
    fi

    # KEY=VALUE の形式から KEY と VALUE を抽出
    KEY=$(echo "$line" | cut -d '=' -f 1)
    VALUE=$(echo "$line" | cut -d '=' -f 2-)

    # 値を囲んでいる可能性のあるダブルクォーテーションを削除
    VALUE="${VALUE%\"}"
    VALUE="${VALUE#\"}"

    echo "Processing secret: $KEY..."

    # シークレットが既に存在するか確認
    if gcloud secrets describe "$KEY" --project="$GCP_PROJECT_ID" &> /dev/null; then
        echo " -> Secret '$KEY' already exists. Skipping creation."
    else
        # シークレットが存在しない場合、新しいシークレットと最初のバージョンを作成
        # echo -n で改行なしで値を出力し、パイプ(|)で gcloud コマンドに渡す
        echo -n "$VALUE" | gcloud secrets create "$KEY" \
            --project="$GCP_PROJECT_ID" \
            --replication-policy="automatic" \
            --data-file=-

        # 実行結果をチェック
        if [ $? -eq 0 ]; then
            echo " -> Successfully created secret '$KEY'."
        else
            echo " -> FAILED to create secret '$KEY'."
        fi
    fi

done < "$ENV_FILE"

echo "------------------------------------"
echo "Script finished."