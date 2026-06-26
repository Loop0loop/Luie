import { Sparkles, RefreshCw, Loader2, Quote, BarChart2, ImageOff } from "lucide-react";
import { cn } from "@shared/types/utils";
import { RadarChart } from "./RadarChart";
import {
  useCharacterAI,
  type CharacterAIInput,
  type CharacterStatsInput,
} from "./hooks/useCharacterAI";
import type { CharacterWikiAttrs } from "./hooks/useCharacterWikiAttrs";
import { CHARACTER_COLOR_PRESETS } from "./types";

// ── HeroImage ─────────────────────────────────────────────────────────────

type HeroImageProps = {
  src: string | null;
  characterName: string;
  characterColor: string;
  isLoading: boolean;
  error?: string;
  hasContent: boolean;
  isGenerating: boolean;
  onRegenerate: () => void;
  onGenerate: () => void;
};

function HeroImage({
  src,
  characterName,
  characterColor,
  isLoading,
  error,
  hasContent,
  isGenerating,
  onRegenerate,
  onGenerate,
}: HeroImageProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="relative w-full aspect-video bg-surface-hover flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="animate-spin text-muted" />
        <span className="text-[13px] text-muted">이미지 생성 중...</span>
      </div>
    );
  }

  // Image present
  if (src) {
    return (
      <div className="relative w-full aspect-video group/img overflow-hidden">
        <img
          src={src}
          alt={characterName}
          className="w-full h-full object-cover"
        />
        {/* Bottom gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        <button
          type="button"
          onClick={onRegenerate}
          title="이미지 재생성"
          className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/50 text-white/70 hover:bg-black/70 hover:text-white transition-all backdrop-blur-sm text-[12px] opacity-0 group-hover/img:opacity-100"
        >
          <RefreshCw size={11} />
          재생성
        </button>
      </div>
    );
  }

  // Empty state — integrated CTA when nothing generated yet
  if (!hasContent) {
    return (
      <button
        type="button"
        disabled={isGenerating}
        onClick={onGenerate}
        className={cn(
          "w-full aspect-video flex flex-col items-center justify-center gap-4 transition-colors",
          "border-b border-border/40",
          isGenerating
            ? "cursor-not-allowed"
            : "hover:bg-surface-hover cursor-pointer group/cta",
        )}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover/cta:scale-105"
          style={{ backgroundColor: `${characterColor}15` }}
        >
          {isGenerating ? (
            <Loader2 size={26} className="animate-spin" style={{ color: characterColor }} />
          ) : (
            <Sparkles size={26} style={{ color: characterColor }} />
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[14px] font-medium text-fg/70">
            {isGenerating ? "시각화 생성 중..." : "AI 시각화 생성"}
          </span>
          <span className="text-[12px] text-muted/60">
            위키 내용을 분석해 이미지와 대사를 만듭니다
          </span>
        </div>
        {error && <span className="text-[12px] text-danger">{error}</span>}
      </button>
    );
  }

  // Image failed but other content exists
  return (
    <div className="w-full aspect-video bg-surface-hover flex flex-col items-center justify-center gap-3 border-b border-border/40">
      <ImageOff size={24} className="text-muted/40" />
      <button
        type="button"
        onClick={onRegenerate}
        className="text-[12px] text-muted hover:text-accent transition-colors"
      >
        이미지 생성하기
      </button>
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </div>
  );
}

// ── QuoteStrip ────────────────────────────────────────────────────────────

type QuoteStripProps = {
  quote: string | null;
  characterColor: string;
  isLoading: boolean;
  error?: string;
  onRegenerate: () => void;
};

function QuoteStrip({ quote, characterColor, isLoading, error, onRegenerate }: QuoteStripProps) {
  return (
    <div className="px-5 py-4 flex items-start gap-3 min-h-[56px]">
      <Quote
        size={14}
        style={{ color: characterColor, opacity: 0.6 }}
        className="shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <Loader2 size={12} className="animate-spin shrink-0" />
            대사 생성 중...
          </div>
        ) : quote ? (
          <p className="text-[14px] italic leading-relaxed text-fg/80">{quote}</p>
        ) : (
          <p className="text-[13px] italic text-muted/35">
            {error ?? "캐릭터가 할 법한 대사가 여기에..."}
          </p>
        )}
      </div>
      {(quote || error) && !isLoading && (
        <button
          type="button"
          onClick={onRegenerate}
          title="대사 재생성"
          className="shrink-0 text-muted/40 hover:text-muted transition-colors mt-0.5"
        >
          <RefreshCw size={12} />
        </button>
      )}
    </div>
  );
}

// ── StatsCard ─────────────────────────────────────────────────────────────

type StatsCardProps = {
  axes: CharacterWikiAttrs["radarAxes"];
  color: string;
  isAnalyzing: boolean;
  error?: string;
  onAnalyze: () => void;
  onAxesChange: (axes: CharacterWikiAttrs["radarAxes"]) => void;
};

function StatsCard({ axes, color, isAnalyzing, error, onAnalyze, onAxesChange }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">
          캐릭터 스탯
        </span>
        <button
          type="button"
          disabled={isAnalyzing}
          onClick={onAnalyze}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border",
            isAnalyzing
              ? "border-border/30 text-muted/40 cursor-not-allowed"
              : "border-border/60 text-muted hover:border-accent/60 hover:text-accent hover:bg-accent/5 cursor-pointer",
          )}
        >
          {isAnalyzing ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <BarChart2 size={11} />
          )}
          {isAnalyzing ? "분석 중..." : "AI 분석"}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-5 py-2.5 bg-danger/8 border-b border-danger/20">
          <p className="text-[12px] text-danger">{error}</p>
        </div>
      )}

      {/* Radar + editors */}
      <div className="p-5">
        <RadarChart
          axes={axes}
          color={color}
          size={220}
          onAxesChange={onAxesChange}
        />
      </div>
    </div>
  );
}

