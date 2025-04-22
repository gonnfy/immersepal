import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr'
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import { type NextRequest, type NextResponse } from 'next/server'
import { cookies } from 'next/headers';
// Removed unused import: import { deleteCookie, getCookie, setCookie } from 'cookies-next';

// Ensure environment variables are defined
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Needed for server-side admin actions

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL")
}

if (!supabaseAnonKey) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

// Note: Service Role Key might not be needed for basic auth,
// but it's good practice to check if it's intended for server-side operations later.
// if (!supabaseServiceRoleKey) {
//   console.warn("Missing env.SUPABASE_SERVICE_ROLE_KEY. Server-side admin operations will fail.")
// }


// --- Client Components Client ---
// Use this in Client Components (needs 'use client')
export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseAnonKey!
  )

// --- Server Component Client (Read-Only Cookies) ---
// Use this in Server Components
export const createSupabaseServerComponentClient = (cookieStore: ReadonlyRequestCookies) => {
  return createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // No set/remove methods for read-only contexts
      },
    }
  )
}

// --- Server Action / Route Handler Client (Read/Write Cookies) ---
// Use this in Server Actions, Route Handlers
export const createSupabaseServerActionClient = (cookieStoreAccessor: () => ReadonlyRequestCookies) => {
        // ★★★ Accessor を関数冒頭で呼び出し、cookieStore を取得 ★★★
        const cookieStore = cookieStoreAccessor();
      
        return createServerClient(
          supabaseUrl!,
          supabaseAnonKey!,
          {
            cookies: {
              get(name: string) {
                // ★★★ 取得した cookieStore を使うように修正 ★★★
                return cookieStore.get(name)?.value
              },
              set(name: string, value: string, options: CookieOptions) {
                try {
                  // set は Accessor 経由のまま (呼び出し元コンテキストで実行されるため)
                  cookieStoreAccessor().set(name, value, options)
                } catch (error) {
                  console.error(`ServerActionClient: Failed to set cookie '${name}'. Ensure this runs only within a Server Action or Route Handler.`, error);
                }
              },
              remove(name: string, options: CookieOptions) {
                 try {
                  // remove も Accessor 経由のまま
                   cookieStoreAccessor().set({ name, value: '', ...options, maxAge: 0 });
                 } catch (error) {
                   console.error(`ServerActionClient: Failed to remove cookie '${name}'. Ensure this runs only within a Server Action or Route Handler.`, error);
                 }
              },
            },
          }
        )
      }

// --- Middleware Client ---
// Use this in Middleware (middleware.ts)
export const createMiddlewareClient = (req: NextRequest, res: NextResponse) => {
    return createServerClient(
        supabaseUrl!,
        supabaseAnonKey!,
        {
            cookies: {
                get(name: string) {
                    return req.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    // Set cookie on the request (modifies the incoming request for subsequent handlers)
                    req.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    // Set cookie on the response (sends Set-Cookie header to browser)
                    res.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    // Delete cookie from the request
                    req.cookies.delete(name) // Corrected: Use delete for request cookies
                    // Set cookie on the response to expire immediately
                    res.cookies.set({
                        name,
                        value: '',
                        ...options,
                        maxAge: 0,
                    })
                },
            },
        }
    )
}

// --- Server-Side Admin Client (Optional, for elevated privileges) ---
// Use this carefully on the server-side when Service Role Key is needed.
// Ensure SUPABASE_SERVICE_ROLE_KEY is set in your environment.
export const createAdminClient = () => {
    if (!supabaseServiceRoleKey) {
        throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY for admin client.")
    }
    return createServerClient(
        supabaseUrl!,
        supabaseServiceRoleKey!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
            // Provide dummy cookie methods to satisfy types
            cookies: {
                get(name: string) { return undefined; },
                set(name: string, value: string, options: CookieOptions) {},
                remove(name: string, options: CookieOptions) {},
            }
        }
    )
}