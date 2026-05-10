import { useState, useCallback } from "react";
import { api } from "@shared/api";
import type { RadarAxis } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────

type AsyncStatus = "idle" | "loading" | "error";

type AsyncState = {
  status: AsyncStatus;
  error?: string;
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

export function useCharacterAI(): UseCharacterAI {
  const [imageState, setImageState] = useState<AsyncState>(IDLE);
  const [quoteState, setQuoteState] = useState<AsyncState>(IDLE);
  const [statsState, setStatsState] = useState<AsyncState>(IDLE);

  const generateImage = useCallback(
    async (input: CharacterAIInput, onSuccess: (url: string) => void) => {
      setImageState(LOADING);
      try {
        const res = await api.character.generateImage(input);
        if (res.success && res.data) {
          onSuccess(res.data);
          setImageState(IDLE);
        } else {
          setImageState(failed("이미지 생성에 실패했습니다"));
        }
      } catch (err) {
        const msg = err instanceof Error
          ? toUserMessage(err.message, "이미지 생성에 실패했습니다")
          : "이미지 생성에 실패했습니다";
        setImageState(failed(msg));
      }
    },
    [],
  );

  const generateQuote = useCallback(
    async (input: CharacterAIInput, onSuccess: (quote: string) => void) => {
      setQuoteState(LOADING);
      try {
        const res = await api.character.generateQuote(input);
        if (res.success && res.data) {
          onSuccess(res.data);
          setQuoteState(IDLE);
        } else {
          setQuoteState(failed("대사 생성에 실패했습니다"));
        }
      } catch (err) {
        const msg = err instanceof Error
          ? toUserMessage(err.message, "대사 생성에 실패했습니다")
          : "대사 생성에 실패했습니다";
        setQuoteState(failed(msg));
      }
    },
    [],
  );

  const generateStats = useCallback(
    async (input: CharacterStatsInput, onSuccess: (axes: RadarAxis[]) => void) => {
      setStatsState(LOADING);
      try {
        const res = await api.character.generateStats(input);
        if (res.success && res.data) {
          onSuccess(res.data as RadarAxis[]);
          setStatsState(IDLE);
        } else {
          setStatsState(failed("스탯 분석에 실패했습니다"));
        }
      } catch (err) {
        const msg = err instanceof Error
          ? toUserMessage(err.message, "스탯 분석에 실패했습니다")
          : "스탯 분석에 실패했습니다";
        setStatsState(failed(msg));
      }
    },
    [],
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

  return {
    imageState,
    quoteState,
    statsState,
    isGenerating:
      imageState.status === "loading" ||
      quoteState.status === "loading" ||
      statsState.status === "loading",
    generateImage,
    generateQuote,
    generateStats,
    generateAll,
  };
}
