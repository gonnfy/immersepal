import { cookies } from 'next/headers'
import { createSupabaseServerComponentClient } from '@/lib/supabase' // Use the server-side client creator
import { User } from '@supabase/supabase-js'
import { AuthError } from '@supabase/supabase-js' // Import AuthError type

// Define a more specific error type if needed, or use AuthError directly
// Define a simpler error type for the catch block
type ServerAuthCatchError = { name: string; message: string; status: number };

interface ServerUserResult {
    user: User | null;
    error: AuthError | ServerAuthCatchError | null; // Allow AuthError or our custom catch error
}

/**
 * Retrieves the authenticated user on the server-side (Server Components, API Routes, Server Actions).
 * Uses cookies from the incoming request to get the session.
 *
 * @returns {Promise<ServerUserResult>} An object containing the user or an error.
 */
export const getServerUser = async (): Promise<ServerUserResult> => {
  try {
    // 1. Get cookie store
    const resolvedCookieStore = await cookies() // Await the promise

    // 2. Create Supabase client for server actions/components
    const supabase = createSupabaseServerComponentClient(resolvedCookieStore);
    // 3. Get user session
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.error("Error getting server user:", error.message)
      return { user: null, error }
    }

    return { user, error: null }

  } catch (err: unknown) {
    // Catch potential errors during client creation or cookie access
    console.error("Unexpected error in getServerUser:", err)
    // Determine the error message safely
    let errorMessage = 'An unexpected error occurred retrieving server user.';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
        errorMessage = err.message;
    } else if (err instanceof Error) {
        errorMessage = err.message;
    }
    // Return a simpler error object
    const error: ServerAuthCatchError = {
        name: 'ServerAuthCatchError',
        message: errorMessage,
        status: 500, // Internal Server Error
    };
    return { user: null, error };
  }
}

// Optional: Helper to get just the user ID
export const getServerUserId = async (): Promise<string | null> => {
    const { user, error } = await getServerUser();
    if (error || !user) {
        return null;
    }
    return user.id;
}