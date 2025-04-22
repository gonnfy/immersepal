import { cookies } from 'next/headers'
import { createSupabaseServerActionClient } from '@/lib/supabase' // Use the server-side client creator
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
    const supabase = createSupabaseServerActionClient(() => resolvedCookieStore) // Pass a sync function returning the resolved store

    // 3. Get user session
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.error("Error getting server user:", error.message)
      return { user: null, error }
    }

    return { user, error: null }

  } catch (err: any) {
    // Catch potential errors during client creation or cookie access
    console.error("Unexpected error in getServerUser:", err)
    // Return a simpler error object
    const error: ServerAuthCatchError = {
        name: 'ServerAuthCatchError',
        message: err.message || 'An unexpected error occurred retrieving server user.',
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