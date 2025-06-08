// src/components/providers/AuthProvider.tsx (ルーティングフック修正版)
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Session, User, AuthChangeEvent } from "@supabase/supabase-js"; // SupabaseClient は直接使わないので削除
import { createClient } from "@/lib/supabase";
// ★ 標準の next/navigation からフックをインポート ★
import { useRouter, usePathname, useParams } from "next/navigation";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ★ 標準の next/navigation フックを使用 ★
  const router = useRouter();
  const currentFullPath = usePathname(); // 例: /ja/login, /en, /decks
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";

  useEffect(() => {
    setIsLoading(true);
    console.log(
      "AuthProvider: useEffect triggered. Current full path:",
      currentFullPath,
      "Current locale:",
      locale,
    );

    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        console.log("AuthProvider: Initial session fetched:", initialSession);
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setIsLoading(false);

        if (initialSession) {
          const publicFullPaths = [
            `/${locale}`,
            `/${locale}/login`,
            `/${locale}/signup`,
            `/`, // ルートも考慮 (デフォルトロケールでプレフィックスなしの場合)
            `/login`,
            `/signup`,
          ];
          if (publicFullPaths.includes(currentFullPath)) {
            console.log(
              `AuthProvider: User initially signed in and on public path "<span class="math-inline">\{currentFullPath\}"\. Redirecting to /</span>{locale}/decks`,
            );
            router.push(`/${locale}/decks`);
          }
        }
      })
      .catch((error) => {
        console.error("AuthProvider: Error getting initial session:", error);
        setIsLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, newSession: Session | null) => {
        console.log(
          `AuthProvider: Auth state changed: Event: ${_event}, New Session:`,
          newSession,
        );
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsLoading(false);

        if (_event === "SIGNED_IN" && newSession) {
          const publicFullPaths = [
            `/${locale}`,
            `/${locale}/login`,
            `/${locale}/signup`,
            `/`,
            `/login`,
            `/signup`,
          ];
          console.log(
            `AuthProvider: SIGNED_IN event. Current full path: "${currentFullPath}". User: ${newSession.user.email}`,
          );

          if (publicFullPaths.includes(currentFullPath)) {
            console.log(
              `AuthProvider: User signed in via <span class="math-inline">\{\_event\} and on public path "</span>{currentFullPath}". Redirecting to /${locale}/decks`,
            );
            router.push(`/${locale}/decks`);
          } else {
            console.log(
              `AuthProvider: User signed in via <span class="math-inline">\{\_event\}, already on an app path "</span>{currentFullPath}". No redirect needed from AuthProvider.`,
            );
          }
        } else if (_event === "PASSWORD_RECOVERY" && newSession) {
          console.log(
            `AuthProvider: PASSWORD_RECOVERY event. User: ${newSession.user.email}. Current path: ${currentFullPath}`,
          );
          // Supabase URL Configuration で /reset-password にリダイレクト設定されていれば、
          // そのページにいるはず。そうでなければリダイレクト。
          const resetPasswordPath = `/${locale}/reset-password`;
          if (currentFullPath !== resetPasswordPath) {
            console.log(`Redirecting to ${resetPasswordPath}`);
            router.push(resetPasswordPath);
          }
        } else if (_event === "SIGNED_OUT") {
          console.log(
            "AuthProvider: SIGNED_OUT event. Redirecting to login page.",
          );
          router.push(`/${locale}/login`);
        }
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router, currentFullPath, locale]); // currentFullPath, locale を依存配列に追加

  const value = {
    session,
    user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
