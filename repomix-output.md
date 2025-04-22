This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

## Additional Info

# Directory Structure
```
app/
  (api)/
    api/
      decks/
        [deckId]/
          cards/
            [cardId]/
              route.ts
            route.ts
          route.ts
        route.ts
  [locale]/
    (app)/
      (auth)/
        login/
          page.tsx
        signup/
          page.tsx
      (main)/
        decks/
          [deckId]/
            page.tsx
          page.tsx
      test/
        page.tsx
    layout.tsx
    page.tsx
  globals.css
  layout.tsx
  page.tsx
components/
  features/
    CardCreateForm.tsx
    CardEditModal.tsx
    CardList.tsx
    DeckCreateForm.tsx
    DeckCreateModal.tsx
  providers/
    AuthProvider.tsx
  ui/
    ConfirmationDialog.tsx
  providers.tsx
hooks/
  useAuth.ts
  useCardMutations.ts
  useCards.ts
  useDeckMutations.ts
  useDecks.ts
i18n/
  navigation.ts
  request.ts
  routing.ts
lib/
  auth.ts
  db.ts
  errors.ts
  supabase.ts
  zod.ts
services/
  card.service.ts
  deck.service.ts
types/
  api.types.ts
  index.ts
middleware.ts
```

# Files

## File: app/(api)/api/decks/[deckId]/cards/[cardId]/route.ts
```typescript
// src/app/(api)/api/decks/[deckId]/cards/[cardId]/route.ts
import { NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/auth';
import { deleteCard } from '@/services/card.service';
// isAppError, ValidationError, AppError は handleApiError 等で必要になる可能性を考慮し残置。lint で不要と出たら削除。
import { ERROR_CODES, handleApiError } from '@/lib/errors';

interface DeleteParams {
  deckId: string;
  cardId: string;
}

/**
 * Deletes a specific card (DELETE)
 */
export async function DELETE(
  request: Request, // request object is not used but required by the signature
  context: { params: DeleteParams }
) {
  try {
    // 1. Authentication: Get user ID
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: ERROR_CODES.AUTHENTICATION_FAILED, message: 'Authentication required.' }, { status: 401 });
    }

    // 2. Extract parameters
    const { deckId, cardId } = await context.params;
    if (!deckId || !cardId) {
      return NextResponse.json({ error: ERROR_CODES.VALIDATION_ERROR, message: 'Missing deckId or cardId in URL.' }, { status: 400 });
    }

    // 3. Service Call: Attempt to delete the card
    await deleteCard(userId, deckId, cardId);

    // 4. Success Response: Return 204 No Content
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    // 5. Error Handling: Use the centralized handler
    return handleApiError(error);
  }
}

// --- Imports for PUT ---
import { updateCard } from '@/services/card.service'; // Import the update service
import { cardUpdateSchema, CardUpdatePayload } from '@/lib/zod'; // Import the validation schema and payload type
// import type { Result } from '@/types'; // ★ Removed unused import

// --- Type for PUT context params (can reuse or define specifically) ---
interface PutParams {
  deckId: string;
  cardId: string;
}

/**
 * Updates a specific card (PUT)
 */
export async function PUT(
  request: Request,
  context: { params: PutParams }
) {
  // No top-level try-catch needed when using Result pattern consistently in service

  // 1. Authentication: Get user ID
  const userId = await getServerUserId();
  if (!userId) {
    return NextResponse.json({ error: ERROR_CODES.AUTHENTICATION_FAILED, message: 'Authentication required.' }, { status: 401 });
  }

  // 2. Extract parameters
  const { deckId, cardId } = await context.params;
  if (!deckId || !cardId) {
     return NextResponse.json({ error: ERROR_CODES.VALIDATION_ERROR, message: 'Missing deckId or cardId in URL.' }, { status: 400 });
  }

  // 3. Get and Parse Request Body
  let body: unknown;
  try {
    body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) { // _e は使わないが、catch 節は必要
    return NextResponse.json({ error: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid JSON body.' }, { status: 400 });
  }

  // 4. Input Validation (Zod)
  const validation = cardUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid input data.',
        details: validation.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // Type assertion after successful validation
  const validatedData = validation.data as CardUpdatePayload;

  // 5. Service Call: Attempt to update the card using the Result pattern
  const result = await updateCard(userId, deckId, cardId, validatedData);

  // 6. Handle Result
  if (result.ok) {
    return NextResponse.json(result.value, { status: 200 });
  } else {
    return handleApiError(result.error);
  }
}
```

## File: app/(api)/api/decks/[deckId]/cards/route.ts
```typescript
// src/app/[locale]/(api)/api/decks/[deckId]/cards/route.ts (修正後の完全なコード)

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createCard, getCardsByDeckId } from '@/services/card.service';
import { handleApiError } from '@/lib/errors';
import { getServerUserId } from '@/lib/auth';

// Define the expected request body schema
const createCardSchema = z.object({
  front: z.string().min(1, 'Front text cannot be empty'),
  back: z.string().min(1, 'Back text cannot be empty'),
});

// --- POST Handler (カード作成) ---
export async function POST(
  request: Request,
  // ★★★ 引数の受け取り方を修正 (context を使用) ★★★
  context: { params: { deckId: string } } // Removed locale
) {
  try {
    // ★★★ context.params を await してから deckId を取得 ★★★
    const { deckId } = await context.params;
    // const locale = context.params.locale; // locale が必要なら同様に取得

    if (!deckId) {
      return NextResponse.json({ error: 'Deck ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validation = createCardSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.errors }, { status: 400 });
    }

    const { front, back } = validation.data;

    // Get user ID
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Call the service function to create the card, passing the userId
    // ★★★ userId を createCard に渡すように修正 (card.service.ts 側も修正が必要な場合あり) ★★★
    const newCard = await createCard(userId, { deckId, front, back }); // userId を渡す

    return NextResponse.json(newCard, { status: 201 });
  } catch (error) {
     // Use your centralized error handler
    return handleApiError(error);
  }
}

// --- GET Handler (カード一覧取得) ---
export async function GET(
  request: Request,
  // ★★★ 引数の受け取り方を修正 (context を使用) ★★★
  context: { params: { deckId: string } } // Removed locale
) {
  try {
    // ★★★ context.params を await してから deckId を取得 ★★★
    const { deckId } = await context.params;
    // const locale = context.params.locale; // locale が必要なら同様に取得

    if (!deckId) {
      return NextResponse.json({ error: 'Deck ID is required' }, { status: 400 });
    }

    // 1. Authentication/Authorization
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 2. Call Service Function
    const cards = await getCardsByDeckId(userId, deckId);

    // 3. Success Response
    return NextResponse.json(cards, { status: 200 });

  } catch (error) {
    // 4. Error Handling
    return handleApiError(error);
  }
}
```

## File: app/(api)/api/decks/[deckId]/route.ts
```typescript
import { NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/auth'; // Adjusted import path
import { deleteDeck, getDeckById } from '@/services/deck.service'; // Adjusted import path - Added getDeckById
import { isAppError, NotFoundError, PermissionError, DatabaseError } from '@/lib/errors'; // Adjusted import path
import { ApiErrorResponse } from '@/types/api.types'; // Added import for error response type

// GET handler to retrieve a specific deck by ID
export async function GET(
  request: Request, // Keep request parameter as per Next.js convention
  context: { params: { deckId: string } } // Use context, removed locale
) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      const errorResponse: ApiErrorResponse = { error: 'UNAUTHORIZED', message: 'Authentication required.' };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const { deckId } = await context.params; // Await params

    // Validate deckId format if necessary (e.g., using a regex or library)
    // Example: if (!isValidUUID(deckId)) { return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid Deck ID format.' }, { status: 400 }); }

    const deckData = await getDeckById(userId, deckId);

    // Successfully retrieved, return deck data
    return NextResponse.json(deckData, { status: 200 });

  } catch (error) {
    console.error('Error fetching deck:', error); // Log the error server-side

    if (isAppError(error)) {
      let status = 500;
      let errorCode: ApiErrorResponse['error'] = 'INTERNAL_SERVER_ERROR'; // Default error code

      if (error instanceof NotFoundError) {
        status = 404;
        errorCode = 'NOT_FOUND';
      } else if (error instanceof PermissionError) {
        status = 403;
        errorCode = 'FORBIDDEN';
      } else if (error instanceof DatabaseError) {
        status = 500;
        errorCode = 'DATABASE_ERROR';
      } else {
        // Use error name for other specific AppErrors if needed, otherwise keep default
        errorCode = error.name as ApiErrorResponse['error']; // Cast, assuming error names match ApiErrorResponse types
      }

      const errorResponse: ApiErrorResponse = { error: errorCode, message: error.message };
      return NextResponse.json(errorResponse, { status });
    }

    // Handle unexpected errors
    const errorResponse: ApiErrorResponse = { error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected internal server error occurred.' };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}


export async function DELETE(
  request: Request, // Keep request parameter as per Next.js convention, though unused
  context: { params: { deckId: string } } // Use context, removed locale
) {
  try {
    const { deckId } = await context.params; // Await params
    const userId = await getServerUserId();
    if (!userId) {
      const errorResponse: ApiErrorResponse = { error: 'UNAUTHORIZED', message: 'Authentication required.' }; // Updated message
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // deckId is now available here after await

    await deleteDeck(userId, deckId);

    // Successfully deleted, return 204 No Content
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Error deleting deck:', error); // Log the error for debugging

    if (isAppError(error)) {
      let status = 500;
      let errorCode: ApiErrorResponse['error'] = 'INTERNAL_SERVER_ERROR'; // Define errorCode here

      if (error instanceof NotFoundError) {
        status = 404;
        errorCode = 'NOT_FOUND'; // Assign specific code
      } else if (error instanceof PermissionError) {
        status = 403;
        errorCode = 'FORBIDDEN'; // Assign specific code
      } else if (error instanceof DatabaseError) {
        // Keep status 500 for DatabaseError or use a specific code if preferred
        status = 500;
        errorCode = 'DATABASE_ERROR'; // Assign specific code
      } else {
         // Use error name for other specific AppErrors if needed, otherwise keep default
        errorCode = error.name as ApiErrorResponse['error']; // Cast, assuming error names match ApiErrorResponse types
      }
      // Use specific error codes as defined above
      const errorResponse: ApiErrorResponse = { error: errorCode, message: error.message }; // Use errorCode
      return NextResponse.json(errorResponse, { status });
    }

    // Handle unexpected errors
    const errorResponse: ApiErrorResponse = { error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected internal server error occurred.' }; // Updated message
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
```

## File: app/(api)/api/decks/route.ts
```typescript
// src/app/(api)/api/decks/route.ts (ページネーション対応済みの想定)

import { NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/auth';
import { deckCreateSchema, DeckCreatePayload } from '@/lib/zod';
import { createDeck, getAllDecks } from '@/services/deck.service';
// AppError, ValidationError は handleApiError 等で必要になる可能性を考慮し残置
import { AppError, isAppError, ValidationError, handleApiError, ERROR_CODES } from '@/lib/errors';
import { z, ZodError } from 'zod'; // z をインポート

/**
 * 新しいデッキを作成する (POST)
 */
export async function POST(request: Request) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: ERROR_CODES.AUTHENTICATION_FAILED, message: 'Authentication required.' }, { status: 401 });
    }

    let body: DeckCreatePayload;
    try {
      body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) { // ★★★ コメント追加 ★★★
      return NextResponse.json({ error: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid JSON format.' }, { status: 400 });
    }

    const validatedData = deckCreateSchema.parse(body);
    const newDeck = await createDeck(userId, validatedData);
    return NextResponse.json(newDeck, { status: 201 });

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid input data.',
        details: error.flatten().fieldErrors
       }, { status: 400 });
    }
    return handleApiError(error);
  }
}

/**
 * ログインユーザーのデッキ一覧を取得する (GET - ページネーション対応版)
 */
export async function GET(request: Request) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: ERROR_CODES.AUTHENTICATION_FAILED, message: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const querySchema = z.object({
        limit: z.coerce.number().int().min(1).max(100).default(10),
        offset: z.coerce.number().int().min(0).default(0),
    });

    let validatedQuery: { limit: number; offset: number };
    try {
      validatedQuery = querySchema.parse({
        limit: searchParams.get('limit'),
        offset: searchParams.get('offset'),
      });
    } catch (err) {
       if (err instanceof ZodError) {
         return NextResponse.json({
           error: ERROR_CODES.VALIDATION_ERROR,
           message: 'Invalid query parameters.',
           details: err.flatten().fieldErrors,
         }, { status: 400 });
       }
       // AppError をインポートしているので new を使う
       return handleApiError(new AppError('Failed to parse query parameters', 400, ERROR_CODES.VALIDATION_ERROR));
    }

    const { limit, offset } = validatedQuery;

    const { data: decks, totalItems } = await getAllDecks(userId, { limit, offset });

    const baseUrl = '/api/decks';
    const selfLink = `${baseUrl}?offset=${offset}&limit=${limit}`;
    let nextLink: string | null = null;
    if (offset + limit < totalItems) {
      nextLink = `${baseUrl}?offset=${offset + limit}&limit=${limit}`;
    }
    let previousLink: string | null = null;
    if (offset > 0) {
      const prevOffset = Math.max(0, offset - limit);
      previousLink = `${baseUrl}?offset=${prevOffset}&limit=${limit}`;
    }

    const responseBody = {
      data: decks,
      pagination: {
        offset: offset,
        limit: limit,
        totalItems: totalItems,
        _links: {
          self: selfLink,
          next: nextLink,
          previous: previousLink,
        },
      },
    };

    return NextResponse.json(responseBody, { status: 200 });

  } catch (error) {
    return handleApiError(error);
  }
}
```

