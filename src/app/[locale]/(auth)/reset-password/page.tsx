// src/app/[locale]/reset-password/page.tsx (または src/app/reset-password/page.tsx)
"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase"; // クライアント Supabase をインポート
import { useRouter } from "@/i18n/navigation"; // または next/navigation
import { useAuthContext } from "@/components/providers/AuthProvider"; // AuthContext から session を取得

// バリデーションスキーマ
const passwordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"], // エラーを confirmPassword フィールドに関連付ける
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const { session } = useAuthContext(); // AuthProvider から現在のセッションを取得
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticatedForReset, setIsAuthenticatedForReset] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // このページはパスワードリセットリンクから遷移してきた
  // 一時的なセッションを持っているユーザーのみがアクセスできる想定
  useEffect(() => {
    // セッションがあり、かつ type=recovery で遷移してきたことを確認
    // (SupabaseはURL#からセッションを自動的に設定してくれる)
    if (session && session.user.aud === "authenticated") {
      // 簡単なチェックとして、単にセッションが存在するかで判断
      // より厳密には、onAuthStateChangeでPASSWORD_RECOVERYイベントを捕捉する
      console.log("User has a session, allowing password reset.");
      setIsAuthenticatedForReset(true);
    } else {
      console.warn(
        "No valid session found for password reset. Redirecting to login.",
      );
      //setError("Invalid session. Please request a new password reset link.");
      // router.push('/login'); // セッションがなければログインへ飛ばす
      // 初回レンダリングで session が null の可能性があるので少し待つか、より堅牢なチェックが必要
      // ここでは単純化のため、セッションがあればOKとする
      if (session) setIsAuthenticatedForReset(true);
    }
  }, [session, router]);

  const onSubmit: SubmitHandler<PasswordFormData> = async (data) => {
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (updateError) {
      console.error("Error updating password:", updateError);
      setError(updateError.message);
    } else {
      setMessage("Password updated successfully! Redirecting to login...");
      // パスワード更新成功後、古いリカバリーセッションは破棄しログインページへ
      await supabase.auth.signOut(); // 明示的にサインアウト
      router.push("/login");
    }
    setIsLoading(false);
  };

  // 認証状態が確認できるまで、または不適切な場合は何も表示しないかローディング表示
  if (!isAuthenticatedForReset && !session) {
    // session も考慮
    // return <div>Verifying session...</div>; // or null
    // もしセッションがない状態で直接アクセスされた場合の処理
    // return <div>Invalid access. Please use the link from your email.</div>;
    // ここでは AuthProvider の isLoading を使っていないため、簡易的な表示
    return <div className="p-4 text-center">Loading or invalid access...</div>;
  }

  return (
    <div style={{ maxWidth: "400px", margin: "auto", paddingTop: "50px" }}>
      <h2>Set New Password</h2>
      <p className="text-sm text-gray-600 mb-4">
        You have been authenticated via the recovery link. Please enter your new
        password below.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="password">New Password:</label>
          <input
            id="password"
            type="password"
            {...register("password")}
            required
            className={`mt-1 block w-full px-3 py-2 border ${errors.password ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
          />
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">
              {errors.password.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="confirmPassword">Confirm New Password:</label>
          <input
            id="confirmPassword"
            type="password"
            {...register("confirmPassword")}
            required
            className={`mt-1 block w-full px-3 py-2 border ${errors.confirmPassword ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {error && <p className="text-red-500">{error}</p>}
        {message && <p className="text-green-500">{message}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Save New Password"}
        </button>
      </form>
    </div>
  );
}
