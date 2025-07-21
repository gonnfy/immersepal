export interface CardSrsData {
  interval: number;
  easeFactor: number;
}

export type AcquisitionRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

const RATING_MAP: Record<AcquisitionRating, number> = {
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4,
};

export function calculateSrsData(
  srsData: CardSrsData,
  rating: AcquisitionRating,
): CardSrsData {
  const q = RATING_MAP[rating];
  let { interval, easeFactor } = srsData;

  if (rating === "AGAIN") {
    interval = 0;
  } else if (rating === "HARD") {
    interval = 1;
  } else {
    if (interval === 0) {
      interval = 1;
    } else if (interval === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  return { interval, easeFactor };
}

export function getNextReviewDate(interval: number): Date {
  const now = new Date();
  if (interval === 0) {
    return now;
  }
  now.setDate(now.getDate() + interval);
  return now;
}