## File: app/[locale]/(app)/(auth)/login/page.tsx
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
// Import useAuth hook
import { useAuth } from '@/hooks/useAuth';
import { Link } from '@/i18n/navigation'; // '@/' は src/ へのエイリアスと仮定

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { signIn } = useAuth(); // Use the hook

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Call the actual Supabase function via the hook
    const { error: signInError } = await signIn(email, password); // Pass email, password

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    } else {
      // Success! Redirect to dashboard.
      setMessage('Login successful! Redirecting...') // Optional message
      router.push('/dashboard') // Redirect to dashboard or desired page
      // No need to setLoading(false) here as we are navigating away
    }
  }

  // Added state for success message (optional)
  const [message, setMessage] = useState<string | null>(null)

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', paddingTop: '50px' }}>
      <h2>Log In</h2>
      <form onSubmit={handleSignIn}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '20px' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Logging In...' : 'Log In'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>Error: {error}</p>}
      {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
      {/* Optional: Links */}
      <p style={{ marginTop: '20px' }}>
        Don't have an account? <Link href="/signup">Sign Up</Link>
      </p>
      {/* <p style={{ marginTop: '10px' }}>
        <a href="/forgot-password">Forgot Password?</a>
      </p> */}
    </div>
  )
}
```

## File: app/[locale]/(app)/(auth)/signup/page.tsx
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
// Import useAuth hook
import { useAuth } from '@/hooks/useAuth';
import { Link } from '@/i18n/navigation'; // '@/' は src/ へのエイリアスと仮定

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const { signUp } = useAuth(); // Use the hook

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    // Call the actual Supabase function via the hook
    // Pass credentials as an object as required by our updated hook
    const { error: signUpError } = await signUp(email, password); // Corrected: pass email, password directly as per latest hook definition

    if (signUpError) {
      setError(signUpError.message)
    } else {
      // Success! Show message or redirect.
      // Check Supabase project settings for email verification requirements.
      setMessage('Sign up successful! Please check your email for verification.')
      // Optionally redirect after a delay or immediately:
      // setTimeout(() => router.push('/login'), 3000);
      // Or if email verification is off/not required for login:
      // router.push('/dashboard');
    }

    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', paddingTop: '50px' }}>
      <h2>Sign Up</h2>
      <form onSubmit={handleSignUp}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6} // Example: Enforce minimum password length
            style={{ width: '100%', padding: '8px', marginBottom: '20px' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>Error: {error}</p>}
      {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
       {/* Optional: Link to Login */}
       <p style={{ marginTop: '20px' }}>
         Already have an account? <Link href="/login">Log In</Link>
       </p>
    </div>
  )
}
```

## File: app/[locale]/(app)/(main)/decks/[deckId]/page.tsx
```typescript
import { notFound } from 'next/navigation'; // Import notFound for 404 handling
import { getServerUserId } from '@/lib/auth'; // Import function to get user ID
import { getDeckById } from '@/services/deck.service'; // Import the service function
import { NotFoundError, PermissionError, DatabaseError, isAppError } from '@/lib/errors';
import { CardList } from '@/components/features/CardList'; // Import the CardList component
import { CardCreateForm } from '@/components/features/CardCreateForm'; // Import the CardCreateForm component

// Define the expected type based on the *updated* service function (no cards included)
type DeckData = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  // 'cards' property is removed
};


interface DeckDetailPageProps {
  // Indicate that params might be a promise that needs resolving
  params: Promise<{
    deckId: string;
    locale: string; // Locale might be needed for translations later
  }> | {
    deckId: string;
    locale: string;
  };
}

export default async function DeckDetailPage({ params }: DeckDetailPageProps) {
  // Await params before accessing its properties
  const resolvedParams = await params;
  const { deckId } = resolvedParams;

  let deck: DeckData | null = null; // Use DeckData type (without cards)
  let errorInfo: { message: string; code?: string } | null = null;

  try {
    // 1. Get User ID directly in the RSC
    const userId = await getServerUserId();
    if (!userId) {
      // Handle unauthenticated user - maybe redirect or show a specific message
      // For now, treating as a permission error for simplicity
      throw new PermissionError('Authentication required to view this deck.');
    }

    // Fetch deck data (without cards)
    deck = await getDeckById(userId, deckId);

  } catch (error) {
    console.error('Error in DeckDetailPage:', error); // Log the error

    // --- Error Handling (Directly from Service Errors) ---
    if (error instanceof NotFoundError) {
      notFound(); // Trigger Next.js 404 page
    } else if (error instanceof PermissionError) {
      errorInfo = { message: error.message, code: 'FORBIDDEN' };
    } else if (error instanceof DatabaseError) {
      errorInfo = { message: 'A database error occurred while loading the deck.', code: 'DATABASE_ERROR' };
    } else if (isAppError(error)) {
       // Catch other AppErrors
       errorInfo = { message: error.message, code: error.name };
    }
     else {
      // Handle unexpected errors
      errorInfo = { message: 'An unexpected error occurred.', code: 'INTERNAL_SERVER_ERROR' };
    }
  }

  // --- Render Error State ---
  if (errorInfo) {
    return <div className="p-4 text-red-600">Error loading deck: {errorInfo.message} {errorInfo.code ? `(Code: ${errorInfo.code})` : ''}</div>;
  }

  // --- Render Success State ---
  // If we reach here and deck is still null, something went wrong (should be caught above)
  if (!deck) {
     return <div className="p-4 text-red-600">Error loading deck: Deck data is unavailable.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      {/* Deck Details */}
      <h1 className="text-3xl font-bold mb-2">{deck.name}</h1>
      <p className="text-gray-600 mb-6">{deck.description || 'No description provided.'}</p>

      {/* Separator or spacing */}
      <hr className="my-6" />

      {/* Add New Card Form (Client Component) */}
      <div className="mb-8"> {/* Add some margin below the form */}
        <h2 className="text-2xl font-semibold mb-4">Add New Card</h2>
        <CardCreateForm deckId={deck.id} />
      </div>

      {/* Render the CardList component (Client Component) */}
      <h2 className="text-2xl font-semibold mb-4">Cards in this Deck</h2>
      <CardList deckId={deck.id} />

      {/* Card rendering is now handled by the CardList component */}
    </div>
  );
}
```

## File: app/[locale]/(app)/(main)/decks/page.tsx
```typescript
// src/app/[locale]/(app)/(main)/decks/page.tsx (正しいコード)
'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation'; // useParams をインポート
import { useDecks } from '@/hooks/useDecks';
// useCreateDeck はフォームで使うのでここでは不要かも
import { useDeleteDeck } from '@/hooks/useDeckMutations'; // 削除フックをインポート
import { DeckCreateForm } from '@/components/features/DeckCreateForm';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'; // 確認ダイアログをインポート
import { type DeckApiResponse } from '@/types';
import Link from 'next/link'; // ★ Linkをインポート (詳細表示用) ★
import { useAuth } from '@/hooks/useAuth'; // ★ useAuth をインポート (ログイン状態確認用) ★

function DecksPage() {
  const { isLoading: authLoading } = useAuth(); // 認証状態を取得
  const ITEMS_PER_PAGE = 10; // 1ページあたりの表示件数 (定数として定義)
  const [offset, setOffset] = useState(0); // 現在のオフセット (初期値 0)

  // 更新された useDecks フックの呼び出し (修正: data ネストを削除)
  const { decks, pagination, isLoading, isFetching, error } = useDecks({
    offset: offset,
    limit: ITEMS_PER_PAGE,
  });

  const { mutate: deleteDeckMutate, isPending: isDeletingDeck, error: deleteDeckError } = useDeleteDeck();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<DeckApiResponse | null>(null);
  const params = useParams();

  const handleDeleteClick = (deck: DeckApiResponse) => {
    setDeckToDelete(deck);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deckToDelete) {
      deleteDeckMutate({ deckId: deckToDelete.id });
      setIsConfirmOpen(false);
      setDeckToDelete(null);
    }
  };

  // スピナーコンポーネント定義 (簡易版)
  const Spinner = () => <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>;

  // 認証状態のローディング中は何も表示しないか、ローディング表示
  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
  }

  // 未認証の場合はログインを促すなど (必要に応じて)
  // if (!authUser) {
  //   return <div>Please log in to view your decks.</div>;
  // }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Decks</h1>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Create New Deck</h2>
        <DeckCreateForm onSuccess={() => console.log('Deck created callback!')} />
      </div>

      <h2 className="text-2xl font-semibold mb-4">Existing Decks</h2>
      {/* ローディング表示 (isFetching を使うとバックグラウンド更新中もわかる) */}
      {(isLoading || isFetching) && !error && (
           <div className="flex justify-center items-center mt-4">
               <Spinner />
               <span className="ml-2">Loading...</span>
           </div>
      )}
      {/* エラー表示 */}
      {error && (
          <div className="text-red-600 mt-4 bg-red-100 border border-red-400 p-4 rounded">
              Error loading decks: {error.message}
          </div>
      )}
      {/* データ表示 */}
      {!isLoading && !error && decks && (
        <>
          {decks.length === 0 && !isFetching && ( // フェッチ中でなければ表示
            <p>You haven't created any decks yet.</p>
          )}
          {decks.length > 0 && (
            <ul className="space-y-3">
              {/* 修正: deck の型を追加 */}
              {decks.map((deck: DeckApiResponse) => (
                <li key={deck.id} className="p-4 border rounded-md shadow-sm bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                  <div className="flex justify-between items-center">
                    <Link href={`/decks/${deck.id}`} className="text-lg font-medium hover:underline">
                      {deck.name}
                    </Link>
                    <div className="space-x-2">
                      <Link href={`/decks/${deck.id}`} className="text-blue-500 hover:underline text-sm">View</Link>
                      <button className="text-yellow-500 hover:underline text-sm disabled:opacity-50" disabled>Edit</button>
                      <button
                        className="text-red-500 hover:underline text-sm disabled:opacity-50"
                        onClick={() => handleDeleteClick(deck)}
                        disabled={isDeletingDeck || isFetching} // データ取得中も無効化
                      >
                        {isDeletingDeck && deckToDelete?.id === deck.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  {deck.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{deck.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* ページネーションコントロール */}
      {!isLoading && !error && pagination && pagination.totalItems > 0 && (
        <div className="mt-6 flex items-center justify-center space-x-4">
          {/* Previous Button */}
          <button
            onClick={() => setOffset(Math.max(0, offset - ITEMS_PER_PAGE))}
            disabled={!pagination._links.previous || isFetching} // 前のページがないか、データ取得中は無効
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Previous
          </button>

          {/* Page Info */}
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {`Showing ${offset + 1} - ${Math.min(pagination.totalItems, offset + ITEMS_PER_PAGE)} of ${pagination.totalItems}`}
          </span>

          {/* Next Button */}
          <button
            onClick={() => setOffset(offset + ITEMS_PER_PAGE)}
            disabled={!pagination._links.next || isFetching} // 次のページがないか、データ取得中は無効
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      )}

      {/* 確認ダイアログ */}
      {deckToDelete && (
        <ConfirmationDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmDelete}
          title="Delete Deck"
          description={`Are you sure you want to delete "${deckToDelete.name}"? This cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          isConfirming={isDeletingDeck && deckToDelete?.id === deckToDelete.id} // 削除対象の時だけ isConfirming を true に
        />
      )}

      {/* 削除エラー表示 (任意) */}
      {deleteDeckError && (
         <div className="text-red-600 mt-4">
           Error deleting deck: {deleteDeckError.message}
         </div>
      )}
    </div>
  );
}

