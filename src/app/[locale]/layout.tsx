// src/app/[locale]/layout.tsx (修正版 - ルートレイアウトが存在する場合)
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';



// ★ Providers はここではインポート・使用しない ★
// import { Providers } from '@/components/providers';

// ロケール検証関数
const locales = ['en', 'ja'];
function isValidLocale(locale: string): boolean {
  return locales.includes(locale);
}

// (任意) メタデータ生成 (ルートレイアウトと別に定義する場合) ...

export default async function LocaleLayout({
  children,
  params: paramsPromise // 引数名を変更 (任意だが推奨)
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>; // ★ 型を Promise に ★
}) {
  const { locale } = await paramsPromise; // ★ await で解決 ★

  if (!isValidLocale(locale)) {
    notFound();
  }

  let messages;
  try {
    messages = await getMessages({ locale });
  } catch (error) {
    console.error("Failed to load messages for locale:", locale, error);
    notFound();
  }
  if (!messages) {
     notFound();
  }

  // ★★★ <html> と <body> は削除し、Provider のみがトップレベル ★★★
  return (
    // NextIntlClientProvider はロケールごとに必要
    <NextIntlClientProvider locale={locale} messages={messages}>
      {/* Providers は既に上位の RootLayout で適用されているので不要 */}
      {children}
    </NextIntlClientProvider>
  );
}