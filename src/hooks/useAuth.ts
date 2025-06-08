import { createClient } from '@/lib/supabase'; // Client-side client
import { AuthError, User, Session } from '@supabase/supabase-js'; // Removed unused AuthResponse, AuthTokenResponsePassword
import { useAuthContext } from '@/components/providers/AuthProvider'; // Import the context hook

// Define the types for the hook's return value
interface AuthHookValue {
  // Auth state from context
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  // Auth functions
  signUp: (
    email: string,
    password: string
  ) => Promise<{
    data: { user: User | null; session: Session | null };
    error: AuthError | null;
  }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{
    data: { user: User | null; session: Session | null };
    error: AuthError | null;
  }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

export const useAuth = (): AuthHookValue => {
  // Get auth state from context
  const { session, user, isLoading } = useAuthContext();
  // Get the Supabase client instance for client components (needed for auth actions)
  const supabase = createClient();

  // Implement with desired signature (email, password separate)
  const signUp = async (email: string, password: string) => {
    // Call Supabase with the required object structure
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Optional: Add options like redirect URLs or metadata if needed
      // options: {
      //   emailRedirectTo: `${location.origin}/auth/callback`,
      // }
    });
    // Basic error logging, could be enhanced
    if (error) {
      console.error('Sign up error:', error.message);
    }
    // Return type is inferred by TypeScript
    return { data, error };
  };

  // Implement with desired signature (email, password separate)
  const signIn = async (email: string, password: string) => {
    // Call Supabase with the required object structure
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error('Sign in error:', error.message);
    }
    // Return type is inferred by TypeScript
    return { data, error };
  };

  const signOut = async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error.message);
    }
    return { error };
  };

  // Return the auth state and functions
  return { session, user, isLoading, signUp, signIn, signOut };
};

// Type guard to check for AuthError
export function isAuthError(error: unknown): error is AuthError {
  if (error && typeof error === 'object') {
    return 'message' in error && 'status' in error;
  }
  return false;
}
