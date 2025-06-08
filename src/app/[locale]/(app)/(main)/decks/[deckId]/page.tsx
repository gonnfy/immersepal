import { notFound } from 'next/navigation'; // Import notFound for 404 handling
import { getServerUserId } from '@/lib/auth'; // Import function to get user ID
import { getDeckById } from '@/services/deck.service'; // Import the service function
import {
  NotFoundError,
  PermissionError,
  DatabaseError,
  isAppError,
} from '@/lib/errors';
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
  params:
    | Promise<{
        deckId: string;
        locale: string; // Locale might be needed for translations later
      }>
    | {
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
      errorInfo = {
        message: 'A database error occurred while loading the deck.',
        code: 'DATABASE_ERROR',
      };
    } else if (isAppError(error)) {
      // Catch other AppErrors
      errorInfo = { message: error.message, code: error.name };
    } else {
      // Handle unexpected errors
      errorInfo = {
        message: 'An unexpected error occurred.',
        code: 'INTERNAL_SERVER_ERROR',
      };
    }
  }

  // --- Render Error State ---
  if (errorInfo) {
    return (
      <div className="p-4 text-red-600">
        Error loading deck: {errorInfo.message}{' '}
        {errorInfo.code ? `(Code: ${errorInfo.code})` : ''}
      </div>
    );
  }

  // --- Render Success State ---
  // If we reach here and deck is still null, something went wrong (should be caught above)
  if (!deck) {
    return (
      <div className="p-4 text-red-600">
        Error loading deck: Deck data is unavailable.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Deck Details */}
      <h1 className="text-3xl font-bold mb-2">{deck.name}</h1>
      <p className="text-gray-600 mb-6">
        {deck.description || 'No description provided.'}
      </p>

      {/* Separator or spacing */}
      <hr className="my-6" />

      {/* Add New Card Form (Client Component) */}
      <div className="mb-8">
        {' '}
        {/* Add some margin below the form */}
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