// ★★★ 必ずデフォルトエクスポートする ★★★
export default DecksPage;
```

## File: app/[locale]/(app)/test/page.tsx
```typescript
// src/app/[locale]/(app)/test/page.tsx (テスト用コード)

'use client'; // ダイアログの状態を管理するため Client Component にする

import React, { useState } from 'react';
// Corrected import path assuming '@/' alias points to 'src/'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

export default function DialogTestPage() {
  // ダイアログの表示状態を管理する state (最初から表示させるため true に設定)
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  // 確認ボタンが押された時の仮の処理
  const handleConfirm = () => {
    alert('Confirmed!');
    setIsDialogOpen(false); // 確認したら閉じる（テスト用）
  };

  // キャンセル時やオーバーレイクリックでダイアログを閉じる処理
  const handleOpenChange = (isOpen: boolean) => {
    setIsDialogOpen(isOpen);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Confirmation Dialog Isolation Test</h1>
      <p>
        If the dialog below appears correctly centered on the screen,
        the positioning issue is likely caused by interactions with other
        components or styles in its original context (e.g., within CardList).
      </p>
      <p>
        If the dialog below is still misplaced or cut off, the issue
        might be with the dialog's internal styles, Tailwind setup,
        or global CSS conflicts.
      </p>

      {/* 他の要素を置かずに ConfirmationDialog だけをレンダリング */}
      {/* isOpen が true なので最初から表示されるはず */}
      <ConfirmationDialog
        isOpen={isDialogOpen}
        onOpenChange={handleOpenChange}
        onConfirm={handleConfirm}
        title="Test Dialog: Is this centered?"
        description="This dialog should appear fixed and centered within the browser viewport, regardless of this text."
        confirmText="Confirm Test"
        cancelText="Cancel Test"
      />

      {/* ページが長い場合にスクロールが発生するようにダミーコンテンツを追加 (任意) */}
      <div style={{ height: '150vh', background: '#eee', marginTop: '20px' }}>
        Scrollable area below the dialog trigger point (dialog should stay centered).
      </div>
    </div>
  );
}
```

## File: app/[locale]/layout.tsx
```typescript
// src/app/[locale]/layout.tsx (修正版 - ルートレイアウトが存在する場合)
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';



// ★ Providers はここではインポート・使用しない ★
// import { Providers } from '@/components/providers';

// ロケール検証関数
const locales = ['en', 'ja'];
function isValidLocale(locale: string): boolean {
  return locales.includes(locale);
}

// (任意) メタデータ生成 (ルートレイアウトと別に定義する場合) ...

export default async function LocaleLayout({
  children,
  params: paramsPromise // 引数名を変更 (任意だが推奨)
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>; // ★ 型を Promise に ★
}) {
  const { locale } = await paramsPromise; // ★ await で解決 ★

  if (!isValidLocale(locale)) {
    notFound();
  }

  let messages;
  try {
    messages = await getMessages({ locale });
  } catch (error) {
    console.error("Failed to load messages for locale:", locale, error);
    notFound();
  }
  if (!messages) {
     notFound();
  }

  // ★★★ <html> と <body> は削除し、Provider のみがトップレベル ★★★
  return (
    // NextIntlClientProvider はロケールごとに必要
    <NextIntlClientProvider locale={locale} messages={messages}>
      {/* Providers は既に上位の RootLayout で適用されているので不要 */}
      {children}
    </NextIntlClientProvider>
  );
}
```

## File: app/[locale]/page.tsx
```typescript
import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
 
export default function HomePage() {
  const t = useTranslations('HomePage');
  return (
    <div>
      <h1>{t('title')}</h1>
      <Link href="/about">{t('about')}</Link>
    </div>
  );
}
```

## File: components/features/CardCreateForm.tsx
```typescript
"use client"; // Add this directive

import React from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// Removed Tamagui imports
import { useCreateCard } from '@/hooks/useCardMutations';
import { useTranslations } from 'next-intl'; // Use the correct client hook

// Validation schema for the form
const cardSchema = z.object({
  front: z.string().min(1, 'Front text cannot be empty'),
  back: z.string().min(1, 'Back text cannot be empty'),
});

type CardFormData = z.infer<typeof cardSchema>;

interface CardCreateFormProps {
  deckId: string;
  onCardCreated?: () => void; // Optional callback after successful creation
}

export const CardCreateForm: React.FC<CardCreateFormProps> = ({ deckId, onCardCreated }) => {
  const t = useTranslations('cardCreateForm'); // Use the correct hook
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      front: '',
      back: '',
    },
  });

  const { mutate: createCard, isPending, error } = useCreateCard(deckId, {
    onSuccess: () => {
      console.log('Card created, resetting form.');
      reset(); // Reset form fields
      onCardCreated?.(); // Call optional callback
      // Optionally show a success toast/message
    },
    onError: (err) => {
      console.error('Card creation failed:', err);
      // Optionally show an error toast/message
    },
  });

  const onSubmit: SubmitHandler<CardFormData> = (data) => {
    console.log('Submitting new card:', data);
    createCard(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Front Input */}
      <div className="space-y-1"> {/* Replaced YStack */}
        <label htmlFor="front" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t ? t('frontLabel') : 'Front'} <span className="text-red-500">*</span>
        </label>
        <Controller
          name="front"
          control={control}
          render={({ field }) => (
            <textarea
              id="front"
              placeholder={t ? t('frontPlaceholder') : 'Enter front text...'}
              {...field}
              rows={3}
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.front ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
              aria-invalid={errors.front ? 'true' : 'false'}
            />
          )}
        />
        {errors.front && (
          <p className="mt-1 text-sm text-red-600" role="alert"> {/* Replaced Paragraph */}
            {errors.front.message}
          </p>
        )}
      </div>

      {/* Back Input */}
      <div className="space-y-1"> {/* Replaced YStack */}
        <label htmlFor="back" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t ? t('backLabel') : 'Back'} <span className="text-red-500">*</span>
        </label>
        <Controller
          name="back"
          control={control}
          render={({ field }) => (
            <textarea
              id="back"
              placeholder={t ? t('backPlaceholder') : 'Enter back text...'}
              {...field}
              rows={3}
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.back ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
              aria-invalid={errors.back ? 'true' : 'false'}
            />
          )}
        />
        {errors.back && (
          <p className="mt-1 text-sm text-red-600" role="alert"> {/* Replaced Paragraph */}
            {errors.back.message}
          </p>
        )}
      </div>

      {/* API Error Message */}
      {error && (
        <div className="mt-2 p-2 border border-red-300 bg-red-50 dark:bg-red-900/30 rounded-md" role="alert">
          <p className="text-sm text-red-700 dark:text-red-300"> {/* Replaced Paragraph */}
            {t ? t('creationError', { message: error.message }) : `Error: ${error.message}`}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <div> {/* Wrapper div */}
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* Replaced Spinner with text */}
          {isPending ? (t ? t('creatingButton') : 'Creating...') : (t ? t('createButton') : 'Add Card')}
        </button>
      </div>
    </form>
  );
};
```

## File: components/features/CardEditModal.tsx
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cardUpdateSchema, CardUpdatePayload } from '@/lib/zod';
import { useUpdateCard, Card } from '@/hooks/useCardMutations'; // Assuming Card type is exported here
import { AppError } from '@/lib/errors';

interface CardEditModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  card: Card | null;
  deckId: string;
  onSuccess?: () => void;
}

export const CardEditModal: React.FC<CardEditModalProps> = ({
  isOpen,
  onOpenChange,
  card,
  deckId,
  onSuccess,
}) => {
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CardUpdatePayload>({
    resolver: zodResolver(cardUpdateSchema),
    defaultValues: {
      front: '',
      back: '',
    },
  });

  // Reset form when card prop changes
  useEffect(() => {
    if (card) {
      reset({
        front: card.front,
        back: card.back,
      });
      setApiError(null); // Clear previous errors when a new card is loaded
    } else {
      // Reset to empty if card becomes null (e.g., modal closed and reopened without a card)
      reset({ front: '', back: '' });
      setApiError(null);
    }
  }, [card, reset]);

  const handleSuccess = (updatedCard: Card) => {
    console.log('Card updated successfully:', updatedCard);
    setApiError(null);
    onSuccess?.(); // Call external success handler if provided
    onOpenChange(false); // Close modal on success
  };

  const handleError = (error: AppError) => {
    console.error('Error updating card:', error);
    setApiError(error.message || 'An unexpected error occurred.');
    // Optionally, handle specific error codes from error.errorCode
  };

  const { mutate, isPending } = useUpdateCard(deckId, {
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const onSubmit: SubmitHandler<CardUpdatePayload> = (data) => {
    if (!card) {
      console.error('Cannot submit: No card selected for editing.');
      setApiError('Cannot submit: No card selected for editing.');
      return;
    }
    setApiError(null); // Clear previous API errors before submitting
    console.log('Submitting update for card:', card.id, 'with data:', data);
    mutate({ cardId: card.id, data });
  };

  const handleClose = () => {
    onOpenChange(false);
    // Optionally reset form here if desired when closing via cancel/overlay
    // reset({ front: card?.front || '', back: card?.back || '' });
    setApiError(null); // Clear errors on close
  };

  if (!isOpen || !card) {
    return null; // Don't render anything if not open or no card
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleClose} // Close on overlay click
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal content
      >
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Edit Card
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-4">
            <label
              htmlFor="front"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Front
            </label>
            <textarea
              id="front"
              {...register('front')}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                errors.front ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              aria-invalid={errors.front ? 'true' : 'false'}
            />
            {errors.front && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.front.message}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label
              htmlFor="back"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Back
            </label>
            <textarea
              id="back"
              {...register('back')}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                errors.back ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              aria-invalid={errors.back ? 'true' : 'false'}
            />
            {errors.back && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.back.message}
              </p>
            )}
          </div>

          {/* Display API Error */}
          {apiError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md dark:bg-red-900 dark:border-red-700 dark:text-red-200" role="alert">
              <p className="text-sm">{apiError}</p>
            </div>
          )}
          {/* Display general form error from refine */}
           {errors.root && ( // Check for root errors if using refine on the schema object itself
             <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md dark:bg-red-900 dark:border-red-700 dark:text-red-200" role="alert">
               <p className="text-sm">{errors.root.message}</p>
             </div>
           )}


          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500"
              disabled={isPending || isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isPending || isSubmitting}
            >
              {isPending || isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

## File: components/features/CardList.tsx
```typescript
// src/components/features/CardList.tsx
'use client'; // This component uses hooks, so it needs to be a client component

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCards, Card } from '@/hooks/useCards'; // Import Card type from useCards
// Import Card type from useCardMutations (expects string dates), alias it for clarity
import { useDeleteCard, Card as CardWithStringDates } from '@/hooks/useCardMutations';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { CardEditModal } from './CardEditModal'; // Import the new modal

// import { YStack, Text, Spinner, Button } from 'tamagui'; // Example if using Tamagui

interface CardListProps {
  deckId: string;
}

// Local Card type definition removed.


