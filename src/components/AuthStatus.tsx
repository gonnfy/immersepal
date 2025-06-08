"use client";

import { useAuth } from "../hooks/useAuth";
import { Link } from "../i18n/navigation";
import { useRouter } from "../i18n/navigation";

export function AuthStatus() {
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    console.log("Attempting to sign out..."); // ログアウト試行ログ
    const { error } = await signOut();
    if (error) {
      console.error("Error signing out:", error);
      // オプション: ユーザーにエラーメッセージを表示
      alert(`Logout failed: ${error.message}`);
    } else {
      // ログアウト成功後、ホームページやログインページにリダイレクト
      console.log("Successfully signed out. Redirecting to /login...");
      router.push("/login"); // ログインページへ
      // セッション状態がサーバー側でクリアされるのを待ってからリフレッシュする方が良い場合がある
      // 少し待ってからリフレッシュするか、リダイレクト先で状態を再確認する
      setTimeout(() => router.refresh(), 100); // わずかに遅延させてリフレッシュ
    }
  };

  // 認証状態をロード中はシンプルな表示
  if (isLoading) {
    return (
      <div className="p-2 border-b text-sm text-center text-gray-500 dark:text-gray-400">
        Loading user status...
      </div>
    );
  }

  // ログイン状態に応じた表示
  return (
    <div className="p-2 border-b mb-4 text-sm bg-gray-50 dark:bg-gray-800">
      {user ? (
        // ログイン中の表示
        <div className="container mx-auto flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-200">
            Logged in as: <strong>{user.email}</strong>
          </span>
          <button
            onClick={handleSignOut}
            className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Log Out
          </button>
        </div>
      ) : (
        // 未ログインの表示
        <div className="container mx-auto flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-200">
            You are not logged in.
          </span>
          <div>
            <Link href="/login" className="text-blue-600 hover:underline mr-4">
              Log In
            </Link>
            <Link href="/signup" className="text-blue-600 hover:underline">
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