// ── ColorTheme ────────────────────────────────────────────────────────────

type ColorThemeProps = {
  value: string;
  onChange: (color: string) => void;
};

function ColorTheme({ value, onChange }: ColorThemeProps) {
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-3.5 flex items-center gap-4">
      <span className="text-[11px] font-semibold text-muted uppercase tracking-widest shrink-0">
        테마 컬러
      </span>
      {/* Active swatch */}
      <div
        className="w-5 h-5 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-surface"
        style={{ backgroundColor: value, outlineColor: value }}
      />
      <div className="w-px h-4 bg-border/50 shrink-0" />
      {/* Presets */}
      <div className="flex items-center gap-2 flex-wrap">
        {CHARACTER_COLOR_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            style={{ backgroundColor: preset }}
            className={cn(
              "w-4 h-4 rounded-full border-2 transition-all hover:scale-125",
              value === preset ? "border-fg/50 scale-125" : "border-transparent",
            )}
          />
        ))}
        {/* Custom */}
        <label
          title="커스텀 색상"
          className="relative w-4 h-4 rounded-full border-2 border-dashed border-border/60 cursor-pointer hover:border-accent/60 transition-colors flex items-center justify-center overflow-hidden"
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <span className="text-[8px] text-muted pointer-events-none leading-none">+</span>
        </label>
      </div>
    </div>
  );
}

// ── CharacterVisualPanel ──────────────────────────────────────────────────

type CharacterVisualPanelProps = {
  characterId: string;
  characterName: string;
  attrs: Pick<
    CharacterWikiAttrs,
    | "tagline"
    | "roles"
    | "keywords"
    | "characterColor"
    | "generatedImage"
    | "generatedQuote"
    | "radarAxes"
    | "getSectionContent"
    | "setCharacterColor"
    | "setGeneratedImage"
    | "setGeneratedQuote"
    | "setRadarAxes"
  >;
};

export function CharacterVisualPanel({ characterId, characterName, attrs }: CharacterVisualPanelProps) {
  const {
    characterColor,
    generatedImage,
    generatedQuote,
    radarAxes,
    setCharacterColor,
    setGeneratedImage,
    setGeneratedQuote,
    setRadarAxes,
  } = attrs;

  const {
    imageState,
    quoteState,
    statsState,
    isGenerating,
    generateImage,
    generateQuote,
    generateAll,
    generateStats,
  } = useCharacterAI(characterId);

  /** All wiki sections bundled into one context object for AI calls. */
  const buildInput = (): CharacterAIInput => ({
    name:        characterName,
    tagline:     attrs.tagline || undefined,
    roles:       attrs.roles.length ? attrs.roles : undefined,
    keywords:    attrs.keywords.length ? attrs.keywords : undefined,
    overview:    attrs.getSectionContent("overview") || undefined,
    personality: attrs.getSectionContent("personality") || undefined,
    background:  attrs.getSectionContent("background") || undefined,
    appearance:  attrs.getSectionContent("appearance") || undefined,
    relations:   attrs.getSectionContent("relations") || undefined,
    notes:       attrs.getSectionContent("notes") || undefined,
  });

  const buildStatsInput = (): CharacterStatsInput => ({
    ...buildInput(),
    axes: radarAxes,
  });

  const hasContent = !!(generatedImage ?? generatedQuote);

  return (
    <div className="flex flex-col gap-4 max-w-[680px]">

      {/* ── Hero card: image + quote ────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <HeroImage
          src={generatedImage}
          characterName={characterName}
          characterColor={characterColor}
          isLoading={imageState.status === "loading"}
          error={imageState.error}
          hasContent={hasContent}
          isGenerating={isGenerating}
          onRegenerate={() => generateImage(buildInput(), setGeneratedImage)}
          onGenerate={() => generateAll(buildInput(), setGeneratedImage, setGeneratedQuote)}
        />

        {/* Only show quote strip after first generation */}
        {hasContent && (
          <QuoteStrip
            quote={generatedQuote}
            characterColor={characterColor}
            isLoading={quoteState.status === "loading"}
            error={quoteState.error}
            onRegenerate={() => generateQuote(buildInput(), setGeneratedQuote)}
          />
        )}
      </div>

      {/* ── Generate CTA row — shown only when quote exists but no image (edge case) */}
      {hasContent && !generatedImage && !isGenerating && (
        <button
          type="button"
          onClick={() => generateImage(buildInput(), setGeneratedImage)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-medium border border-dashed border-accent/40 text-accent/80 hover:bg-accent/5 hover:border-accent/70 transition-colors cursor-pointer"
        >
          <Sparkles size={13} />
          이미지 생성하기
        </button>
      )}

      {/* ── Stats card ──────────────────────────────────────────────────── */}
      <StatsCard
        axes={radarAxes}
        color={characterColor}
        isAnalyzing={statsState.status === "loading"}
        error={statsState.error}
        onAnalyze={() => generateStats(buildStatsInput(), setRadarAxes)}
        onAxesChange={setRadarAxes}
      />

      {/* ── Color theme ─────────────────────────────────────────────────── */}
      <ColorTheme value={characterColor} onChange={setCharacterColor} />
    </div>
  );
}
