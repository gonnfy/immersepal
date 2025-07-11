import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, ValidationError } from "@/lib/errors";
import { generateExplanation } from "@/services/ai.service"; // サービス関数 (Result を返す版)
import { type Result } from "@/types";
import { type AppError } from "@/lib/errors";

const testExplanationSchema = z.object({
  text: z.string().min(1, "Text to explain cannot be empty."),
  language: z
    .string()
    .min(2, "Language code must be at least 2 characters.")
    .max(10),
});

type TestExplanationPayload = z.infer<typeof testExplanationSchema>;

export async function POST(request: Request) {
  try {
    let body: TestExplanationPayload;
    try {
      const rawBody: unknown = await request.json();
      const validation = testExplanationSchema.safeParse(rawBody);
      if (!validation.success) {
        throw new ValidationError(
          "Invalid request body.",
          validation.error.flatten(),
        );
      }
      body = validation.data;
    } catch (e) {
      if (e instanceof ValidationError) {
        throw e;
      }
      console.error("Error parsing or validating request body:", e);
      throw new ValidationError("Invalid JSON body or structure.");
    }

    const { text, language } = body;

    // 2. Call Service Function (returns Result)
    const explanationResult: Result<string, AppError> =
      await generateExplanation(text, language);

    // 3. Check Result
    if (!explanationResult.ok) {
      return handleApiError(explanationResult.error);
    }

    // 4. Success Response
    return NextResponse.json({
      success: true,
      explanation: explanationResult.value, // Use result.value
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
