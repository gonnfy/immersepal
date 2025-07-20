"use client";

import { useState, FormEvent } from "react";
import { createClient } from "@/lib/supabase";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const _Spinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

export default function ForgotPasswordPage() {
  const t = useTranslations("ResetPasswordPage");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handlePasswordReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage("Password reset link sent! Please check your email.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-1 justify-center items-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">{t("title")}</h2>
          <p className="mt-2 text-sm text-gray-600">{t("description")}</p>
        </div>
        <form
          onSubmit={handlePasswordReset}
          className="space-y-4 p-6 bg-white rounded-xl shadow-lg border"
        >
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {message && (
            <p className="text-green-600 text-sm text-center">{message}</p>
          )}

          <button
            type="submit"
            className="w-full flex justify-center items-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
            disabled={loading}
          >
            {loading ? t("sendingButton") : t("button")}
          </button>

          <div className="text-center pt-2">
            <Link href="/login">
              <span className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                {t("backToLogin")}
              </span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
