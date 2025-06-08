// src/app/[locale]/(app)/layout.tsx (params await + import path 修正版)
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
// ↓↓↓ パスエイリアス (@/) を使用するように修正 ↓↓↓
import { createSupabaseServerComponentClient } from "@/lib/supabase";
import { AuthStatus } from "@/components/AuthStatus";
// ↑↑↑ パスエイリアス (@/) を使用するように修正 ↑↑↑

export default async function AuthenticatedLayout({
  children,
  // ↓↓↓ params をそのまま Promise として受け取るように修正 ↓↓↓
  params: paramsPromise,
}: {
  children: React.ReactNode;
  // ↓↓↓ 型定義も Promise<{ locale: string }> に修正 ↓↓↓
  params: Promise<{ locale: string }>;
}) {
  // ↓↓↓ 関数内で params を await してから locale を取得 ↓↓↓
  // このレイアウトでは locale は直接使用していませんが、正しいパターンに修正します。
  const { locale: _locale } = await paramsPromise;
  console.log(
    `[AuthenticatedLayout](${new Date().toISOString()}) Check triggered for path (locale: ${_locale})...`,
  );
  // ↑↑↑ await 処理を追加 ↑↑↑

  let user = null;
  let authError = null;

  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerComponentClient(cookieStore);
    const {
      data: { user: fetchedUser },
      error: fetchError,
    } = await supabase.auth.getUser();
    user = fetchedUser;
    authError = fetchError;
    console.log(
      `[AuthenticatedLayout](${new Date().toISOString()}) getUser result:`,
      { userId: user?.id, email: user?.email },
    );
    if (authError) {
      console.error(
        `[AuthenticatedLayout](${new Date().toISOString()}) getUser authError:`,
        authError.message,
      );
    }
  } catch (error) {
    console.error(
      `[AuthenticatedLayout](${new Date().toISOString()}) Error during Supabase client/getUser:`,
      error,
    );
    const loginPath = "/login"; // 必要ならロケールを考慮 `/${_locale}/login`
    console.log(
      `[AuthenticatedLayout](${new Date().toISOString()}) Error in setup, redirecting to ${loginPath}...`,
    );
    redirect(loginPath);
  }

  if (!user) {
    const loginPath = "/login"; // 必要ならロケールを考慮 `/${_locale}/login`
    console.log(
      `[AuthenticatedLayout](${new Date().toISOString()}) No user found (or error occurred), redirecting to ${loginPath}...`,
    );
    redirect(loginPath);
  }

  console.log(
    `[AuthenticatedLayout](${new Date().toISOString()}) User found, rendering children for user: ${user.id}`,
  );

  return (
    <div className="flex flex-col min-h-screen">
      <AuthStatus />
      <main className="flex-grow container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
