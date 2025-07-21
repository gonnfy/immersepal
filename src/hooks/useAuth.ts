import { createClient } from "@/lib/supabase";
import { AuthError, User, Session } from "@supabase/supabase-js";
import { useAuthContext } from "@/components/providers/AuthProvider";

interface AuthHookValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{
    data: { user: User | null; session: Session | null };
    error: AuthError | null;
  }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    data: { user: User | null; session: Session | null };
    error: AuthError | null;
  }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

export const useAuth = (): AuthHookValue => {
  const { session, user, isLoading } = useAuthContext();
  const supabase = createClient();

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      console.error("Sign up error:", error.message);
    }
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error("Sign in error:", error.message);
    }
    return { data, error };
  };

  const signOut = async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out error:", error.message);
    }
    return { error };
  };

  return { session, user, isLoading, signUp, signIn, signOut };
};

export function isAuthError(error: unknown): error is AuthError {
  if (error && typeof error === "object") {
    return "message" in error && "status" in error;
  }
  return false;
}
