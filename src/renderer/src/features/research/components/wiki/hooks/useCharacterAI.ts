import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@shared/api";
import type { RadarAxis } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────

type AsyncStatus = "idle" | "loading" | "error";

type AsyncState = {
  status: AsyncStatus;
  error?: string;
};

type ScopedAsyncState = AsyncState & {
  scopeKey: string;
};

export type CharacterAIInput = Parameters<typeof api.character.generateImage>[0];
export type CharacterStatsInput = Parameters<typeof api.character.generateStats>[0];

export type UseCharacterAI = {
  imageState:    AsyncState;
  quoteState:    AsyncState;
  statsState:    AsyncState;
  isGenerating:  boolean;
  generateImage: (input: CharacterAIInput, onSuccess: (url: string) => void) => Promise<void>;
  generateQuote: (input: CharacterAIInput, onSuccess: (quote: string) => void) => Promise<void>;
  generateStats: (input: CharacterStatsInput, onSuccess: (axes: RadarAxis[]) => void) => Promise<void>;
  generateAll:   (
    input: CharacterAIInput,
    onImage: (url: string) => void,
    onQuote: (q: string) => void,
  ) => Promise<void>;
};

// ── State helpers ─────────────────────────────────────────────────────────

const IDLE:   AsyncState = { status: "idle" };
const LOADING: AsyncState = { status: "loading" };

const failed = (msg: string): AsyncState => ({ status: "error", error: msg });

/** Maps error message codes to user-facing Korean strings. */
function toUserMessage(errorMessage: string, fallback: string): string {
  if (errorMessage.includes("RATE_LIMIT"))   return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  if (errorMessage.includes("UNAUTHORIZED")) return "API 키가 유효하지 않습니다.";
  if (errorMessage.includes("SERVER_ERROR")) return "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  return fallback;
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useCharacterAI(scopeKey: string): UseCharacterAI {
  const [imageState, setImageState] = useState<ScopedAsyncState>({
    ...IDLE,
    scopeKey,
  });
  const [quoteState, setQuoteState] = useState<ScopedAsyncState>({
    ...IDLE,
    scopeKey,
  });
  const [statsState, setStatsState] = useState<ScopedAsyncState>({
    ...IDLE,
    scopeKey,
  });
  const activeScopeRef = useRef(scopeKey);
  const isMountedRef = useRef(true);
  const imageRequestIdRef = useRef(0);
  const quoteRequestIdRef = useRef(0);
  const statsRequestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      imageRequestIdRef.current += 1;
      quoteRequestIdRef.current += 1;
      statsRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    activeScopeRef.current = scopeKey;
    imageRequestIdRef.current += 1;
    quoteRequestIdRef.current += 1;
    statsRequestIdRef.current += 1;
  }, [scopeKey]);

  const isActive = useCallback((requestId: number, startedScopeKey: string, currentRequestId: number) => (
    isMountedRef.current &&
    activeScopeRef.current === startedScopeKey &&
    requestId === currentRequestId
  ), []);

  const generateImage = useCallback(
    async (input: CharacterAIInput, onSuccess: (url: string) => void) => {
      const requestId = ++imageRequestIdRef.current;
      const startedScopeKey = activeScopeRef.current;
      setImageState({ ...LOADING, scopeKey: startedScopeKey });
      try {
        const res = await api.character.generateImage(input);
        if (!isActive(requestId, startedScopeKey, imageRequestIdRef.current)) {
          return;
        }
        if (res.success && res.data) {
          onSuccess(res.data);
          setImageState({ ...IDLE, scopeKey: startedScopeKey });
        } else {
          setImageState({
            ...failed("이미지 생성에 실패했습니다"),
            scopeKey: startedScopeKey,
          });
        }
      } catch (err) {
        if (!isActive(requestId, startedScopeKey, imageRequestIdRef.current)) {
          return;
        }
        const msg = err instanceof Error
          ? toUserMessage(err.message, "이미지 생성에 실패했습니다")
          : "이미지 생성에 실패했습니다";
        setImageState({ ...failed(msg), scopeKey: startedScopeKey });
      }
    },
    [isActive],
  );

  const generateQuote = useCallback(
    async (input: CharacterAIInput, onSuccess: (quote: string) => void) => {
      const requestId = ++quoteRequestIdRef.current;
      const startedScopeKey = activeScopeRef.current;
      setQuoteState({ ...LOADING, scopeKey: startedScopeKey });
      try {
        const res = await api.character.generateQuote(input);
        if (!isActive(requestId, startedScopeKey, quoteRequestIdRef.current)) {
          return;
        }
        if (res.success && res.data) {
          onSuccess(res.data);
          setQuoteState({ ...IDLE, scopeKey: startedScopeKey });
        } else {
          setQuoteState({
            ...failed("대사 생성에 실패했습니다"),
            scopeKey: startedScopeKey,
          });
        }
      } catch (err) {
        if (!isActive(requestId, startedScopeKey, quoteRequestIdRef.current)) {
          return;
        }
        const msg = err instanceof Error
          ? toUserMessage(err.message, "대사 생성에 실패했습니다")
          : "대사 생성에 실패했습니다";
        setQuoteState({ ...failed(msg), scopeKey: startedScopeKey });
      }
    },
    [isActive],
  );

  const generateStats = useCallback(
    async (input: CharacterStatsInput, onSuccess: (axes: RadarAxis[]) => void) => {
      const requestId = ++statsRequestIdRef.current;
      const startedScopeKey = activeScopeRef.current;
      setStatsState({ ...LOADING, scopeKey: startedScopeKey });
      try {
        const res = await api.character.generateStats(input);
        if (!isActive(requestId, startedScopeKey, statsRequestIdRef.current)) {
          return;
        }
        if (res.success && res.data) {
          onSuccess(res.data as RadarAxis[]);
          setStatsState({ ...IDLE, scopeKey: startedScopeKey });
        } else {
          setStatsState({
            ...failed("스탯 분석에 실패했습니다"),
            scopeKey: startedScopeKey,
          });
        }
      } catch (err) {
        if (!isActive(requestId, startedScopeKey, statsRequestIdRef.current)) {
          return;
        }
        const msg = err instanceof Error
          ? toUserMessage(err.message, "스탯 분석에 실패했습니다")
          : "스탯 분석에 실패했습니다";
        setStatsState({ ...failed(msg), scopeKey: startedScopeKey });
      }
    },
    [isActive],
  );

  const generateAll = useCallback(
    async (
      input: CharacterAIInput,
      onImage: (url: string) => void,
      onQuote: (q: string) => void,
    ) => {
      await Promise.allSettled([
        generateImage(input, onImage),
        generateQuote(input, onQuote),
      ]);
    },
    [generateImage, generateQuote],
  );

  const scopedImageState =
    imageState.scopeKey === scopeKey ? imageState : IDLE;
  const scopedQuoteState =
    quoteState.scopeKey === scopeKey ? quoteState : IDLE;
  const scopedStatsState =
    statsState.scopeKey === scopeKey ? statsState : IDLE;

  return {
    imageState: scopedImageState,
    quoteState: scopedQuoteState,
    statsState: scopedStatsState,
    isGenerating:
      scopedImageState.status === "loading" ||
      scopedQuoteState.status === "loading" ||
      scopedStatsState.status === "loading",
    generateImage,
    generateQuote,
    generateStats,
    generateAll,
  };
}
