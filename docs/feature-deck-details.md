# Plan: Deck Detail Page Feature

This document outlines the plan for implementing the Deck Detail Page feature.

## Phase 1: Backend Data Fetching Logic

1.  **Enhance `deck.service.ts`:**
    *   Define a new asynchronous function `getDeckById(userId: string, deckId: string)`.
    *   Use `prisma.deck.findUniqueOrThrow` (or `findUnique` with manual error handling) to retrieve a specific deck by its `id`.
    *   Use Prisma's `include` option to fetch associated `cards` along with the deck data.
    *   Verify `userId` matches the deck's `userId` for authorization. Throw `PermissionError` if mismatched.
    *   Handle potential `NotFoundError` if the deck doesn't exist.
    *   Handle other potential `DatabaseError` instances.

2.  **Implement API Endpoint (`GET /api/decks/[deckId]`)**:
    *   In `src/app/[locale]/(api)/api/decks/[deckId]/route.ts`, add a new `async function GET(request: Request, { params }: { params: { deckId: string; locale: string } })`.
    *   **Refined Error Handling:**
        *   Check authentication using `getServerUserId()`. Return 401 (`UNAUTHORIZED`) if no user ID.
        *   Use a `try...catch` block for the main logic.
        *   Inside `try`: Call `getDeckById(userId, deckId)`. Return deck data with 200 status on success.
        *   Inside `catch`:
            *   Log the error server-side.
            *   Check `isAppError(error)`:
                *   `NotFoundError`: Return 404 (`NOT_FOUND`).
                *   `PermissionError`: Return 403 (`FORBIDDEN`).
                *   `DatabaseError`: Return 500 (`DATABASE_ERROR`).
                *   Other `AppError`: Return 500 (using `error.name`).
            *   Unexpected errors: Return 500 (`INTERNAL_SERVER_ERROR`).
        *   Return errors as structured JSON: `{ error: 'CODE', message: 'Description' }`.

## Phase 2: Frontend Page Implementation

1.  **Create Page Component (`src/app/[locale]/(app)/(main)/decks/[deckId]/page.tsx`)**:
    *   Create the new file.
    *   Define a React Server Component (RSC) receiving `params` (`deckId`, `locale`).
    *   Fetch data from `GET /api/decks/[deckId]` using `fetch`.
    *   Handle loading and error states based on the API response.
    *   On success:
        *   Display deck `name` and `description`.
        *   Map over the `cards` array and display `front`/`back` for each.
        *   Utilize UI components for styling.

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant Page as DeckDetailPage <br> (page.tsx)
    participant API as GET /api/decks/[deckId] <br> (route.ts)
    participant Service as deck.service.ts
    participant DB as Prisma/Database

    User->>Page: Navigates to /decks/[deckId]
    Page->>API: Fetch deck data (using fetch API)
    API->>Service: Calls getDeckById(userId, deckId)
    Service->>DB: prisma.deck.findUnique({ where: { id, userId }, include: { cards: true } })
    DB-->>Service: Returns deck data with cards (or throws error)
    alt Deck Found & Authorized
        Service-->>API: Returns deck data
        API-->>Page: Returns JSON response (200 OK)
        Page->>User: Renders deck name, description, and card list
    else Not Found / Unauthorized / DB Error
        Service-->>API: Throws specific error (NotFoundError, PermissionError, DatabaseError)
        API-->>Page: Returns JSON error response (404, 403, 500)
        Page->>User: Renders appropriate error message
    end