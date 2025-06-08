// src/app/[locale]/(auth)/login/page.tsx (パスワードリセット機能追加版)
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase"; // Supabaseクライアントをインポート
import { useAuth } from "@/hooks/useAuth";
import { Link, useRouter } from "@/i18n/navigation"; // useRouter もインポート

export default function LoginPage() {
  // --- 既存のログインフォーム用 State ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError.message);
    } else {
      // ログイン成功時のリダイレクトは AuthProvider で処理されるはず
      // router.push('/decks'); // ここでのリダイレクトは不要な場合が多い
      console.log(
        "Login successful, waiting for redirect from AuthProvider...",
      );
    }
    setLoading(false);
  };

  // --- ★ パスワードリセット用に追加 ★ ---
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage("");
    setResetError("");

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      resetEmail,
      {
        // ★ ここでリダイレクト先を明示的に指定します ★
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    if (resetError) {
      console.error("Password reset error:", resetError);
      setResetError(resetError.message);
    } else {
      setResetMessage("Password reset link sent! Please check your email.");
    }
    setResetLoading(false);
  };
  // --- ★ 追加ここまで ★ ---

  return (
    <div style={{ maxWidth: "400px", margin: "auto", paddingTop: "50px" }}>
      {/* --- 既存のログインフォーム --- */}
      <h2>Log In</h2>
      <form onSubmit={handleSignIn}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "8px", marginBottom: "20px" }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 20px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Logging In..." : "Log In"}
        </button>
      </form>
      {error && (
        <p style={{ color: "red", marginTop: "10px" }}>Error: {error}</p>
      )}
      <p style={{ marginTop: "20px" }}>
        Don&apos;t have an account? <Link href="/signup">Sign Up</Link>
      </p>

      <hr style={{ margin: "40px 0" }} />

      {/* --- ★ パスワードリセット用フォームを追加 ★ --- */}
      <div>
        <h2>Forgot Password?</h2>
        <p className="text-sm text-gray-600 mb-4">
          Enter your email address and we will send you a link to reset your
          password.
        </p>
        <form onSubmit={handlePasswordReset}>
          <div>
            <label htmlFor="reset-email">Email:</label>
            <input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            />
          </div>
          <button
            type="submit"
            disabled={resetLoading}
            style={{
              padding: "10px 20px",
              cursor: resetLoading ? "not-allowed" : "pointer",
            }}
          >
            {resetLoading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
        {resetError && (
          <p style={{ color: "red", marginTop: "10px" }}>{resetError}</p>
        )}
        {resetMessage && (
          <p style={{ color: "green", marginTop: "10px" }}>{resetMessage}</p>
        )}
      </div>
      {/* --- ★ 追加ここまで ★ --- */}
    </div>
  );
}
