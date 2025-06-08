// src/lib/supabase.ts (最終修正版)
import {
  createBrowserClient,
  createServerClient,
  type CookieOptions,
} from '@supabase/ssr';
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import { type NextRequest, type NextResponse } from 'next/server';

// Ensure environment variables are defined
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}
// if (!supabaseServiceRoleKey) { console.warn(...) }

// --- Client Components Client ---
export const createClient = () =>
  createBrowserClient(supabaseUrl!, supabaseAnonKey!);

// --- Server Component Client (Read-Only Cookies) ---
export const createSupabaseServerComponentClient = (
  cookieStore: ReadonlyRequestCookies
) => {
  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
};

// --- Server Action / Route Handler Client (Read/Write Cookies) ---
export const createSupabaseServerActionClient = (
  cookieStoreAccessor: () => ReadonlyRequestCookies
) => {
  const cookieStore = cookieStoreAccessor();
  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStoreAccessor().set(name, value, options);
        } catch (error) {
          console.error(
            `ServerActionClient: Failed to set cookie '${name}'.`,
            error
          );
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStoreAccessor().set({ name, value: '', ...options, maxAge: 0 });
        } catch (error) {
          console.error(
            `ServerActionClient: Failed to remove cookie '${name}'.`,
            error
          );
        }
      },
    },
  });
};

// --- Middleware Client ---
export const createMiddlewareClient = (req: NextRequest, res: NextResponse) => {
  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        req.cookies.set({ name, value, ...options });
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        req.cookies.delete(name);
        res.cookies.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });
};

// --- Server-Side Admin Client (Optional) ---
export const createAdminClient = () => {
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY for admin client.');
  }
  return createServerClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    cookies: {
      get(_name: string) {
        return undefined;
      },
      set(_name: string, _value: string, _options: CookieOptions) {}, // Removed unused eslint-disable comment
      remove(_name: string, _options: CookieOptions) {}, // Removed unused eslint-disable comment
    },
  });
};
