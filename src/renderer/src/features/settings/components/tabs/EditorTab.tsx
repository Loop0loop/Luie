import { memo, useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import type { TFunction } from "i18next";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useShallow } from "zustand/react/shallow";
import { useSystemFonts } from "@renderer/features/editor/hooks/useSystemFonts";
import type { FontFamilyPreset } from "@shared/types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui/select";
import { Slider } from "@renderer/components/ui/slider";
import { Virtuoso } from "react-virtuoso";
import {
  curateSystemFonts,
  type FontLanguageFilter,
} from "@renderer/features/settings/utils/fontCuration";

const PRESETS: Array<{ id: FontFamilyPreset; labelKey: string; preview: string }> = [
  { id: "system-ui", labelKey: "settings.font.systemUi", preview: "system-ui" },
  { id: "serif", labelKey: "settings.font.serif", preview: "serif" },
  { id: "mono", labelKey: "settings.font.mono", preview: "monospace" },
];
const PRESET_IDS = new Set(PRESETS.map((f) => f.id));

const FONT_SIZE_PRESETS = [14, 16, 18, 20, 24];
const LINE_HEIGHT_PRESETS = [1.4, 1.6, 1.8, 2.0, 2.2];

const LETTER_SPACING_PRESETS = [-0.02, 0, 0.05, 0.1];
const WORD_SPACING_PRESETS = [0, 0.05, 0.1, 0.15];
const PARAGRAPH_SPACING_PRESETS = [0.5, 1.0, 1.5, 2.0];

const LANG_FILTER_KEYS: Array<{ id: FontLanguageFilter; labelKey: string; defaultLabel: string }> = [
  { id: "all", labelKey: "settings.font.lang.all", defaultLabel: "전체" },
  { id: "ko", labelKey: "settings.font.lang.ko", defaultLabel: "한국어" },
  { id: "en", labelKey: "settings.font.lang.en", defaultLabel: "English" },
  { id: "ja", labelKey: "settings.font.lang.ja", defaultLabel: "日本語" },
];

const formatPx = (p: number) => `${p}px`;
const formatFixed1 = (p: number) => p.toFixed(1);
const formatPercent = (p: number) => `${(p * 100).toFixed(0)}%`;
const formatEm = (p: number) => `${p.toFixed(1)}em`;

interface EditorTabProps {
  t: TFunction;
  localFontSize: number;
  localLineHeight: number;
  localLetterSpacing: number;
  localWordSpacing: number;
  localParagraphSpacing: number;
  onSetLocalFontSize: (value: number) => void;
  onSetLocalLineHeight: (value: number) => void;
  onSetLocalLetterSpacing: (value: number) => void;
  onSetLocalWordSpacing: (value: number) => void;
  onSetLocalParagraphSpacing: (value: number) => void;
}

/**
 * Apple HIG / macOS 스타일의 글래스모피즘 타이포그래피 슬라이더 컨트롤
 */
