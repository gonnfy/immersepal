// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createMiddlewareClient } from '@/lib/supabase';

const locales = ['en', 'ja'];
const defaultLocale = 'en'; // Needs to be uncommented

const intlMiddleware = createIntlMiddleware({
  locales: locales,
  defaultLocale: defaultLocale,
  localePrefix: 'as-needed',
});

export async function middleware(req: NextRequest) {
  // 1. Create the base response object. Supabase needs this to potentially set cookies.
  const res = NextResponse.next();

  // 2. Run the intl middleware first.
  const intlResponse = intlMiddleware(req);

  // 3. Check if intlMiddleware wants to redirect or rewrite.
  // If so, respect that and return its response immediately.
  // We check headers because intlMiddleware might add locale-specific headers
  // even without a full redirect/rewrite.
  if (
    intlResponse.headers.get('location') ||
    intlResponse.headers.get('x-middleware-rewrite')
  ) {
    return intlResponse;
  }

  // 4. If intl didn't redirect/rewrite, proceed with Supabase auth.
  try {
    // Pass both req and the *original* res object to Supabase
    const supabase = createMiddlewareClient(req, res);
    await supabase.auth.getSession(); // Refreshes session cookie if needed
  } catch (e) {
    console.error('Supabase middleware error:', e);
    // Optionally handle the error, maybe return an error response
    // For now, just log it and continue.
  }

  // 5. Return the original response object (`res`).
  // This object might have been modified by Supabase (e.g., updated auth cookie).
  // It also implicitly carries any headers set by intlMiddleware that weren't redirects/rewrites.
  return res;
}

// middleware.ts の config 部分 (推奨)
// Keep the config as it is necessary for the middleware to run
export const config = {
  matcher: [
    // Match all paths except for specific assets and API routes.
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)', // Added 'api|' to exclude API routes
  ],
};
