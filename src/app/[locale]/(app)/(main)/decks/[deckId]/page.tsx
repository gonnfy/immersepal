import { notFound } from "next/navigation";
import { getServerUserId } from "@/lib/auth";
import { getDeckById } from "@/services/deck.service";
import {
  NotFoundError,
  PermissionError,
  DatabaseError,
  isAppError,
} from "@/lib/errors";
import { CardList } from "@/components/features/CardList";
import { CardCreateForm } from "@/components/features/CardCreateForm";
import Link from "next/link";

type DeckData = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

interface DeckDetailPageProps {
  params:
    | Promise<{
        deckId: string;
        locale: string;
      }>
    | {
        deckId: string;
        locale: string;
      };
}

export default async function DeckDetailPage({ params }: DeckDetailPageProps) {
  const resolvedParams = await params;
  const { deckId } = resolvedParams;

  let deck: DeckData | null = null; // Use DeckData type (without cards)
  let errorInfo: { message: string; code?: string } | null = null;

  try {
    const userId = await getServerUserId();
    if (!userId) {
      throw new PermissionError("Authentication required to view this deck.");
    }

    deck = await getDeckById(userId, deckId);
  } catch (error) {
    console.error("Error in DeckDetailPage:", error); // Log the error

    if (error instanceof NotFoundError) {
      notFound(); // Trigger Next.js 404 page
    } else if (error instanceof PermissionError) {
      errorInfo = { message: error.message, code: "FORBIDDEN" };
    } else if (error instanceof DatabaseError) {
      errorInfo = {
        message: "A database error occurred while loading the deck.",
        code: "DATABASE_ERROR",
      };
    } else if (isAppError(error)) {
      // Catch other AppErrors
      errorInfo = { message: error.message, code: error.name };
    } else {
      // Handle unexpected errors
      errorInfo = {
        message: "An unexpected error occurred.",
        code: "INTERNAL_SERVER_ERROR",
      };
    }
  }

  // --- Render Error State ---
  if (errorInfo) {
    return (
      <div className="p-4 text-red-600">
        Error loading deck: {errorInfo.message}{" "}
        {errorInfo.code ? `(Code: ${errorInfo.code})` : ""}
      </div>
    );
  }

  // --- Render Success State ---
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
        {deck.description || "No description provided."}
      </p>
      <Link href={`/decks/${deck.id}/acquisition`}>
        <button className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
          Start Acquisition Session
        </button>
      </Link>

      {/* Separator or spacing */}
      <hr className="my-6" />

      {/* Add New Card Form (Client Component) */}
      <div className="mb-8">
        {" "}
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