const TypographySliderRow = memo(function TypographySliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  presets,
  formatPreset = (p) => String(p),
  onChange,
  decreaseAriaLabel,
  increaseAriaLabel,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  presets?: number[];
  formatPreset?: (p: number) => string;
  onChange: (v: number) => void;
  decreaseAriaLabel?: string;
  increaseAriaLabel?: string;
}) {
  const increase = useCallback(
    () => onChange(Math.min(max, Number((value + step).toFixed(2)))),
    [max, onChange, step, value],
  );
  const decrease = useCallback(
    () => onChange(Math.max(min, Number((value - step).toFixed(2)))),
    [min, onChange, step, value],
  );
  const handleSliderChange = useCallback(
    ([val]: number[]) => onChange(val),
    [onChange],
  );

  return (
    <div className="rounded-panel border border-border/70 bg-surface/60 backdrop-blur-md p-4 space-y-3 shadow-xs hover:border-border transition-all">
      {/* Header: Label, Value Badge, Integrated Stepper */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-fg tracking-tight">{label}</span>
        <div className="flex items-center gap-2">
          <span className="inline-flex min-w-14 items-center justify-center rounded-control bg-element/80 backdrop-blur-xs px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums text-fg border border-border/40 shadow-2xs">
            {display}
          </span>
          <div className="inline-flex items-center rounded-control border border-border/60 bg-element/70 backdrop-blur-xs p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={decrease}
              disabled={value <= min}
              className="flex h-6 w-6 items-center justify-center rounded-[6px] text-muted hover:bg-surface/90 hover:text-fg disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label={decreaseAriaLabel ?? `${label} 감소`}
            >
              <Minus className="h-3 w-3" />
            </button>
            <div className="h-3.5 w-px bg-border/50" />
            <button
              type="button"
              onClick={increase}
              disabled={value >= max}
              className="flex h-6 w-6 items-center justify-center rounded-[6px] text-muted hover:bg-surface/90 hover:text-fg disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label={increaseAriaLabel ?? `${label} 증가`}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Preset Segmented Control */}
      {presets && presets.length > 0 ? (
        <div className="flex w-full items-center rounded-control bg-element/70 backdrop-blur-xs p-0.5 border border-border/40 shadow-inner">
          {presets.map((p) => {
            const isSelected = Math.abs(value - p) < 0.001;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onChange(p)}
                className={`flex-1 py-1 rounded-[6px] text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-surface text-accent font-semibold shadow-xs ring-1 ring-border/50"
                    : "text-muted hover:text-fg hover:bg-surface/40"
                }`}
              >
                {formatPreset(p)}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Slider */}
      <div className="pt-1 px-0.5">
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={handleSliderChange}
          aria-label={label}
        />
      </div>
    </div>
  );
});

const ToggleCard = memo(function ToggleCard({
  label,
  description,
  checked,
  onChange,
  ariaLabel,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-panel border border-border/70 bg-surface/60 backdrop-blur-md p-4 shadow-xs hover:border-border transition-all">
      <div className="min-w-0">
        <h3 className="text-sm font-medium text-fg">{label}</h3>
        <p className="mt-0.5 text-xs text-muted leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border-strong transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
          checked ? "bg-accent" : "bg-element"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-on-accent shadow-control transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
});

export const EditorTab = memo(function EditorTab({
  t,
  localFontSize,
  localLineHeight,
  localLetterSpacing,
  localWordSpacing,
  localParagraphSpacing,
  onSetLocalFontSize,
  onSetLocalLineHeight,
  onSetLocalLetterSpacing,
  onSetLocalWordSpacing,
  onSetLocalParagraphSpacing,
}: EditorTabProps) {
  const {
    fontFamily,
    fontPreset,
    customFontFamily,
    spellcheckEnabled,
    typewriterMode,
    updateSettings: onApplySettings,
  } = useEditorStore(
    useShallow((state) => ({
      fontFamily: state.fontFamily,
      fontPreset: state.fontPreset,
      customFontFamily: state.customFontFamily,
      spellcheckEnabled: state.spellcheckEnabled,
      typewriterMode: state.typewriterMode ?? false,
      updateSettings: state.updateSettings,
    })),
  );

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [langFilter, setLangFilter] = useState<FontLanguageFilter>("all");
  const [showAllOtherFonts, setShowAllOtherFonts] = useState(false);
  const [fontSearchQuery, setFontSearchQuery] = useState("");
  const deferredFontSearchQuery = useDeferredValue(fontSearchQuery);

  const {
    fonts: systemFonts,
    isLoading: isLoadingSystemFonts,
  } = useSystemFonts();

  // 시스템 폰트 중 프리셋 제외 및 언어별/인기 폰트 큐레이션 (지연 평가로 입력 반응성 보장)
  const { popularFonts, otherFonts } = useMemo(() => {
    const rawFiltered = systemFonts.filter(
      (f) => !PRESET_IDS.has(f.family as FontFamilyPreset),
    );
    const { popular, others } = curateSystemFonts(
      rawFiltered,
      langFilter,
      deferredFontSearchQuery,
    );
    return {
      popularFonts: popular,
      otherFonts: others,
    };
  }, [systemFonts, langFilter, deferredFontSearchQuery]);

  const previewFontFamily = useMemo(() => {
    if (customFontFamily) return customFontFamily;
    if (fontPreset === "inter") return '"Inter Variable", "Inter", sans-serif';
    if (fontFamily === "serif") return "serif";
    if (fontFamily === "mono") return "monospace";
    if (fontFamily === "system-ui") return undefined;
    return fontFamily;
  }, [customFontFamily, fontPreset, fontFamily]);

  const previewStyle = useMemo(
    () =>
      ({
        fontFamily: previewFontFamily,
        fontSize: `${localFontSize}px`,
        lineHeight: localLineHeight,
        letterSpacing: `${localLetterSpacing}em`,
        wordSpacing: `${localWordSpacing}em`,
      }) as const,
    [previewFontFamily, localFontSize, localLineHeight, localLetterSpacing, localWordSpacing],
  );

  const currentFontValue = useMemo(() => {
    if (fontPreset === "inter") return "inter";
    if (customFontFamily) return `custom:${customFontFamily}`;
    if (PRESET_IDS.has(fontFamily as FontFamilyPreset)) return fontFamily;
    return `system:${fontFamily}`;
  }, [fontPreset, customFontFamily, fontFamily]);

  const handleFontSelect = useCallback(
    (value: string) => {
      if (value === "inter") {
        onApplySettings({ fontPreset: "inter", customFontFamily: undefined });
        return;
      }
      if (value.startsWith("custom:")) {
        onApplySettings({ customFontFamily: value.slice(7), fontPreset: undefined });
        return;
      }
      if (value.startsWith("system:")) {
        onApplySettings({
          fontFamily: value.slice(7) as FontFamilyPreset,
          fontPreset: undefined,
          customFontFamily: undefined,
        });
        return;
      }
      onApplySettings({
        fontFamily: value as FontFamilyPreset,
        fontPreset: undefined,
        customFontFamily: undefined,
      });
    },
    [onApplySettings],
  );

  const handleReset = useCallback(() => {
    onSetLocalFontSize(16);
    onSetLocalLineHeight(1.6);
    onSetLocalLetterSpacing(0);
    onSetLocalWordSpacing(0);
    onSetLocalParagraphSpacing(1.0);
    onApplySettings({
      fontSize: 16,
      lineHeight: 1.6,
      letterSpacing: 0,
      wordSpacing: 0,
      paragraphSpacing: 1.0,
    });
  }, [
    onSetLocalFontSize,
    onSetLocalLineHeight,
    onSetLocalLetterSpacing,
    onSetLocalWordSpacing,
    onSetLocalParagraphSpacing,
    onApplySettings,
  ]);

  const handleToggleSpellcheck = useCallback(() => {
    onApplySettings({ spellcheckEnabled: !spellcheckEnabled });
  }, [onApplySettings, spellcheckEnabled]);

  const handleToggleTypewriter = useCallback(() => {
    void onApplySettings({ typewriterMode: !typewriterMode });
  }, [onApplySettings, typewriterMode]);

  return (
    <div className="space-y-8 max-w-2xl">
      {/* ---- Section 1: 폰트 선택 & 언어별 큐레이션 ---- */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-fg">
              {t("settings.section.font")}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {t("settings.font.helper.primary", "에디터 본문에 적용할 서체를 선택합니다.")}
            </p>
          </div>

          {/* 언어별 1차 필터 세그먼트 컨트롤 */}
          <div className="inline-flex items-center rounded-control bg-element/70 backdrop-blur-xs p-0.5 border border-border/40 shadow-inner">
            {LANG_FILTER_KEYS.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => {
                  setLangFilter(lang.id);
                  setShowAllOtherFonts(false);
                }}
                className={`px-2.5 py-1 rounded-[6px] text-xs font-medium transition-all ${
                  langFilter === lang.id
                    ? "bg-surface text-accent font-semibold shadow-xs ring-1 ring-border/50"
                    : "text-muted hover:text-fg hover:bg-surface/40"
                }`}
              >
                {t(lang.labelKey, lang.defaultLabel)}
              </button>
            ))}
          </div>
        </div>

        {/* 폰트 선택 드롭다운 */}
        <Select value={currentFontValue} onValueChange={handleFontSelect}>
          <SelectTrigger className="w-full bg-surface/70 backdrop-blur-md border-border/70 shadow-xs hover:border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[360px] bg-panel/95 backdrop-blur-xl border-border shadow-modal">
            {/* 기본 및 내장 추천 폰트 */}
            <SelectGroup>
              <SelectLabel>{t("settings.font.group.presets", "기본 추천 서체")}</SelectLabel>
              {PRESETS.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  <span
                    className="mr-2.5 inline-flex h-5 w-5 items-center justify-center rounded text-base font-medium opacity-80"
                    style={{ fontFamily: f.preview }}
                  >
                    Aa
                  </span>
                  {t(f.labelKey)}
                </SelectItem>
              ))}
              <SelectItem value="inter">
                <span
                  className="mr-2.5 inline-flex h-5 w-5 items-center justify-center rounded text-base font-medium opacity-80"
                  style={{ fontFamily: '"Inter Variable", "Inter", sans-serif' }}
                >
                  Aa
                </span>
                Inter Variable
              </SelectItem>
            </SelectGroup>

            {/* 2차 필터: 많이 쓰는 인기 서체 */}
            {popularFonts.length > 0 ? (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>
                    {langFilter === "ko"
                      ? t("settings.font.group.popularKo", "자주 쓰는 한국어 서체")
                      : langFilter === "en"
                        ? t("settings.font.group.popularEn", "Popular English Fonts")
                        : langFilter === "ja"
                          ? t("settings.font.group.popularJa", "よく使う日本語フォント")
                          : t("settings.font.group.popularAll", "자주 쓰는 추천 시스템 서체")}
                  </SelectLabel>
                  {popularFonts.map((f) => (
                    <SelectItem key={f.family} value={`system:${f.family}`}>
                      <span
                        className="mr-2.5 inline-flex h-5 w-5 items-center justify-center rounded text-base font-medium opacity-80"
                        style={{ fontFamily: f.family }}
                      >
                        Aa
                      </span>
                      {f.family}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </>
            ) : null}

            {/* 로딩 상태 */}
            {isLoadingSystemFonts ? (
              <>
                <SelectSeparator />
                <div className="flex items-center justify-center py-4 text-xs text-muted">
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-accent" />
                  {t("settings.optionalFont.action.installing", "시스템 서체 검색 중...")}
                </div>
              </>
            ) : null}

            {/* 현재 커스텀 폰트 항목 */}
            {customFontFamily ? (
              <>
                <SelectSeparator />
                <SelectItem value={`custom:${customFontFamily}`}>
                  <span className="mr-2.5 inline-flex h-5 w-5 items-center justify-center rounded text-xs font-mono font-medium opacity-80">
                    Aa
                  </span>
                  {customFontFamily}
                </SelectItem>
              </>
            ) : null}

            {/* 맨 끝자락: 기타 모든 시스템 폰트 (Virtuoso 고성능 가상화 렌더링) */}
            {!isLoadingSystemFonts && otherFonts.length > 0 ? (
              <>
                <SelectSeparator />
                <div className="p-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowAllOtherFonts((prev) => !prev);
                    }}
                    className="flex w-full items-center justify-between px-2 py-1.5 rounded-control text-xs font-medium text-muted hover:text-fg hover:bg-surface-hover transition-colors"
                  >
                    <span>
                      {t("settings.font.group.otherCount", {
                        count: otherFonts.length,
                        defaultValue: `기타 시스템 서체 (${otherFonts.length}개)`,
                      })}
                    </span>
                    <span className="text-[11px] text-accent">
                      {showAllOtherFonts
                        ? t("settings.font.group.collapse", "접기")
                        : t("settings.font.group.expand", "확인하기")}
                    </span>
                  </button>

                  {showAllOtherFonts ? (
                    <div
                      className="mt-1 border-t border-border/40 pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-1 py-1 mb-1">
                        <div className="relative flex items-center">
                          <Search className="absolute left-2 h-3 w-3 text-muted pointer-events-none" />
                          <input
                            type="text"
                            placeholder={t("settings.font.searchPlaceholder", "폰트명 검색...")}
                            value={fontSearchQuery}
                            onChange={(e) => setFontSearchQuery(e.target.value)}
                            className="h-7 w-full rounded-control border border-border/60 bg-element/80 pl-6 pr-2 text-xs text-fg placeholder:text-subtle focus:outline-hidden focus:border-accent"
                          />
                        </div>
                      </div>

                      <div className="h-[200px] w-full">
                        <Virtuoso
                          style={{ height: "200px" }}
                          totalCount={otherFonts.length}
                          itemContent={(index) => {
                            const f = otherFonts[index];
                            if (!f) return null;
                            return (
                              <div className="py-0.5" key={f.family}>
                                <SelectItem value={`system:${f.family}`}>
                                  <span
                                    className="mr-2.5 inline-flex h-5 w-5 items-center justify-center rounded text-base font-medium opacity-80"
                                    style={{ fontFamily: f.family }}
                                  >
                                    Aa
                                  </span>
                                  <span className="truncate">{f.family}</span>
                                </SelectItem>
                              </div>
                            );
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </SelectContent>
        </Select>
      </section>

      {/* ---- Section 2: 실시간 미리보기 ---- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-fg">
            {t("settings.preview.title", "미리보기")}
          </h3>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs text-muted hover:bg-surface/80 hover:text-fg border border-transparent hover:border-border/60 transition-all shadow-2xs"
          >
            <RotateCcw className="h-3 w-3" />
            {t("settings.preview.reset", "기본값으로 초기화")}
          </button>
        </div>
        <div className="rounded-panel border border-border/60 bg-surface/40 backdrop-blur-md p-5 shadow-xs">
          <p style={previewStyle} className="text-fg transition-all">
            {t(
              "settings.preview.body1",
              "그는 오래된 서재 한편에 앉아, 먼지 앉은 원고 뭉치를 펼쳤다. 창밖엔 비가 내리고 있었고, 등장인물들의 목소리가 점차 또렷해졌다.",
            )}
          </p>
          <p
            style={{ ...previewStyle, marginTop: `${localParagraphSpacing}em` }}
            className="text-fg transition-all"
          >
            {t(
              "settings.preview.body2",
              "글이란 결국 사람의 목소리를 담는 그릇이다. 오늘도 한 문장, 한 문장씩 써 내려간다.",
            )}
          </p>
        </div>
      </section>

      {/* ---- Section 3: 주요 타이포그래피 컨트롤 ---- */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-fg">
          {t("settings.section.typography", "타이포그래피 조절")}
        </h3>

        {/* 글자 크기 */}
        <TypographySliderRow
          label={t("settings.section.fontSize", "글자 크기")}
          value={localFontSize}
          display={`${localFontSize}px`}
          min={12}
          max={32}
          step={1}
          presets={FONT_SIZE_PRESETS}
          formatPreset={formatPx}
          onChange={(v) => {
            onSetLocalFontSize(v);
            onApplySettings({ fontSize: v });
          }}
          decreaseAriaLabel={`${t("settings.section.fontSize", "글자 크기")} 감소`}
          increaseAriaLabel={`${t("settings.section.fontSize", "글자 크기")} 증가`}
        />

        {/* 줄 간격 */}
        <TypographySliderRow
          label={t("settings.section.lineHeight", "줄 간격")}
          value={localLineHeight}
          display={localLineHeight.toFixed(1)}
          min={1.2}
          max={2.4}
          step={0.1}
          presets={LINE_HEIGHT_PRESETS}
          formatPreset={formatFixed1}
          onChange={(v) => {
            const rounded = Number(v.toFixed(1));
            onSetLocalLineHeight(rounded);
            onApplySettings({ lineHeight: rounded });
          }}
          decreaseAriaLabel={`${t("settings.section.lineHeight", "줄 간격")} 감소`}
          increaseAriaLabel={`${t("settings.section.lineHeight", "줄 간격")} 증가`}
        />

        {/* ---- 세부 조절 (아코디언) ---- */}
        <div className="rounded-panel border border-border/70 bg-surface/50 backdrop-blur-md overflow-hidden transition-all shadow-xs">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="flex w-full items-center justify-between p-3.5 text-sm font-medium text-muted hover:text-fg hover:bg-surface/60 transition-colors"
          >
            <span className="flex items-center gap-2">
              {showAdvanced ? (
                <ChevronDown className="h-4 w-4 text-accent" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted" />
              )}
              {t("settings.section.advancedTypography", "세부 조절 (자간, 어간, 문단 간격)")}
            </span>
            <span className="text-xs text-subtle">
              {showAdvanced
                ? t("common.collapse", "접기")
                : t("common.expand", "펼치기")}
            </span>
          </button>

          {showAdvanced ? (
            <div className="space-y-3 p-4 pt-1 border-t border-border/60 bg-surface/70 backdrop-blur-md">
              <TypographySliderRow
                label={t("settings.section.letterSpacing", "자간")}
                value={localLetterSpacing}
                display={`${(localLetterSpacing * 100).toFixed(0)}%`}
                min={-0.05}
                max={0.3}
                step={0.01}
                presets={LETTER_SPACING_PRESETS}
                formatPreset={formatPercent}
                onChange={(v) => {
                  const rounded = Number(v.toFixed(2));
                  onSetLocalLetterSpacing(rounded);
                  onApplySettings({ letterSpacing: rounded });
                }}
                decreaseAriaLabel={`${t("settings.section.letterSpacing", "자간")} 감소`}
                increaseAriaLabel={`${t("settings.section.letterSpacing", "자간")} 증가`}
              />
              <TypographySliderRow
                label={t("settings.section.wordSpacing", "어간")}
                value={localWordSpacing}
                display={`${(localWordSpacing * 100).toFixed(0)}%`}
                min={0}
                max={0.2}
                step={0.01}
                presets={WORD_SPACING_PRESETS}
                formatPreset={formatPercent}
                onChange={(v) => {
                  const rounded = Number(v.toFixed(2));
                  onSetLocalWordSpacing(rounded);
                  onApplySettings({ wordSpacing: rounded });
                }}
                decreaseAriaLabel={`${t("settings.section.wordSpacing", "어간")} 감소`}
                increaseAriaLabel={`${t("settings.section.wordSpacing", "어간")} 증가`}
              />
              <TypographySliderRow
                label={t("settings.section.paragraphSpacing", "문단 간격")}
                value={localParagraphSpacing}
                display={`${localParagraphSpacing.toFixed(1)}em`}
                min={0}
                max={3.0}
                step={0.1}
                presets={PARAGRAPH_SPACING_PRESETS}
                formatPreset={formatEm}
                onChange={(v) => {
                  const rounded = Number(v.toFixed(1));
                  onSetLocalParagraphSpacing(rounded);
                  onApplySettings({ paragraphSpacing: rounded });
                }}
                decreaseAriaLabel={`${t("settings.section.paragraphSpacing", "문단 간격")} 감소`}
                increaseAriaLabel={`${t("settings.section.paragraphSpacing", "문단 간격")} 증가`}
              />
            </div>
          ) : null}
        </div>
      </section>

      {/* ---- Section 4: 집필 환경 ---- */}
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-fg">
          {t("settings.section.writingEnvironment", "집필 환경")}
        </h3>
        <ToggleCard
          label={t("settings.section.spellcheck", "맞춤법 검사")}
          description={t(
            "settings.spellcheck.description",
            "작성 중인 텍스트의 맞춤법 오류를 밑줄로 표시하고, 우클릭 시 교정 제안을 제공합니다.",
          )}
          checked={spellcheckEnabled}
          onChange={handleToggleSpellcheck}
          ariaLabel={t("settings.section.spellcheck", "맞춤법 검사")}
        />
        <ToggleCard
          label={t("settings.section.typewriterMode", "타자기 모드")}
          description={t(
            "settings.typewriterMode.description",
            "입력 위치를 화면 중앙 부근에 유지합니다.",
          )}
          checked={typewriterMode}
          onChange={handleToggleTypewriter}
          ariaLabel={t("settings.section.typewriterMode", "타자기 모드")}
        />
      </section>
    </div>
  );
});