export const CardList: React.FC<CardListProps> = ({ deckId }) => {
  // useCards returns cards with Date objects for date fields
  const { cards, isLoading, error } = useCards(deckId);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false); // State to track client-side mount

  // State for Edit Modal - uses Card type with string dates
  const [editingCard, setEditingCard] = useState<CardWithStringDates | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Set mounted state after component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);


  // Instantiate the delete mutation hook
  const deleteCardMutation = useDeleteCard(deckId, {
    onSuccess: (deletedCardId) => {
      console.log(`Successfully deleted card ${deletedCardId} and invalidated query.`);
      setIsDeleteDialogOpen(false); // Close dialog on success
      setCardToDelete(null);
      // Optionally show a success toast/message here
    },
    onError: (error, deletedCardId) => {
      console.error(`Failed to delete card ${deletedCardId}:`, error.message);
      // Keep dialog open or close? Let's close it for now.
      setIsDeleteDialogOpen(false);
      setCardToDelete(null);
      // Optionally show an error toast/message here
      alert(`Error deleting card: ${error.message}`); // Simple alert for now
    },
  });

  // Handler to open the confirmation dialog
  const handleDeleteClick = (cardId: string) => {
    setCardToDelete(cardId);
    setIsDeleteDialogOpen(true);
  };

  // Handler to confirm deletion
  const handleConfirmDelete = () => {
    if (cardToDelete) {
      deleteCardMutation.mutate({ cardId: cardToDelete });
      // Dialog will be closed via onSuccess/onError callbacks
    }
  };

  // Handler to open the edit modal
  // Accepts a card object from useCards (with Date fields)
  // Converts it to CardWithStringDates before setting state
  const handleEditClick = (cardFromUseCards: Card) => { // Use the imported Card type
    if (!cardFromUseCards) return;
    // Create the object for the modal state, converting dates to ISO strings
    const cardForModal: CardWithStringDates = {
      ...cardFromUseCards,
      // Ensure conversion only happens if it's actually a Date object
      nextReviewAt: cardFromUseCards.nextReviewAt instanceof Date
        ? cardFromUseCards.nextReviewAt.toISOString()
        : String(cardFromUseCards.nextReviewAt ?? ''), // Handle null/undefined
      createdAt: cardFromUseCards.createdAt instanceof Date
        ? cardFromUseCards.createdAt.toISOString()
        : String(cardFromUseCards.createdAt ?? ''), // Handle null/undefined
      updatedAt: cardFromUseCards.updatedAt instanceof Date
        ? cardFromUseCards.updatedAt.toISOString()
        : String(cardFromUseCards.updatedAt ?? ''), // Handle null/undefined
    };
    setEditingCard(cardForModal);
    setIsEditModalOpen(true);
  };

  if (isLoading) {
    return (
      <div>
        <p>Loading cards...</p>
        {/* <Spinner size="large" color="$blue10" /> */}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: 'red' }}>
        <p>Error loading cards: {error.message}</p>
        {/* Optionally show error code or details */}
        {/* {error instanceof AppError && <p>Code: {error.errorCode}</p>} */}
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return <p>No cards found in this deck.</p>;
  }


// Render the Confirmation Dialog outside the main list structure
return (
  <>
    {/* <YStack space="$3"> */}
    <div>
      <h2>Cards in this Deck ({cards?.length ?? 0})</h2>
      {cards && cards.length > 0 ? (
        <ul>
          {cards.map((card) => ( // card from useCards has Date objects
            <li key={card.id} style={{ border: '1px solid #ccc', marginBottom: '10px', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* <YStack space="$2" padding="$3" borderRadius="$3" backgroundColor="$backgroundFocus"> */}
              <div>
                <p><strong>Front:</strong> {card.front}</p>
                {/* <Text fontWeight="bold">Front:</Text> <Text>{card.front}</Text> */}
                <p><strong>Back:</strong> {card.back}</p>
                {/* <Text fontWeight="bold">Back:</Text> <Text>{card.back}</Text> */}
                {/* Add more details as needed, e.g., next review date */}
                <p><small>Next Review: {new Date(card.nextReviewAt).toLocaleDateString()}</small></p>
                {/* <Text fontSize="$2" color="$color11">Next Review: {new Date(card.nextReviewAt).toLocaleDateString()}</Text> */}
              </div>
              {/* Action Buttons Container */}
              <div className="flex space-x-2 ml-4 self-start">
                 {/* Edit Button */}
                 <button
                   onClick={() => handleEditClick(card)} // Pass the card object from useCards
                   className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                   aria-label={`Edit card ${card.front}`}
                 >
                   Edit
                 </button>
                 {/* Delete Button */}
                 <button
                   onClick={() => handleDeleteClick(card.id)}
                   disabled={deleteCardMutation.isPending && cardToDelete === card.id}
                   className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   aria-label={`Delete card ${card.front}`}
                 >
                   {deleteCardMutation.isPending && cardToDelete === card.id ? 'Deleting...' : 'Delete'}
                 </button>
              </div>
              {/* </YStack> */}
            </li>
          ))}
        </ul>
      ) : (
        <p>No cards found in this deck.</p> // Handle case where cards array exists but is empty
      )}
    </div>
    {/* </YStack> */}

    {/* Render Confirmation Dialog via Portal if mounted */}
    {isMounted && createPortal(
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Card"
        description="Are you sure you want to delete this card? This action cannot be undone."
        confirmText="Delete"
        isConfirming={deleteCardMutation.isPending}
      />,
      document.body // Target the body element
    )}

    {/* Render CardEditModal via Portal if mounted */}
    {isMounted && createPortal(
      <CardEditModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        card={editingCard} // Pass the state variable holding the card (with string dates)
        deckId={deckId}
        onSuccess={() => {
          setIsEditModalOpen(false); // Close modal on success
          setEditingCard(null); // Clear editing card state
          // Optionally add success feedback like a toast
          console.log('Card update successful, modal closed.');
        }}
      />,
      document.body // Target the body element
    )}
  </>
);
};
```

## File: components/features/DeckCreateForm.tsx
```typescript
'use client';

import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { deckCreateSchema, type DeckCreatePayload } from '@/lib/zod';
import { useCreateDeck, ApiError } from '@/hooks/useDeckMutations'; // Import ApiError
import { AuthError } from '@supabase/supabase-js'; // Import AuthError if needed for specific handling

interface DeckCreateFormProps {
  /** Optional callback function triggered on successful deck creation. */
  onSuccess?: () => void;
}

