"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const Spinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

export default function SignUpPage() {
  const t = useTranslations("SignUpPage");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { signUp } = useAuth();

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error: signUpError } = await signUp(email, password);

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setMessage(t("successMessage"));
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-1 justify-center items-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <h2 className="text-3xl font-bold text-center text-gray-900">
          {t("title")}
        </h2>
        <form
          onSubmit={handleSignUp}
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
              minLength={8}
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
            {loading ? <Spinner /> : t("button")}
          </button>

          <p className="text-center text-sm text-gray-600 pt-2">
            {t("alreadyAccount")}{" "}
            <Link href="/login">
              <span className="font-medium text-indigo-600 hover:text-indigo-500">
                {t("logIn")}
              </span>
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
