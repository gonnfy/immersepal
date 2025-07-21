"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useCards, Card } from "@/hooks/useCards";
import { useRateCard } from "@/hooks/useCardMutations";
import { type CardRatingPayload } from "@/lib/zod";
import { useParams } from "next/navigation";
import Link from "next/link";
import Confetti from "react-confetti";
import { AiContentType } from "@prisma/client";
import { useGenerateTts } from "@/hooks/useGenerateTts";
import { useGetTtsUrl } from "@/hooks/useGetTtsUrl";
import { useSaveAiContent } from "@/hooks/useSaveAiContent";
import {
  SpeakerWaveIcon,
  ArrowPathIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/24/solid";

type AcquisitionRating = CardRatingPayload["rating"];

const FullPageSpinner = () => (
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
);

// --- AcquisitionCard Component (UI) ---
interface AcquisitionCardProps {
  card: Card;
  onRate: (rating: AcquisitionRating) => void;
  onPlayAudio: (side: "front" | "back") => void;
  isSubmitting: boolean;
  loadingAudioSide: "front" | "back" | null;
  playingAudioSide: "front" | "back" | null;
}

const AcquisitionCard: React.FC<AcquisitionCardProps> = ({
  card,
  onRate,
  onPlayAudio,
  isSubmitting,
  loadingAudioSide,
  playingAudioSide,
}) => {
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    setShowAnswer(false);
  }, [card]);

  const ratingButtons: {
    rating: AcquisitionRating;
    label: string;
    color: string;
  }[] = [
    { rating: "AGAIN", label: "Again", color: "bg-red-500 hover:bg-red-600" },
    {
      rating: "HARD",
      label: "Hard",
      color: "bg-orange-500 hover:bg-orange-600",
    },
    { rating: "GOOD", label: "Good", color: "bg-green-500 hover:bg-green-600" },
    { rating: "EASY", label: "Easy", color: "bg-blue-500 hover:bg-blue-600" },
  ];

  const PlayButton = ({ side }: { side: "front" | "back" }) => (
    <button
      type="button" // ページジャンプを防ぐためにtypeを指定
      onClick={() => onPlayAudio(side)}
      disabled={loadingAudioSide !== null && loadingAudioSide !== side}
      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
      aria-label={`Play ${side} audio`}
    >
      {loadingAudioSide === side ? (
        <ArrowPathIcon className="h-5 w-5 animate-spin" />
      ) : playingAudioSide === side ? (
        <SpeakerXMarkIcon className="h-5 w-5 text-indigo-600" />
      ) : (
        <SpeakerWaveIcon className="h-5 w-5" />
      )}
    </button>
  );

  return (
    <div className="w-full max-w-2xl p-6 bg-white rounded-xl shadow-lg border text-center space-y-6">
      <div className="min-h-[100px] flex items-center justify-center space-x-2">
        <p className="text-2xl font-semibold whitespace-pre-wrap">
          {card.front}
        </p>
        <PlayButton side="front" />
      </div>
      <hr />
      <div className="min-h-[100px] flex items-center justify-center space-x-2">
        {showAnswer ? (
          <>
            <p className="text-2xl text-gray-800 whitespace-pre-wrap">
              {card.back}
            </p>
            <PlayButton side="back" />
          </>
        ) : (
          <button
            type="button" // typeを指定
            onClick={() => setShowAnswer(true)}
            className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300"
          >
            Show Answer
          </button>
        )}
      </div>
      {showAnswer && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          {ratingButtons.map(({ rating, label, color }) => (
            <button
              type="button" // typeを指定
              key={rating}
              onClick={() => onRate(rating)}
              disabled={isSubmitting}
              className={`py-3 px-4 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${color}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- AcquisitionPage Component (Logic) ---
export default function AcquisitionPage() {
  const params = useParams();
  const deckId = params.deckId as string;

  const [mainQueue, setMainQueue] = useState<Card[]>([]);
  const [againQueue, setAgainQueue] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false); // 完了直前の状態
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
  const [totalSessionCards, setTotalSessionCards] = useState(0);

  const [loadingAudioSide, setLoadingAudioSide] = useState<
    "front" | "back" | null
  >(null);
  const [playingAudioSide, setPlayingAudioSide] = useState<
    "front" | "back" | null
  >(null);
  const [gcsPathToFetch, setGcsPathToFetch] = useState<string | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(
    null,
  );
  const [ttsError, setTtsError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasInteracted = useRef(false);

  const {
    cards: initialCards,
    isLoading,
    error,
  } = useCards(deckId, {
    forAcquisition: true,
    limit: 100,
  });

  const { mutate: rateCard, isPending: isSubmitting } = useRateCard(deckId);
  const { mutate: saveAiContent } = useSaveAiContent();
  const { mutate: generateTts } = useGenerateTts();
  const { data: signedUrlData } = useGetTtsUrl(gcsPathToFetch);

  const currentCard = useMemo(
    () => mainQueue[currentIndex] ?? null,
    [mainQueue, currentIndex],
  );

  const completedCount =
    totalSessionCards > 0
      ? totalSessionCards -
        (mainQueue.length - currentIndex + againQueue.length)
      : 0;

  const progressPercentage = isFinishing
    ? 100
    : totalSessionCards > 0
      ? (completedCount / totalSessionCards) * 100
      : 0;

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      // audioRef.current = null;
    }
    setPlayingAudioSide(null);
    setLoadingAudioSide(null);
  }, []);

  const playAudio = useCallback(
    (url: string, side: "front" | "back", onEnd?: () => void) => {
      stopAudio();
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingAudioSide(side);
      setLoadingAudioSide(null);
      audio.play().catch((err) => {
        console.error("Audio playback error:", err);
        if (err.name === "NotAllowedError") {
          setTtsError(
            "Browser blocked autoplay. Click an audio icon to enable sound.",
          );
        } else {
          setTtsError("Could not play audio.");
        }
        stopAudio();
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
      });
      audio.onended = () => {
        stopAudio();
        onEnd?.();
      };
    },
    [stopAudio],
  );

  const handlePlayAudio = useCallback(
    (side: "front" | "back") => {
      hasInteracted.current = true;
      if (playingAudioSide === side) {
        stopAudio();
        return;
      }

      if (!currentCard || (loadingAudioSide && loadingAudioSide !== side))
        return;

      stopAudio();
      setTtsError(null);
      setLoadingAudioSide(side);

      const text = side === "front" ? currentCard.front : currentCard.back;
      const lang = side === "front" ? "en-US" : "ja-JP";
      const contentType =
        side === "front"
          ? AiContentType.AUDIO_PRIMARY
          : AiContentType.AUDIO_SECONDARY;
      const existingAudio = currentCard.aiContents?.find(
        (c) => c.contentType === contentType && c.language === lang,
      );

      if (existingAudio?.content) {
        setGcsPathToFetch(existingAudio.content);
      } else {
        generateTts(
          { text, language: lang, cardId: currentCard.id, side },
          {
            onSuccess: (data) => {
              const updateQueue = (
                newContentData: Omit<Card["aiContents"][0], "cardId">,
              ) => {
                const newAiContent: Card["aiContents"][0] = {
                  ...newContentData,
                  // cardId: currentCard.id, // This is the cause of the error
                };
                setMainQueue((prev) =>
                  prev.map((card) => {
                    if (card.id === currentCard.id) {
                      const existingContentIndex =
                        card.aiContents?.findIndex(
                          (c) =>
                            c.contentType === newAiContent.contentType &&
                            c.language === newAiContent.language,
                        ) ?? -1;

                      const newContents = [...(card.aiContents || [])];
                      if (existingContentIndex !== -1) {
                        newContents[existingContentIndex] = newAiContent;
                      } else {
                        newContents.push(newAiContent);
                      }
                      return { ...card, aiContents: newContents };
                    }
                    return card;
                  }),
                );
              };

              playAudio(data.signedUrl, side, () => {
                updateQueue({
                  id: "", // 仮のID
                  contentType,
                  language: lang,
                  content: data.gcsPath,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              });

              // DBへの保存はバックグラウンドで実行
              saveAiContent({
                cardId: currentCard.id,
                contentType,
                content: data.gcsPath,
                language: lang,
              });
            },
            onError: (err) => {
              setTtsError(err.message);
              setLoadingAudioSide(null);
            },
          },
        );
      }
    },
    [
      currentCard,
      loadingAudioSide,
      playingAudioSide,
      generateTts,
      playAudio,
      stopAudio,
      saveAiContent,
    ],
  );

  useEffect(() => {
    if (signedUrlData?.signedUrl && loadingAudioSide) {
      playAudio(signedUrlData.signedUrl, loadingAudioSide);
      setGcsPathToFetch(null);
    }
  }, [signedUrlData, loadingAudioSide, playAudio]);

  useEffect(() => {
    if (generatedAudioUrl && loadingAudioSide) {
      playAudio(generatedAudioUrl, loadingAudioSide);
      setGeneratedAudioUrl(null);
    }
  }, [generatedAudioUrl, loadingAudioSide, playAudio]);

  useEffect(() => {
    if (currentCard && autoPlayEnabled && hasInteracted.current) {
      handlePlayAudio("front");
    }
    return () => {
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCard]);

  useEffect(() => {
    if (initialCards && mainQueue.length === 0 && totalSessionCards === 0) {
      setMainQueue(initialCards);
      setTotalSessionCards(initialCards.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCards]);

  useEffect(() => {
    if (isFinishing) {
      const timer = setTimeout(() => {
        setSessionFinished(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isFinishing]);

  const handleRate = (rating: AcquisitionRating) => {
    if (!currentCard || isSubmitting || isFinishing) return;

    stopAudio();
    rateCard({ cardId: currentCard.id, rating });

    const isLastCardInMainQueue = currentIndex === mainQueue.length - 1;
    const updatedAgainQueue = [...againQueue];

    if (rating === "AGAIN") {
      updatedAgainQueue.push(currentCard);
    }

    if (!isLastCardInMainQueue) {
      if (rating === "AGAIN") setAgainQueue(updatedAgainQueue);
      setCurrentIndex((prev) => prev + 1);
    } else {
      // mainQueueの最後に到達
      if (updatedAgainQueue.length > 0) {
        setMainQueue(updatedAgainQueue);
        setAgainQueue([]);
        setCurrentIndex(0);
      } else {
        setIsFinishing(true);
      }
    }
  };

  const handleAutoplayToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isEnabled = e.target.checked;
    setAutoPlayEnabled(isEnabled);
    if (isEnabled && currentCard) {
      hasInteracted.current = true;
      handlePlayAudio("front");
    } else {
      stopAudio();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <FullPageSpinner />
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-red-500 text-center p-8">Error: {error.message}</div>
    );
  }
  if (sessionFinished) {
    return (
      <div className="relative flex flex-col justify-center items-center h-screen space-y-4">
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={300}
        />
        <h2 className="text-3xl font-bold z-10">Congratulations!</h2>
        <p className="text-gray-600 z-10">
          You&apos;ve finished this acquisition session.
        </p>
        <Link href={`/decks/${deckId}`} className="z-10">
          <span className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
            Back to Deck
          </span>
        </Link>
      </div>
    );
  }
  if (!currentCard && !isLoading && !isFinishing) {
    return (
      <div className="flex flex-col justify-center items-center h-screen space-y-4">
        <h2 className="text-2xl font-bold">No cards to review!</h2>
        <p className="text-gray-600">Come back later or add new cards.</p>
        <Link href={`/decks/${deckId}`}>
          <span className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
            Back to Deck
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen p-4 space-y-4">
      <div className="flex items-center space-x-2 bg-white p-2 rounded-full shadow border">
        <label htmlFor="autoplay" className="text-sm font-medium text-gray-700">
          Auto-play Audio
        </label>
        <input
          type="checkbox"
          id="autoplay"
          checked={autoPlayEnabled}
          onChange={handleAutoplayToggle}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
      </div>

      {ttsError && <p className="text-sm text-red-600">{ttsError}</p>}

      <div className="w-full max-w-2xl text-center my-4">
        <div className="flex justify-between text-sm font-medium text-gray-600">
          <span>Progress</span>
          <span>
            {completedCount} / {totalSessionCards}
          </span>
        </div>
        <div className="bg-gray-200 rounded-full h-2.5 w-full mt-1">
          <div
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
      {currentCard && (
        <AcquisitionCard
          card={currentCard}
          onRate={handleRate}
          isSubmitting={isSubmitting || isFinishing}
          onPlayAudio={handlePlayAudio}
          loadingAudioSide={loadingAudioSide}
          playingAudioSide={playingAudioSide}
        />
      )}
    </div>
  );
}
