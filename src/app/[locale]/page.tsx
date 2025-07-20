"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("LandingPage");
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();

  const locale = Array.isArray(params?.locale)
    ? params.locale[0]
    : params?.locale || "en";

  useEffect(() => {
    if (!isLoading && user) {
      console.log("User is already logged in, redirecting to /decks...");
      router.push(`decks`);
    }
  }, [user, isLoading, router, locale]);

  if (isLoading || (!isLoading && user)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-900">
      <div className="z-10 w-full max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
          {t("welcome")}
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300 whitespace-pre-line">
          {t("subtitle")}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-y-4">
          {/* プライマリーボタン (サインアップ) */}
          <Link
            href="/signup"
            className="w-full max-w-xs rounded-md bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {t("signupNow")}
          </Link>
          {/* セカンダリーリンク (ログイン) */}
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            {t("alreadyHaveAccount")}{" "}
            <Link
              href="/login"
              className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {t("loginHere")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
