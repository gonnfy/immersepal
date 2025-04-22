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