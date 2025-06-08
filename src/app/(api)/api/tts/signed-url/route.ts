// src/app/(api)/api/tts/signed-url/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import {
  handleApiError,
  ValidationError,
  ExternalApiError,
} from '@/lib/errors';

// 注意: Storage クライアントと bucketName は ai.service.ts と重複初期化している状態。
// 本来は共通の初期化処理を呼び出すか、シングルトンにするのが望ましい。
let storage: Storage | null = null;
let bucketName: string = '';
try {
  storage = new Storage(); // GOOGLE_APPLICATION_CREDENTIALS が必要
  bucketName = process.env.GCS_BUCKET_NAME || '';
  if (!bucketName) {
    console.error(
      'GCS_BUCKET_NAME missing in environment for signed URL generation.'
    );
    storage = null;
  }
} catch (error) {
  console.error(
    'Failed to initialize Storage client for signed URL generation.',
    error
  );
  storage = null;
}

/**
 * GET handler to generate a short-lived signed URL for a given GCS path.
 * Expects gcsPath as a query parameter.
 */
export async function GET(request: NextRequest) {
  if (!storage || !bucketName) {
    return handleApiError(
      new ExternalApiError(
        'Storage client is not initialized or bucket name is missing.'
      )
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const gcsPath = searchParams.get('gcsPath');

    // 1. 入力検証 (gcsPath が必須で、特定の形式か)
    if (
      !gcsPath ||
      typeof gcsPath !== 'string' ||
      !gcsPath.startsWith('tts-audio/')
    ) {
      throw new ValidationError('Missing or invalid gcsPath query parameter.');
    }
    // パストラバーサル防止 (簡易チェック)
    if (gcsPath.includes('..')) {
      throw new ValidationError('Invalid characters in gcsPath.');
    }

    console.log(`[API /tts/signed-url] Request for path: ${gcsPath}`);

    // 2. 署名付き URL 生成 (有効期限は短め、例: 15分)
    const options = {
      version: 'v4' as const,
      action: 'read' as const,
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    const file = storage.bucket(bucketName).file(gcsPath);

    // (オプション) ファイル存在確認 - 存在しない場合に 404 を返す場合
    // const [exists] = await file.exists();
    // if (!exists) {
    //   console.warn(`[API /tts/signed-url] File not found at: ${gcsPath}`);
    //   throw new NotFoundError(`Audio file not found.`);
    // }

    const [url] = await file.getSignedUrl(options);
    console.log(`[API /tts/signed-url] Generated signed URL for ${gcsPath}`);

    // 3. 成功レスポンス
    return NextResponse.json({ success: true, signedUrl: url });
  } catch (error: unknown) {
    // バリデーションエラーや getSignedUrl のエラーを処理
    console.error(`[API /tts/signed-url] Error:`, error);
    return handleApiError(error); // handleApiError に処理を委譲
  }
}
