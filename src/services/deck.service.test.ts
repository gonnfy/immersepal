import { describe, it, expect, vi } from "vitest";
import prisma from "@/lib/db";
import { deleteDeck } from "./deck.service";
import { NotFoundError } from "@/lib/errors";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/db", () => ({
  default: {
    deck: {
      delete: vi.fn(),
    },
  },
}));

describe("deleteDeck Service", () => {
  it("should throw NotFoundError if deck to delete is not found", async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      "An operation failed because it depends on one or more records that were required but not found.",
      { code: "P2025", clientVersion: "5.x.x" },
    );
    vi.mocked(prisma.deck.delete).mockRejectedValue(prismaError);

    const userId = "user-123";
    const deckId = "non-existent-deck-id";

    await expect(deleteDeck(userId, deckId)).rejects.toThrow(NotFoundError);
  });
});