export const DeckCreateForm: React.FC<DeckCreateFormProps> = ({ onSuccess }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DeckCreatePayload>({
    resolver: zodResolver(deckCreateSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const { mutate, isPending, error } = useCreateDeck();

  const onSubmit: SubmitHandler<DeckCreatePayload> = (data) => {
    const payload = {
      ...data,
      description: data.description === '' ? null : data.description,
    };
    mutate(payload, {
      onSuccess: () => {
        reset();
        onSuccess?.();
      },
      onError: (err) => {
        console.error("Form submission error:", err);
      }
    });
  };

  let errorMessage: string | null = null;
  if (error) {
    if (error instanceof ApiError) {
      errorMessage = `Error: ${error.message} (Status: ${error.status})`;
      // Safely access the machine-readable code from the details property
      if (typeof error.details === 'object' && error.details !== null && 'error' in error.details) {
        // Now we know error.details is an object with an 'error' property
        // We might still want to check the type of error.details.error if needed
        const errorCode = (error.details as { error?: unknown }).error; // Cast to access
        if (errorCode) { // Check if errorCode is truthy
             errorMessage += ` [Code: ${errorCode}]`;
        }
      }
    } else if (error instanceof AuthError) {
        errorMessage = `Authentication Error: ${error.message}`;
    } else {
      errorMessage = 'An unexpected error occurred.';
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="deck-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Deck Name <span className="text-red-500">*</span>
        </label>
        <input
          id="deck-name"
          type="text"
          {...register('name')}
          className={`mt-1 block w-full px-3 py-2 border ${
            errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
          aria-invalid={errors.name ? 'true' : 'false'}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="deck-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description (Optional)
        </label>
        <textarea
          id="deck-description"
          {...register('description')}
          rows={3}
          className={`mt-1 block w-full px-3 py-2 border ${
            errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
          aria-invalid={errors.description ? 'true' : 'false'}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Display API Error Message */}
      {errorMessage && (
        <div className="mt-2 p-2 border border-red-300 bg-red-50 dark:bg-red-900/30 rounded-md" role="alert">
          <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? '作成中...' : 'Create Deck'}
        </button>
      </div>
    </form>
  );
};
```

## File: components/features/DeckCreateModal.tsx
```typescript
import React from 'react';
import { DeckCreateForm } from './DeckCreateForm';

interface DeckCreateModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess?: () => void; // Optional callback after successful creation
}

export function DeckCreateModal({ isOpen, onOpenChange, onSuccess }: DeckCreateModalProps) {
  const handleSuccess = () => {
    onOpenChange(false); // Close modal on success
    if (onSuccess) {
      onSuccess();
    }
  };

  // Handle closing the modal when clicking the overlay
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if the click target is the overlay itself, not its children
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  if (!isOpen) {
    return null; // Don't render anything if the modal is closed
  }

  return (
    // Portal equivalent (rendered at the end of body usually, but here just fixed position)
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-labelledby="deck-create-modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        aria-hidden="true"
        onClick={handleOverlayClick} // Close on overlay click
      ></div>

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transform transition-all sm:my-8">
        <div className="p-6 space-y-4">
          <h2 id="deck-create-modal-title" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
            Create New Deck
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter the name for your new deck. Click save when you're done.
          </p>
          {/* Deck Create Form */}
          <DeckCreateForm onSuccess={handleSuccess} />

          {/* Optional: Add a close button if needed */}
          {/* <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            X {/* Replace with an icon if available *}
          {/* </button> */}
        </div>
      </div>
    </div>
  );
}
```

## File: components/providers/AuthProvider.tsx
```typescript
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase' // Client-side client

// Define the shape of the context data
interface AuthContextType {
  session: Session | null
  user: User | null
  isLoading: boolean
  // Auth functions (signUp, signIn, signOut) will be provided by useAuth hook
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create the provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient() // Initialize client-side client
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Start as true

  useEffect(() => {
    setIsLoading(true) // Set loading true when checking session initially

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false) // Set loading false after initial check
    }).catch((error) => {
        console.error("Error getting initial session:", error);
        setIsLoading(false); // Ensure loading is false even on error
    })

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("Auth state changed:", _event, session);
        setSession(session)
        setUser(session?.user ?? null)
        // Don't set isLoading here, only on initial load
      }
    )

    // Cleanup subscription on unmount
    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [supabase]) // Depend on supabase client instance

  const value = {
    session,
    user,
    isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use the auth context
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
```

## File: components/ui/ConfirmationDialog.tsx
```typescript
"use client";

import React from 'react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean; // Confirmation processing loading state
}

export function ConfirmationDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm', // Default value
  cancelText = 'Cancel',   // Default value
  isConfirming = false,
}: ConfirmationDialogProps) {

  // Handle closing the modal when clicking the overlay
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  if (!isOpen) {
    return null; // Don't render anything if the modal is closed
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-labelledby="confirmation-dialog-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        aria-hidden="true"
        onClick={handleOverlayClick} // Close on overlay click
      ></div>

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transform transition-all sm:my-8">
        <div className="p-6 space-y-4"> {/* Replaced YStack */}
          <h2 id="confirmation-dialog-title" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100"> {/* Replaced Dialog.Title */}
            {title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400"> {/* Replaced Dialog.Description/Paragraph */}
            {description}
          </p>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4"> {/* Replaced XStack */}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-label={cancelText}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isConfirming}
              className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={confirmText}
            >
              {isConfirming ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## File: components/providers.tsx
```typescript
'use client' // Mark this as a Client Component

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './providers/AuthProvider' // Import AuthProvider

// Create a React Query client instance (only once per app load)
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Default options for queries if needed
        staleTime: 60 * 1000, // 1 minute
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}


export function Providers({ children }: { children: React.ReactNode }) {
  // Initialize queryClient using state to ensure it's stable across re-renders
  // NOTE: useState ensures the client is created only once per component instance.
  // Use getQueryClient to handle server/client differences.
  const [queryClient] = useState(() => getQueryClient())

  return (
    // Wrap with AuthProvider
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
          {children}
      </QueryClientProvider>
    </AuthProvider>
  )
}
```

## File: hooks/useAuth.ts
```typescript
import { createClient } from '@/lib/supabase' // Client-side client
import { AuthError, User, Session } from '@supabase/supabase-js' // Removed unused AuthResponse, AuthTokenResponsePassword
import { useAuthContext } from '@/components/providers/AuthProvider' // Import the context hook

// Define the types for the hook's return value
interface AuthHookValue {
    // Auth state from context
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    // Auth functions
    signUp: (email: string, password: string) => Promise<{ data: { user: User | null; session: Session | null; }; error: AuthError | null; }>;
    signIn: (email: string, password: string) => Promise<{ data: { user: User | null; session: Session | null; }; error: AuthError | null; }>;
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
```

## File: hooks/useCardMutations.ts
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { Prisma } from '@prisma/client'; // Using local interface instead
import { AppError, ERROR_CODES } from '@/lib/errors'; // Import base error type and ERROR_CODES
// import { useLocale } from 'next-intl'; // Removed: No longer needed for API calls
// import { i18nConfig } from '@/i18n/routing'; // Not needed for useLocale
import { CardUpdatePayload } from '@/lib/zod'; // Import the payload type
// Define a simple interface for the Card data matching the expected API response
export interface Card {
  id: string;
  front: string;
  back: string;
  deckId: string;
  interval: number;
  easeFactor: number;
  nextReviewAt: string; // Or Date, adjust based on API serialization
  createdAt: string;    // Or Date
  updatedAt: string;    // Or Date
  // Add other optional fields from prisma/schema.prisma if needed
  // frontAudioUrl?: string | null;
  // backAudioUrl?: string | null;
  // explanation?: string | null;
  // translation?: string | null;
}

// Define the type for the data needed to create a card
type CreateCardData = {
  front: string;
  back: string;
};

// Define the type for the mutation context, including the deckId
type CreateCardContext = {
  deckId: string;
};

// API call function
const createCardApi = async (
  { deckId }: CreateCardContext,
  newData: CreateCardData
): Promise<Card> => {
  const response = await fetch(`/api/decks/${deckId}/cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    // Throw an AppError or a more specific error based on errorData
    throw new AppError(
      errorData.message || 'Failed to create card',
      response.status,
      errorData.errorCode || 'API_ERROR',
      errorData.details
    );
  }

  return response.json();
};

/**
 * Custom hook for creating a new card within a specific deck.
 *
 * @param deckId - The ID of the deck to add the card to.
 * @param options - Optional TanStack Query mutation options (e.g., onSuccess, onError).
 */
export const useCreateCard = (
  deckId: string,
  options?: {
    onSuccess?: (data: Card) => void;
    onError?: (error: AppError) => void;
  }
) => {
  const queryClient = useQueryClient();
  // const locale = useLocale(); // Removed: No longer needed for API calls

  return useMutation<Card, AppError, CreateCardData>({
    mutationFn: (newData) => createCardApi({ deckId }, newData),
    onSuccess: (data) => {
      // Invalidate the query for the list of cards in this deck
      // Adjust the query key based on how you fetch cards (e.g., in useCards hook)
      queryClient.invalidateQueries({ queryKey: ['cards', deckId] });
      console.log('Card created successfully:', data);
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('Error creating card:', error);
      options?.onError?.(error);
      // Handle error display in the UI (e.g., show a toast notification)
    },
  });
};

// Add other card mutation hooks here (e.g., useUpdateCard, useDeleteCard)
// --- Delete Card ---

// API call function for deleting a card
const deleteCardApi = async (
  deckId: string,
  cardId: string
): Promise<void> => {
  const response = await fetch(`/api/decks/${deckId}/cards/${cardId}`, {
    method: 'DELETE',
  });

  // 204 No Content is a success status for DELETE
  if (!response.ok && response.status !== 204) {
    let errorData = { message: 'Failed to delete card', errorCode: 'API_ERROR', details: null };
    try {
        // Attempt to parse error details if available
        errorData = await response.json();
    } catch (_e) {
        // Ignore JSON parse error if body is empty or not JSON
        console.warn("Could not parse error response body for DELETE card request.");
    }
    throw new AppError(
      errorData.message || 'Failed to delete card',
      response.status,
      // Use a valid ErrorCode as fallback
      (ERROR_CODES[errorData.errorCode as keyof typeof ERROR_CODES] || ERROR_CODES.INTERNAL_SERVER_ERROR),
      errorData.details
    );
  }

  // No content to return on successful deletion (204)
};

/**
 * Custom hook for deleting a card from a specific deck.
 *
 * @param deckId - The ID of the deck the card belongs to.
 * @param options - Optional TanStack Query mutation options (e.g., onSuccess, onError).
 */
export const useDeleteCard = (
  deckId: string,
  options?: {
    onSuccess?: (cardId: string) => void; // Pass cardId to onSuccess for potential UI updates
    onError?: (error: AppError, cardId: string) => void;
  }
) => {
  const queryClient = useQueryClient();
  // const locale = useLocale(); // Removed: No longer needed for API calls

  return useMutation<void, AppError, { cardId: string }>({ // Takes { cardId } as input
    mutationFn: ({ cardId }) => deleteCardApi(deckId, cardId),
    onSuccess: (_, variables) => { // First arg is data (void), second is variables ({ cardId })
      // Invalidate the query for the list of cards in this deck
      queryClient.invalidateQueries({ queryKey: ['cards', deckId] });
      console.log(`Card ${variables.cardId} deleted successfully from deck ${deckId}`);
      options?.onSuccess?.(variables.cardId);
    },
    onError: (error, variables) => {
      console.error(`Error deleting card ${variables.cardId}:`, error);
      options?.onError?.(error, variables.cardId);
      // Handle error display in the UI
    },
  });
};

// --- Update Card API Call ---

// Define or import the Card type (use local if needed, align with API response)
// Using local definition from lines 8-23

const updateCardApi = async (
  deckId: string,
  cardId: string,
  updateData: CardUpdatePayload // Use the imported type
): Promise<Card> => { // Should return the updated Card object on success
  if (!deckId || !cardId) {
      throw new Error('Deck ID and Card ID are required for updating a card.');
  }

  const apiUrl = `/api/decks/${deckId}/cards/${cardId}`;
  console.log(`[updateCardApi] Calling PUT ${apiUrl}`); // For debugging

  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      // Include other necessary headers like Authorization if needed, though usually handled by cookies/middleware
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    // Attempt to parse error details from the response body
    let errorBody = { message: `Failed to update card (Status: ${response.status})`, errorCode: 'API_ERROR', details: null };
    try {
        // Check content type before parsing
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
             errorBody = await response.json();
        }
    } catch (e) {
      console.warn("[updateCardApi] Could not parse error response body:", e);
      // Keep default error message if parsing fails
    }

    // Throw an AppError using details from the parsed body or defaults
    throw new AppError(
      errorBody.message || `Failed to update card (Status: ${response.status})`,
      response.status,
      // Use the errorCode from the response if available and valid, otherwise default
      (ERROR_CODES[errorBody.errorCode as keyof typeof ERROR_CODES] || ERROR_CODES.INTERNAL_SERVER_ERROR),
      errorBody.details
    );
  }

  // If response is OK (e.g., 200), parse and return the updated card data
  return response.json() as Promise<Card>; // Type assertion based on expected API success response
};


/**
 * Custom hook for updating an existing card within a specific deck.
 * Handles API interaction, loading state, errors, and cache invalidation.
 *
 * @param deckId - The ID of the deck the card belongs to. This is used for cache invalidation.
 * @param options - Optional TanStack Query mutation options like onSuccess and onError callbacks.
 */
export const useUpdateCard = (
  deckId: string, // Required for cache invalidation
  options?: {
    /** Callback function fired upon successful mutation. Receives the updated card data and original variables. */
    onSuccess?: (updatedCard: Card, variables: { cardId: string; data: CardUpdatePayload }) => void;
    /** Callback function fired upon mutation error. Receives the error and original variables. */
    onError?: (error: AppError, variables: { cardId: string; data: CardUpdatePayload }) => void;
    /** Add other standard useMutation options if needed (e.g., onMutate, onSettled) */
  }
) => {
  const queryClient = useQueryClient();
  // const locale = useLocale(); // Removed: No longer needed for API calls

  // Define the mutation using useMutation
  return useMutation<
    Card,                                     // Type returned by mutationFn on success (updated card)
    AppError,                                 // Type of error thrown on failure
    { cardId: string; data: CardUpdatePayload } // Type of variables passed to the mutate function
  >({
    // The core mutation function that performs the asynchronous task
    mutationFn: ({ cardId, data }) => updateCardApi(deckId, cardId, data),

    // Function called after the mutation succeeds
    onSuccess: (updatedCard, variables) => {
      console.log(`Card ${variables.cardId} updated successfully. Invalidating cache for deck ${deckId}.`);

      // Invalidate the query cache for the list of cards in this deck to trigger a refetch.
      // Ensure the query key matches the one used in the useCards hook.
      queryClient.invalidateQueries({ queryKey: ['cards', deckId] });

      // Call the user-provided onSuccess callback, if defined
      options?.onSuccess?.(updatedCard, variables);
    },

    // Function called after the mutation fails
    onError: (error, variables) => {
      console.error(`Error updating card ${variables.cardId}:`, error);

      // Call the user-provided onError callback, if defined
      options?.onError?.(error, variables);

      // Note: UI-level error display (e.g., toasts) should typically be handled
      // in the component calling this hook, using the error state returned by useMutation.
    },

    // Include other options passed by the user if necessary
    // ...options, // This would spread other options like onMutate, onSettled, etc.
  });
};
```

## File: hooks/useCards.ts
```typescript
// src/hooks/useCards.ts (useQuery を使うように修正)

import { useQuery } from '@tanstack/react-query'; // ★ useQuery をインポート ★
import { AppError, isAppError } from '@/lib/errors';
// import { Card } from '@prisma/client'; // もし Prisma Client の型が使えるならこちらを推奨

// ★ 手動の状態管理 (useState) は削除 ★
// const [cards, setCards] = useState<Card[] | null>(null);
// const [isLoading, setIsLoading] = useState<boolean>(true);
// const [error, setError] = useState<AppError | Error | null>(null);
// const [refreshKey, setRefreshKey] = useState<number>(0);

// Workaround: Define Card type locally (Prisma Client 型が使えない場合)
export type Card = {
    id: string;
    front: string;
    back: string;
    frontAudioUrl?: string | null;
    backAudioUrl?: string | null;
    explanation?: string | null;
    translation?: string | null;
    interval: number;
    easeFactor: number;
    nextReviewAt: Date; // API が Date 型を返すか、文字列なら Date に変換
    createdAt: Date;
    updatedAt: Date;
    deckId: string;
};

// Interface for the raw data expected from the API before date conversion
interface RawCardData {
    id: string;
    front: string;
    back: string;
    frontAudioUrl?: string | null;
    backAudioUrl?: string | null;
    explanation?: string | null;
    translation?: string | null;
    interval: number;
    easeFactor: number;
    nextReviewAt: string; // Expect string from API
    createdAt: string;    // Expect string from API
    updatedAt: string;    // Expect string from API
    deckId: string;
    // Add any other properties returned by the API
}

// Interface for potential error object structure
interface ApiErrorLike {
    message?: string;
    errorCode?: string;
    details?: unknown;
    // Add other potential error properties if known
}

// --- API からカードデータを取得する非同期関数 ---
// (useQuery の queryFn として使われる)
const fetchCardsByDeckId = async (deckId: string): Promise<Card[]> => {
    if (!deckId) {
        throw new Error('Deck ID is missing. Cannot fetch cards.');
    }

    const apiUrl = `/api/decks/${deckId}/cards`;
    console.log(`[useCards fetcher] Fetching cards from: ${apiUrl}`);
    const response = await fetch(apiUrl);

    if (!response.ok) {
        let errorData: ApiErrorLike = { message: `HTTP error! status: ${response.status}` };
        try {
            const contentType = response.headers.get('content-type');
            if (response.body && contentType && contentType.includes('application/json')) {
                errorData = await response.json();
            } else if (response.body) {
                 const textResponse = await response.text();
                 console.warn(`[useCards fetcher] Received non-JSON error response: ${textResponse.substring(0,100)}`);
                 // Ensure errorData is an object before assigning
                 if (typeof errorData === 'object' && errorData !== null) {
                    errorData.message = textResponse.substring(0,100); // エラーメッセージとして一部利用
                 }
            }
        } catch (e) {
            console.warn('[useCards fetcher] Could not parse error response body:', e);
        }
        // AppError の形式に近いか、あるいは汎用エラーを投げる
        // Use the type guard first
        if (isAppError(errorData)) {
           // TypeScript knows errorData is AppError, so errorCode is ErrorCode type
           throw new AppError(
               errorData.message, // message is guaranteed string by AppError
               response.status,
               errorData.errorCode, // No cast needed
               errorData.details
           );
        } else {
           // Handle non-AppError cases (might still have a message property)
           const errorMessage = (typeof errorData === 'object' && errorData !== null && 'message' in errorData && typeof errorData.message === 'string')
                                ? errorData.message
                                : `HTTP error! status: ${response.status}`;
           throw new Error(errorMessage);
        }
    }

    // Assume the API returns an array of objects matching RawCardData
    const data: RawCardData[] = await response.json();
    // API が日付を文字列で返す場合、ここで Date オブジェクトに変換
    const typedData: Card[] = data.map(item => ({
        ...item,
        nextReviewAt: new Date(item.nextReviewAt),
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
    }));
    return typedData;
};

// --- useCards カスタムフック本体 ---
export const useCards = (deckId: string | null) => {
    // ★★★ useQuery を使用 ★★★
    const {
        data: cards, // data プロパティを 'cards' として受け取る
        isLoading,
        error,
        // refetch // 手動で再取得したい場合に使う (今回は invalidate で十分なはず)
    } = useQuery<Card[], Error | AppError>({ // 型を指定 (成功時は Card[], エラー時は Error または AppError)
        // ★ queryKey: invalidateQueries で指定したキーと一致させる ★
        // deckId が null や undefined の場合はクエリが無効になるようにする
        queryKey: ['cards', deckId],
        // ★ queryFn: データ取得関数を定義 ★
        queryFn: () => {
            // deckId が null でないことを保証してから fetcher を呼ぶ
            if (!deckId) {
                // この return は TypeScript の型チェックのため。実際には enabled: false で実行されない
                return Promise.resolve([]);
            }
            return fetchCardsByDeckId(deckId);
        },
        // ★ enabled: deckId が存在する場合のみクエリを有効にする ★
        enabled: !!deckId,

        // (任意) キャッシュ設定など
        // staleTime: 1 * 60 * 1000, // 1分
    });

    // ★ mutate 関数 (手動リフレッシュ用) は useQuery には不要なので削除 ★
    // const mutate = () => {
    //   setRefreshKey(prev => prev + 1);
    // };

    // ★ useQuery の結果を返す ★
    return { cards: cards ?? null, isLoading, error }; // data が undefined の場合は null を返す
};
```

## File: hooks/useDeckMutations.ts
```typescript
// src/hooks/useDeckMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth'; // Import useAuth
import { AuthError } from '@supabase/supabase-js'; // Import AuthError directly
import { ApiErrorResponse, DeckApiResponse, DeckCreatePayload } from '../types/api.types'; // Use DeckCreatePayload

// Define and export a custom error class for API errors
export class ApiError extends Error { // Add export
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// --- Create Deck ---
const createDeckApi = async ({ deckData }: { deckData: DeckCreatePayload }): Promise<DeckApiResponse> => { // Use DeckCreatePayload
  const apiUrl = `/api/decks`;
  // ★★★ fetch 直前の URL をログ出力 ★★★
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(deckData),
  });

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
    throw new ApiError(errorData.message || `HTTP error! status: ${response.status}`, response.status, errorData.details);
  }
  return response.json();
};

export const useCreateDeck = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const mutation = useMutation<DeckApiResponse, ApiError | AuthError, DeckCreatePayload>({ // Use DeckCreatePayload
    mutationFn: (deckData: DeckCreatePayload) => createDeckApi({ deckData }), // Use DeckCreatePayload
    onSuccess: (data) => {
      // Invalidate and refetch decks query after successful creation
      queryClient.invalidateQueries({ queryKey: ['decks', userId] });
      console.log('Deck created successfully:', data);
    },
    onError: (error) => {
      console.error('Error creating deck:', error);
      // Handle specific errors (e.g., show notification)
    },
  });

  return mutation;
};


// --- Delete Deck ---
const deleteDeckApi = async ({ deckId }: { deckId: string }): Promise<void> => {
  const apiUrl = `/api/decks/${deckId}`;
  // ★★★ fetch 直前の URL をログ出力 ★★★
  const response = await fetch(apiUrl, {
    method: 'DELETE',
  });
  if (response.status !== 204) { // No Content on success
     const errorData: ApiErrorResponse = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
     throw new ApiError(errorData.message || `HTTP error! status: ${response.status}`, response.status, errorData.details);
  }
  // No return needed for 204
};


export const useDeleteDeck = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const mutation = useMutation<void, ApiError | AuthError, { deckId: string }>({
    mutationFn: ({ deckId }: { deckId: string }) => deleteDeckApi({ deckId }),
    onSuccess: (_, variables) => {
      // Invalidate and refetch decks query after successful deletion
      queryClient.invalidateQueries({ queryKey: ['decks', userId] });
      // Optionally remove the specific deck from the cache immediately
      // queryClient.setQueryData(['decks', userId, locale], (oldData: DeckApiResponse[] | undefined) =>
      //   oldData ? oldData.filter(deck => deck.id !== variables.deckId) : []
      // );
      console.log(`Deck ${variables.deckId} deleted successfully`);
    },
    onError: (error, variables) => {
      console.error(`Error deleting deck ${variables.deckId}:`, error);
      // Handle specific errors
    },
  });

  return mutation;
};

// --- Update Deck (Example - Assuming similar structure) ---
// Add useUpdateDeck hook here if needed, ensuring locale is handled similarly.
```

## File: hooks/useDecks.ts
```typescript
// src/hooks/useDecks.ts (Pagination 対応版)
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
// ★ Import new types ★
import { DeckApiResponse, ApiErrorResponse, PaginatedDecksResponse, PaginationMeta } from '../types/api.types';

// ★ Define options type ★
interface UseDecksOptions {
  offset?: number;
  limit?: number;
}

// ★ Define return type (optional but recommended) ★
interface UseDecksReturn {
  decks: DeckApiResponse[];
  pagination: PaginationMeta | null;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
}

// ★ Renamed and modified fetch function to handle pagination ★
const fetchPaginatedDecks = async (userId: string, offset: number, limit: number): Promise<PaginatedDecksResponse> => {
  // Construct URL with pagination parameters
  const params = new URLSearchParams({
    offset: offset.toString(),
    limit: limit.toString(),
  });
  const apiUrl = `/api/decks?${params.toString()}`; // No locale prefix needed
  console.log(`[useDecks fetcher] Fetching decks from: ${apiUrl}`);

  const response = await fetch(apiUrl);

  if (!response.ok) {
    let errorData: { message?: string } = { message: `Failed to fetch decks. Status: ${response.status}` };
    try {
      if (response.headers.get('content-length') !== '0' && response.body) {
        const parsedError: ApiErrorResponse | { message: string } = await response.json();
        errorData.message = parsedError.message || errorData.message;
      }
    } catch (e) {
      console.warn('Could not parse error response body for fetchPaginatedDecks:', e);
    }
    throw new Error(errorData.message);
  }

  // ★ Return the paginated response structure ★
  return response.json() as Promise<PaginatedDecksResponse>;
};

/**
 * Custom hook to fetch a paginated list of decks for the authenticated user.
 */
// ★ Update hook signature and add return type ★
export const useDecks = (options: UseDecksOptions = {}): UseDecksReturn => {
  // ★ Set default pagination values ★
  const { offset = 0, limit = 10 } = options;
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;

  // ★ Update useQuery with new types and parameters ★
  const queryResult = useQuery<PaginatedDecksResponse, Error>({ // ★ Update success type ★
    // ★ Include offset and limit in queryKey ★
    queryKey: ['decks', userId, { offset, limit }],

    // ★ Call the paginated fetch function ★
    queryFn: () => {
      if (!userId) {
        // Should be handled by 'enabled' but good practice to check
        return Promise.reject(new Error("User not authenticated"));
      }
      return fetchPaginatedDecks(userId, offset, limit); // ★ Pass offset and limit ★
    },

    // Enable query only when userId is available and auth check is done
    enabled: !!userId && !isAuthLoading,

    // Keep existing options like staleTime if needed
    // staleTime: 5 * 60 * 1000,
  });

  // ★ Update the return structure ★
  return {
    // Extract decks array from the response data
    decks: queryResult.data?.data ?? [],
    // Extract pagination metadata
    pagination: queryResult.data?.pagination ?? null,
    // Combine loading states
    isLoading: queryResult.isLoading || isAuthLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error,
  };
};
```

## File: i18n/navigation.ts
```typescript
import {createNavigation} from 'next-intl/navigation';
import {routing} from './routing';
 
// Lightweight wrappers around Next.js' navigation
// APIs that consider the routing configuration
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
```

## File: i18n/request.ts
```typescript
import {getRequestConfig} from 'next-intl/server';
import {hasLocale} from 'next-intl';
import {routing} from './routing';
 
export default getRequestConfig(async ({requestLocale}) => {
  // Typically corresponds to the `[locale]` segment
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
 
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
```

## File: i18n/routing.ts
```typescript
import {defineRouting} from 'next-intl/routing';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'ja'],
 
  // Used when no locale matches
  defaultLocale: 'en'
});
```

## File: lib/auth.ts
```typescript
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
```

## File: lib/db.ts
```typescript
import { PrismaClient } from '.prisma/client'

// Declare a global variable to hold the Prisma client instance
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Instantiate PrismaClient, reusing the instance in development
// or creating a new one in production
const prisma = global.prisma || new PrismaClient({
  // Optional: Log Prisma queries
  // log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
})

// In development, assign the instance to the global variable
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export default prisma
```

## File: lib/errors.ts
```typescript
// 標準エラーコードの例 (プロジェクトに合わせて定義)
export const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    RESOURCE_CONFLICT: 'RESOURCE_CONFLICT', // ★ 既存リソースとの衝突 (例: Unique制約)
    EXTERNAL_API_FAILURE: 'EXTERNAL_API_FAILURE',
    DATABASE_ERROR: 'DATABASE_ERROR',       // ★ データベース関連エラー
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  } as const; // Readonlyにする
  
  type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
  
  // アプリケーション共通のベースエラークラス
  export class AppError extends Error {
    public readonly statusCode: number;
    public readonly errorCode: ErrorCode;
    public readonly details?: unknown;

    constructor(message: string, statusCode: number, errorCode: ErrorCode, details?: unknown) {
      super(message);
      this.statusCode = statusCode;
      this.errorCode = errorCode;
      this.details = details;
      this.name = this.constructor.name; // エラークラス名を設定
      Object.setPrototypeOf(this, new.target.prototype);
      // Error.captureStackTrace(this, this.constructor); // Node.js 環境なら有効
    }
  }
  
  // --- 具体的なエラークラス ---
  
  export class ValidationError extends AppError {
    constructor(message: string = 'Invalid input data.', details?: unknown) {
      super(message, 400, ERROR_CODES.VALIDATION_ERROR, details);
    }
  }
  
  export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication failed.') {
      super(message, 401, ERROR_CODES.AUTHENTICATION_FAILED);
    }
  }
  
  export class PermissionError extends AppError {
    constructor(message: string = 'Permission denied.') {
      super(message, 403, ERROR_CODES.PERMISSION_DENIED);
    }
  }
  
  export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found.') {
      super(message, 404, ERROR_CODES.RESOURCE_NOT_FOUND);
    }
  }
  
  // ★ デッキ作成時のユニーク制約違反などに使用 ★
  export class ConflictError extends AppError {
    constructor(message: string = 'Resource conflict.') {
      super(message, 409, ERROR_CODES.RESOURCE_CONFLICT);
    }
  }
  
  export class ExternalApiError extends AppError {
      constructor(message: string = 'External API request failed.') {
          super(message, 503, ERROR_CODES.EXTERNAL_API_FAILURE); // 503 Service Unavailable
      }
  }
  
  // ★ 予期せぬデータベースエラーなどに使用 ★
  export class DatabaseError extends AppError {
      constructor(message: string = 'Database operation failed.', originalError?: Error) {
          // DBエラーの詳細はログには出すが、クライアントには返さない想定
          super(message, 500, ERROR_CODES.DATABASE_ERROR, originalError);
      }
  }
  
  // 予期せぬサーバー内部エラー
  export class InternalServerError extends AppError {
      constructor(message: string = 'An unexpected internal server error occurred.', originalError?: Error) {
          super(message, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, originalError);
      }
  }
  
  // Type guard to check if an error is an AppError
  export const isAppError = (error: unknown): error is AppError => {
      return error instanceof AppError;
  }
import { NextResponse } from 'next/server';
// Note: Assuming AppError, ERROR_CODES, InternalServerError, isAppError are defined above in the same file.
// If Prisma errors need specific handling, import Prisma from '@prisma/client'

/**
 * Centralized API error handler for Next.js API routes.
 * Logs the error and returns a standardized JSON response.
 * @param error - The error caught in the try-catch block.
 * @returns A NextResponse object with the appropriate status code and error details.
 */
export const handleApiError = (error: unknown): NextResponse => {
  console.error('API Error:', error); // Log the error for server-side debugging

  if (isAppError(error)) {
    // Handle known application errors
    return NextResponse.json(
      {
        message: error.message,
        errorCode: error.errorCode,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // Example: Handle Prisma specific errors (Uncomment and adjust if needed)
  // import { Prisma } from '@prisma/client';
  // import { ConflictError, DatabaseError } from './errors'; // Assuming these are defined
  // if (error instanceof Prisma.PrismaClientKnownRequestError) {
  //   if (error.code === 'P2002') { // Unique constraint violation
  //     const conflictError = new ConflictError('Resource already exists.');
  //     return NextResponse.json(
  //       { message: conflictError.message, errorCode: conflictError.errorCode },
  //       { status: conflictError.statusCode }
  //     );
  //   }
  //   // Handle other known Prisma errors
  //   const dbError = new DatabaseError('Database request failed.', error);
  //   return NextResponse.json(
  //     { message: dbError.message, errorCode: dbError.errorCode },
  //     { status: dbError.statusCode }
  //   );
  // }

  // Handle unexpected errors
  // Ensure InternalServerError is defined above or imported
  const internalError = new InternalServerError('An unexpected error occurred.', error instanceof Error ? error : undefined);
  return NextResponse.json(
    {
      message: internalError.message,
      errorCode: internalError.errorCode,
    },
    { status: internalError.statusCode }
  );
};
```

## File: lib/supabase.ts
```typescript
import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr'
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import { type NextRequest, type NextResponse } from 'next/server'
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
                get(_name: string) { return undefined; },
                set(_name: string, _value: string, _options: CookieOptions) {},
                remove(_name: string, _options: CookieOptions) {},
            }
        }
    )
}
```

## File: lib/zod.ts
```typescript
import { z } from 'zod';

// --- デッキ作成用スキーマと型 ---
export const deckCreateSchema = z.object({
  name: z.string()
    .min(1, { message: 'Deck name is required.' }) // 日本語メッセージはi18n対応を後で検討
    .max(100, { message: 'Deck name must be 100 characters or less.' }),
  description: z.string()
    .max(500, { message: 'Description must be 500 characters or less.' })
    .optional() // 任意入力
    .nullable(), // null も許容 (フォーム未入力時に null になる場合を考慮)
});

// スキーマから TypeScript 型を生成してエクスポート
export type DeckCreatePayload = z.infer<typeof deckCreateSchema>;

// --- 他のスキーマ (例: 学習結果更新用) ---
export const reviewResultSchema = z.object({
  cardId: z.string().cuid(), // cuid形式を期待する場合
  rating: z.enum(['AGAIN', 'HARD', 'GOOD', 'EASY']), // Enumの値と一致
});

export type ReviewResultPayload = z.infer<typeof reviewResultSchema>;

// --- パスワード変更用スキーマ (例) ---
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6), // 必要ならより複雑なルールを追加
});
export type ChangePasswordPayload = z.infer<typeof changePasswordSchema>;

// --- 他に必要な Zod スキーマをここに追加 ---
// --- カード作成用スキーマ ---
export const cardCreateSchema = z.object({
  front: z.string().min(1, { message: 'Front content is required.' }).max(1000, { message: 'Front content must be 1000 characters or less.' }),
  back: z.string().min(1, { message: 'Back content is required.' }).max(1000, { message: 'Back content must be 1000 characters or less.' }),
  // deckId は API ルートハンドラでパスパラメータから取得するため、ここには含めない
});
export type CardCreatePayload = z.infer<typeof cardCreateSchema>;


// --- カード更新用スキーマ ---
export const cardUpdateSchema = z.object({
  front: z.string()
    .min(1, { message: 'Front content cannot be empty if provided.' }) // 空文字での更新を防ぐ場合
    .max(1000, { message: 'Front content must be 1000 characters or less.' })
    .optional(), // 任意入力
  back: z.string()
    .min(1, { message: 'Back content cannot be empty if provided.' }) // 空文字での更新を防ぐ場合
    .max(1000, { message: 'Back content must be 1000 characters or less.' })
    .optional(), // 任意入力
}).refine(data => data.front !== undefined || data.back !== undefined, {
  message: "At least one field (front or back) must be provided for update.",
  path: ["front", "back"], // エラーメッセージを関連付けるフィールド
}); // front か back のどちらかは必須とする

// スキーマから TypeScript 型を生成してエクスポート
export type CardUpdatePayload = z.infer<typeof cardUpdateSchema>;
```

## File: services/card.service.ts
```typescript
import prisma from '@/lib/db'; // Use the same prisma instance as other services
import { Card } from '@prisma/client'; // Import Card type
import { AppError, NotFoundError, PermissionError, DatabaseError } from '@/lib/errors'; // Import custom errors
import type { Result } from '@/types'; // Import Result type
import type { CardUpdatePayload } from '@/lib/zod'; // Import Zod payload type

/**
 * Fetches cards belonging to a specific deck, ensuring user ownership.
 * @param userId - The ID of the user requesting the cards.
 * @param deckId - The ID of the deck.
 * @returns A promise that resolves to an array of cards.
 * @throws {NotFoundError} If the deck is not found.
 * @throws {PermissionError} If the user does not own the deck.
 * @throws {DatabaseError} If any other database error occurs.
 */
export const getCardsByDeckId = async (userId: string, deckId: string): Promise<Card[]> => {
  try {
    // 1. Verify deck existence and ownership
    const deck = await prisma.deck.findUnique({
      where: {
        id: deckId,
      },
      select: { // Only select userId to check ownership, avoid fetching full deck
        userId: true,
      }
    });

    if (!deck) {
      throw new NotFoundError(`Deck with ID ${deckId} not found.`);
    }
    if (deck.userId !== userId) {
        throw new PermissionError(`User does not have permission to access deck with ID ${deckId}.`);
    }

    // 2. Fetch cards if ownership is confirmed
    const cards = await prisma.card.findMany({
      where: {
        deckId: deckId, // Fetch cards for the confirmed deck
      },
      orderBy: {
        createdAt: 'asc', // Or any other desired order
      },
    });
    return cards;
  } catch (error) {
    // Re-throw known application errors
    if (error instanceof NotFoundError || error instanceof PermissionError) {
      throw error;
    }
    // Handle other potential errors
    console.error(`Database error fetching cards for deck ${deckId} by user ${userId}:`, error);
    throw new DatabaseError('Failed to fetch cards due to a database error.', error instanceof Error ? error : undefined);
  }
};

/**
 * Creates a new card for a specific deck, ensuring user ownership.
 * @param userId - The ID of the user creating the card.
 * @param data - Object containing deckId, front text, and back text.
 * @returns A promise that resolves to the newly created card.
 * @throws {NotFoundError} If the deck is not found.
 * @throws {PermissionError} If the user does not own the deck.
 * @throws {DatabaseError} If any other database error occurs.
 */
export const createCard = async (userId: string, data: { deckId: string; front: string; back: string }): Promise<Card> => {
  const { deckId, front, back } = data;
  try {
    // 1. Verify deck existence and ownership
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
      select: { userId: true },
    });

    if (!deck) {
      throw new NotFoundError(`Deck with ID ${deckId} not found.`);
    }
    if (deck.userId !== userId) {
      throw new PermissionError(`User does not have permission to add cards to deck with ID ${deckId}.`);
    }

    // 2. Create the card if ownership is confirmed
    const newCard = await prisma.card.create({
      data: {
        front,
        back,
        deckId,
        // Add other default fields if necessary, e.g., initial ease factor, interval
      },
    });
    return newCard;
  } catch (error) {
    // Re-throw known application errors
    if (error instanceof NotFoundError || error instanceof PermissionError) {
      throw error;
    }
    // Handle other potential errors
    console.error(`Database error creating card in deck ${deckId} by user ${userId}:`, error);
    throw new DatabaseError('Failed to create card due to a database error.', error instanceof Error ? error : undefined);
  }
};
/**
 * Deletes a specific card, ensuring user ownership.
 * @param userId - The ID of the user performing the deletion.
 * @param deckId - The ID of the deck the card belongs to (for permission check).
 * @param cardId - The ID of the card to delete.
 * @returns A promise that resolves when the card is deleted.
 * @throws {NotFoundError} If the card is not found or doesn't belong to the specified deck.
 * @throws {PermissionError} If the user does not own the deck the card belongs to.
 * @throws {DatabaseError} If any other database error occurs.
 */
export const deleteCard = async (userId: string, deckId: string, cardId: string): Promise<void> => {
  try {
    // 1. Verify card existence and ownership via the deck
    // Use findFirstOrThrow to ensure the card exists and belongs to the user's deck.
    // This implicitly checks deckId match as well.
    await prisma.card.findFirstOrThrow({
      where: {
        id: cardId,
        deck: {
          id: deckId, // Ensure it's in the correct deck
          userId: userId, // Ensure the deck belongs to the user
        },
      },
    });

    // 2. Delete the card if ownership is confirmed
    await prisma.card.delete({
      where: {
        id: cardId,
      },
    });

  } catch (error: unknown) {
    // Handle Prisma's specific 'RecordNotFound' error (P2025) and our NotFoundError
    let isPrismaNotFoundError = false;
    if (typeof error === 'object' && error !== null && 'code' in error) {
        isPrismaNotFoundError = (error as { code?: unknown }).code === 'P2025';
    }

    if (isPrismaNotFoundError || error instanceof NotFoundError) {
        // P2025 can mean either the card doesn't exist OR the deck/user condition failed.
        // We treat both as a NotFound or Permission issue from the client's perspective.
        // A more specific check could be done by querying the card first, then the deck,
        // but findFirstOrThrow is more concise for this combined check.
      throw new NotFoundError(`Card with ID ${cardId} not found or user does not have permission.`);
    }
    // Re-throw known application errors (though findFirstOrThrow handles NotFound implicitly)
    if (error instanceof PermissionError) { // Keep this in case other permission logic is added
      throw error;
    }
    // Handle other potential database errors
    console.error(`Database error deleting card ${cardId} from deck ${deckId} by user ${userId}:`, error);
    throw new DatabaseError('Failed to delete card due to a database error.', error instanceof Error ? error : undefined);
  }
};
/**
 * Updates a specific card's front and/or back text, ensuring user ownership.
 * @param userId - The ID of the user performing the update.
 * @param deckId - The ID of the deck the card belongs to (for permission check).
 * @param cardId - The ID of the card to update.
 * @param data - An object containing optional 'front' and 'back' text to update.
 * @returns A promise that resolves to the updated card object.
 * @throws {NotFoundError} If the card is not found or doesn't belong to the specified deck owned by the user.
 * @throws {PermissionError} If the user does not own the deck (implicitly checked).
 * @throws {DatabaseError} If any other database error occurs.
 */
export const updateCard = async (
  userId: string,
  deckId: string,
  cardId: string,
  data: CardUpdatePayload // Use Zod payload type
): Promise<Result<Card, AppError>> => { // Return Result type

  // 1. Verify card existence and ownership via the deck using findFirst
  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
      deck: {
        id: deckId,
        userId: userId,
      },
    },
    select: { id: true } // Only need to confirm existence and ownership
  });

  if (!card) {
    // Card not found or user doesn't have permission for this deck/card
    return {
      ok: false,
      error: new NotFoundError(`Card with ID ${cardId} not found or user does not have permission for deck ${deckId}.`)
    };
  }

  // 2. Prepare update data (already validated by Zod schema in API layer)
  // Zod refine ensures at least one field is present
  const updateData: CardUpdatePayload = {};
  if (data.front !== undefined) {
    updateData.front = data.front;
  }
  if (data.back !== undefined) {
    updateData.back = data.back;
  }

  // Note: The check for empty updateData is less critical now
  // because the Zod schema's .refine() ensures at least one field is provided.
  // if (Object.keys(updateData).length === 0) {
  //   // This case should ideally not happen if Zod validation is correct
  //   // If it does, returning the existing card might be an option, but requires fetching it again.
  //   // For simplicity, we rely on the validation layer.
  // }

  // 3. Execute the update within a try...catch for database errors
  try {
    const updatedCard = await prisma.card.update({
      where: {
        id: cardId,
        // No need for deck/userId check here again as findFirst confirmed it
      },
      data: updateData,
    });

    // 4. Return success result
    return { ok: true, value: updatedCard };

  } catch (error: unknown) {
    // Handle potential database errors during the update operation
    console.error(`Database error updating card ${cardId} in deck ${deckId} by user ${userId}:`, error);
    // Return a DatabaseError Result
    return {
      ok: false,
      error: new DatabaseError('Failed to update card due to a database error.', error instanceof Error ? error : undefined)
    };
  }
};
```

## File: services/deck.service.ts
```typescript
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { Deck } from '@prisma/client'; // Import Deck type
import prisma from '@/lib/db'; // Use default export
import { ConflictError, DatabaseError, NotFoundError, PermissionError } from '@/lib/errors'; // Added NotFoundError and PermissionError
import type { DeckCreatePayload } from '@/lib/zod'; // Import type from zod schema definition

// Type definitions for pagination
interface GetAllDecksOptions {
  limit?: number;
  offset?: number;
}

type GetAllDecksResult = {
  data: Deck[];
  totalItems: number;
};

/**
 * Creates a new deck for a given user.
 * @param userId - The ID of the user creating the deck.
 * @param data - The data for the new deck (name, description).
 * @returns The created deck object.
 * @throws {ConflictError} If a deck with the same name already exists for the user.
 * @throws {DatabaseError} If any other database error occurs.
 */
export const createDeck = async (userId: string, data: DeckCreatePayload) => {
  try {
    const newDeck = await prisma.deck.create({ // Use prisma instead of db
      data: {
        userId,
        name: data.name,
        description: data.description,
      },
    });
    return newDeck;
  } catch (error) {
    // デバッグログは（問題解決が確認できるまで）残しておいても良いでしょう
    // const isKnownRequestError = error instanceof PrismaClientKnownRequestError; // 参考用ログは残す (Removed as unused)

    // ★★★ 修正: instanceof に頼らず error.code で直接 P2002 を判定 ★★★
    // エラーがオブジェクトであり、かつ code プロパティが 'P2002' かどうかを確認
    // @ts-expect-error
    if (error && typeof error === 'object' && error.code === 'P2002') {
       console.log('[SERVICE CATCH BLOCK] P2002 code detected. Throwing ConflictError.');
       // No error expected on the next line
       throw new ConflictError(`A deck with the name "${data.name}" already exists.`);
    }

    // ★★★ P2002 でなかった場合、または上記条件を満たさないエラーの場合 ★★★
    console.error('[SERVICE CATCH BLOCK] Not P2002 or check failed. Throwing DatabaseError.');
    // console.error('Database error creating deck:', error); // より詳細なログに置き換え
    throw new DatabaseError('Failed to create the deck due to a database error.', error instanceof Error ? error : undefined);
  }
};

/**
 * Retrieves decks for a given user with pagination, ordered by creation date descending.
 * @param userId - The ID of the user whose decks to retrieve.
 * @param options - Options for pagination (limit, offset).
 * @returns A promise that resolves to an object containing the decks array and total item count.
 * @throws {DatabaseError} If a database error occurs during retrieval.
 */
export const getAllDecks = async (
  userId: string,
  options: GetAllDecksOptions = {}
): Promise<GetAllDecksResult> => {
  // Default values for pagination
  const limit = options.limit ?? 10; // Default to 10 items per page
  const offset = options.offset ?? 0; // Default to starting from the beginning

  // Basic validation for limit and offset
  const validatedLimit = Math.max(1, limit); // Ensure at least 1 item is requested
  const validatedOffset = Math.max(0, offset); // Ensure offset is not negative

  try {
    // Use $transaction to fetch data and count in parallel
    const [decks, totalItems] = await prisma.$transaction([
      prisma.deck.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' }, // Maintain existing sort order
        skip: validatedOffset,
        take: validatedLimit,
      }),
      prisma.deck.count({
        where: { userId: userId },
      }),
    ]);

    return {
      data: decks,
      totalItems: totalItems,
    };
  } catch (error) {
    console.error(`Database error retrieving decks for user ${userId} with pagination:`, error); // Updated log message
    // Throw a generic DatabaseError for any issues during retrieval
    throw new DatabaseError('Failed to retrieve decks due to a database error.', error instanceof Error ? error : undefined);
  }
};

/**
 * Deletes a deck based on the provided deck ID and user ID.
 * Ensures the user owns the deck before deletion.
 * @param userId The ID of the user attempting to delete the deck.
 * @param deckId The ID of the deck to delete.
 * @throws {NotFoundError} If the deck is not found or the user does not have permission.
 * @throws {DatabaseError} If any other database error occurs.
 */
export const deleteDeck = async (userId: string, deckId: string): Promise<void> => {
  try {
    const deleteResult = await prisma.deck.deleteMany({
      where: {
        id: deckId,
        userId: userId, // Verify ownership
      },
    });

    // If no records were deleted, the deck doesn't exist or the user doesn't own it.
    if (deleteResult.count === 0) {
      throw new NotFoundError(`Deck with ID ${deckId} not found or user does not have permission.`);
    }

    // Deletion successful, return void

  } catch (error) {
    // Re-throw NotFoundError if it was thrown intentionally above
    if (error instanceof NotFoundError) {
      throw error;
    }

    // Handle other potential errors (like Prisma errors or connection issues)
    console.error(`Database error deleting deck ${deckId} for user ${userId}:`, error);
    throw new DatabaseError('Failed to delete deck due to a database error.', error instanceof Error ? error : undefined);
  }
};

/**
 * Retrieves a specific deck by its ID for a given user.
 * Ensures the user owns the deck before returning it.
 * @param userId The ID of the user attempting to retrieve the deck.
 * @param deckId The ID of the deck to retrieve.
 * @returns A promise that resolves to the deck object.
 * @throws {NotFoundError} If the deck with the specified ID is not found.
 * @throws {PermissionError} If the user does not own the deck.
 * @throws {DatabaseError} If any other database error occurs.
 */
export const getDeckById = async (userId: string, deckId: string) => {
  try {
    const deck = await prisma.deck.findUnique({
      where: {
        id: deckId,
      },
      // REMOVED: include: { cards: true }
    });

    if (!deck) {
      throw new NotFoundError(`Deck with ID ${deckId} not found.`);
    }

    // Verify ownership
    if (deck.userId !== userId) {
      throw new PermissionError(`User does not have permission to access deck with ID ${deckId}.`);
    }

    return deck;

  } catch (error) {
    // Re-throw known application errors
    if (error instanceof NotFoundError || error instanceof PermissionError) {
      throw error;
    }

    // Handle other potential errors (like Prisma errors or connection issues)
    console.error(`Database error retrieving deck ${deckId} for user ${userId}:`, error);
    throw new DatabaseError('Failed to retrieve deck due to a database error.', error instanceof Error ? error : undefined);
  }
};
```

## File: types/api.types.ts
```typescript
import { type Deck as PrismaDeck, type Card as PrismaCard } from '@prisma/client'; // Corrected import path
import { type DeckCreatePayload as DeckCreatePayloadFromZod } from '@/lib/zod'; // Assuming '@/lib/zod' is the correct alias or relative path

/**
 * Payload for creating a new deck (POST /api/decks).
 * Re-exported from the Zod schema definition.
 */
export type DeckCreatePayload = DeckCreatePayloadFromZod;

/**
 * Structure of a deck object returned by the API (GET /api/decks, POST /api/decks success).
 * Based on Prisma's Deck model, but only includes fields exposed via the API.
 */
/**
 * Structure of a card object returned within the Deck detail API response.
 */
export type CardApiResponse = Pick<
  PrismaCard,
  'id' | 'front' | 'back' | 'createdAt' | 'updatedAt'
  // Exclude 'deckId' or other internal fields if necessary
>;


export type DeckApiResponse = Pick<
  PrismaDeck,
  'id' | 'name' | 'description' | 'createdAt' | 'updatedAt'
  // Exclude 'userId' or other internal fields
> & {
  cards: CardApiResponse[]; // Include the array of cards
};

/**
 * Standard error response structure for API errors.
 */
export type ApiErrorResponse = {
  /** A machine-readable error code (e.g., 'VALIDATION_ERROR', 'RESOURCE_NOT_FOUND'). */
  error: string;
  /** A user-friendly message describing the error. */
  message: string;
  /** Optional additional details about the error (e.g., validation failures). */
  details?: unknown;
};
/**
 * Structure for pagination metadata returned by the API.
 */
export interface PaginationMeta {
  offset: number;
  limit: number;
  totalItems: number;
  _links: {
    self: string;
    next: string | null;
    previous: string | null;
  };
}

/**
 * Structure for the paginated response for decks.
 */
export interface PaginatedDecksResponse {
  data: DeckApiResponse[];
  pagination: PaginationMeta;
}
```

## File: types/index.ts
```typescript
/**
 * Barrel file for exporting types from the types directory.
 */
import type { AppError } from '../lib/errors'; // AppError をインポート

export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

export * from './api.types';

// Add exports from other type files here as needed
// export * from './another.types';
```

## File: middleware.ts
```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createMiddlewareClient } from '@/lib/supabase';

const locales = ['en', 'ja'];
const defaultLocale = 'en'; // Needs to be uncommented

const intlMiddleware = createIntlMiddleware({
  locales: locales,
  defaultLocale: defaultLocale,
  localePrefix: 'as-needed'
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
  if (intlResponse.headers.get('location') || intlResponse.headers.get('x-middleware-rewrite')) {
    return intlResponse;
  }

  // 4. If intl didn't redirect/rewrite, proceed with Supabase auth.
  try {
    // Pass both req and the *original* res object to Supabase
    const supabase = createMiddlewareClient(req, res);
    await supabase.auth.getSession(); // Refreshes session cookie if needed
  } catch (e) {
    console.error("Supabase middleware error:", e);
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
  ]
};
```

## File: app/globals.css
```css
/* src/app/globals.css (テスト用 - @tailwind 以外をコメントアウト) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* --- 以下を一時的にコメントアウト --- */
/*
:root {
  --background: #ffffff; /* Consider removing if using Tailwind colors * /
  --foreground: #171717; /* Consider removing if using Tailwind colors * /
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
*/
```

## File: app/layout.tsx
```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers"; // Assuming '@/' alias is configured or use relative path

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## File: app/page.tsx
```typescript
import Image from "next/image";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <ol className="list-inside list-decimal text-sm/6 text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="mb-2 tracking-[-.01em]">
            Get started by editing{" "}
            <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-[family-name:var(--font-geist-mono)] font-semibold">
              app/page.tsx
            </code>
            .
          </li>
          <li className="tracking-[-.01em]">
            Save and see your changes instantly.
          </li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our docs
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
```
