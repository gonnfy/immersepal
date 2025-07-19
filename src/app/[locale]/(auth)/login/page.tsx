"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const _Spinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { signIn, isLoading } = useAuth();
  const t = useTranslations("LoginPage");

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError.message);
    }
  };

  return (
    <div className="flex flex-1 justify-center items-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <h2 className="text-3xl font-bold text-center text-gray-900">
          {t("title")}
        </h2>
        <form
          onSubmit={handleSignIn}
          className="space-y-4 p-6 bg-white rounded-xl shadow-lg border"
        >
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {error && <p className="text-red-500 text-center text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full flex justify-center items-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? t("loadingButton") : t("button")}
          </button>

          <div className="text-center space-y-2 pt-2 text-sm text-gray-600">
            <p>
              <Link href="/reset-password">
                <span className="font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer">
                  {t("forgotPassword")}
                </span>
              </Link>
            </p>
            <p>
              {t("noAccount")}{" "}
              <Link href="/signup">
                <span className="font-medium text-indigo-600 hover:text-indigo-500">
                  {t("signUp")}
                </span>
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
