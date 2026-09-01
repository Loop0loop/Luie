import { useRef } from "react";
import { cn } from "@shared/types/utils";
import { Eraser, PenTool, Type, Map as MapIcon, Navigation, Mountain, Castle, Tent } from "lucide-react";
import { useDrawingCanvas } from "@renderer/features/research/components/world/useDrawingCanvas";

const colors = [
  { hex: "#000000", key: "colorInk" },
  { hex: "#8B4513", key: "colorEarth" },
  { hex: "#2E8B57", key: "colorForest" },
  { hex: "#4682B4", key: "colorWater" },
  { hex: "#A52A2A", key: "colorDanger" },
  { hex: "#808080", key: "colorStone" },
] as const;
const widths = [2, 4, 8, 16];

/* NOTE: 이 팔레트의 접근성 문제 3종을 함께 고친다(§11-6에서 분리한 항목).
   ① 색·굵기 선택이 `<div onClick>`이라 **키보드로 도달할 수 없었다**
   ② 아이콘 종류 버튼(산·성·마을)에 `title`도 `aria-label`도 없어 스크린리더가 이름 없는
      버튼으로 읽었다 — priority 1 안티패턴이다
   ③ 네 그룹 모두 상호배타 선택인데 그 관계가 노출되지 않았고 focus 표시도 없었다

   `role="radiogroup"`/`radio`가 의미상 가장 정확하지만 단일 tab stop + 화살표 이동을
   요구한다. 도구 팔레트는 각 버튼에 개별 접근하는 편이 실사용에 맞으므로
   `role="group"` + `aria-pressed` 조합으로 둔다 — 그래픽 편집기 툴바의 통상 패턴이다. */
const TOOL_BUTTON_CLASS =
  "w-10 h-10 flex items-center justify-center rounded-panel transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring";

export function DrawingCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);

  const {
    t,
    tool,
    setTool,
    iconType,
    setIconType,
    color,
    setColor,
    lineWidth,
    setLineWidth,
    paths,
    currentPath,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    undo,
    clearCanvas,
  } = useDrawingCanvas({ canvasRef });

  return (
    <div className="h-full flex flex-col bg-[var(--drawing-paper-bg)] dark:bg-zinc-900 relative overflow-hidden transition-colors duration-500">
      <div className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-20 dark:invert"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.1'/%3E%3C/svg%3E")` }}
      />

      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 p-2 bg-panel/90 backdrop-blur-md border border-border rounded-panel shadow-panel">
        <div
          className="flex flex-col gap-2 border-b border-border pb-2"
          role="group"
          aria-label={t("world.drawing.groupTool")}
        >
          <button
            type="button"
            className={cn(TOOL_BUTTON_CLASS, "hover:bg-hover hover:text-fg", tool === "pen" && "bg-accent text-accent-fg")}
            onClick={() => setTool("pen")}
            title={t("world.drawing.toolPen")}
            aria-label={t("world.drawing.toolPen")}
            aria-pressed={tool === "pen"}
          >
            <PenTool className="w-5 h-5" />
          </button>
          <button
            type="button"
            className={cn(TOOL_BUTTON_CLASS, "hover:bg-hover hover:text-fg", tool === "icon" && "bg-accent text-accent-fg")}
            onClick={() => setTool("icon")}
            title={t("world.drawing.toolIcon")}
            aria-label={t("world.drawing.toolIcon")}
            aria-pressed={tool === "icon"}
          >
            <MapIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            className={cn(TOOL_BUTTON_CLASS, "hover:bg-hover hover:text-fg", tool === "text" && "bg-accent text-accent-fg")}
            onClick={() => setTool("text")}
            title={t("world.drawing.toolText")}
            aria-label={t("world.drawing.toolText")}
            aria-pressed={tool === "text"}
          >
            <Type className="w-5 h-5" />
          </button>
        </div>

        {tool === "icon" && (
          <div
            className="flex flex-col gap-2 border-b border-border pb-2 animate-in slide-in-from-left-2 fade-in"
            role="group"
            aria-label={t("world.drawing.groupIcon")}
          >
            {(
              [
                ["mountain", Mountain, "iconMountain"],
                ["castle", Castle, "iconCastle"],
                ["village", Tent, "iconVillage"],
              ] as const
            ).map(([value, Icon, labelKey]) => {
              const label = t(`world.drawing.${labelKey}`);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setIconType(value)}
                  title={label}
                  aria-label={label}
                  aria-pressed={iconType === value}
                  className={cn(TOOL_BUTTON_CLASS, "hover:bg-hover", iconType === value && "bg-active/20 text-active")}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        )}

        <div
          className="grid grid-cols-2 gap-2 p-1"
          role="group"
          aria-label={t("world.drawing.groupColor")}
        >
          {colors.map(({ hex, key }) => {
            const label = t(`world.drawing.${key}`);
            return (
              <button
                key={hex}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={color === hex}
                className={cn(
                  "w-4 h-4 rounded-full border border-border cursor-pointer hover:scale-110 transition-transform focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-panel",
                  color === hex && "ring-2 ring-accent",
                )}
                style={{ backgroundColor: hex }}
                onClick={() => setColor(hex)}
              />
            );
          })}
        </div>

        <div
          className="flex flex-col gap-2 items-center py-2 border-t border-border mt-1"
          role="group"
          aria-label={t("world.drawing.groupWidth")}
        >
          {widths.map((w) => {
            const label = t("world.drawing.widthValue", { value: w });
            return (
              <button
                key={w}
                type="button"
                onClick={() => setLineWidth(w)}
                title={label}
                aria-label={label}
                aria-pressed={lineWidth === w}
                className={cn(
                  "w-6 h-6 flex items-center justify-center rounded-control hover:bg-hover cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                  lineWidth === w && "bg-active/10",
                )}
              >
                <div style={{ width: w, height: w, borderRadius: "50%", backgroundColor: "currentColor" }} className="text-fg" />
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <button
            type="button"
            className={cn(TOOL_BUTTON_CLASS, "text-muted hover:text-error hover:bg-error/10")}
            onClick={undo}
            title={t("undo")}
            aria-label={t("undo")}
          >
            <Navigation className="w-5 h-5 -rotate-90" />
          </button>
          <button
            type="button"
            className={cn(TOOL_BUTTON_CLASS, "text-muted hover:text-error hover:bg-error/10")}
            onClick={clearCanvas}
            title={t("clear")}
            aria-label={t("clear")}
          >
            <Eraser className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 cursor-crosshair overflow-hidden touch-none" ref={canvasRef}>
        <svg
          style={{ width: "100%", height: "100%", display: "block" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {paths.map((p) => {
            if (p.type === "text") {
              return (
                <text
                  key={p.id}
                  x={p.x}
                  y={p.y}
                  fill={p.color}
                  style={{
                    userSelect: "none",
                    pointerEvents: "none",
                    fontFamily: "serif",
                    fontWeight: "bold",
                    fontSize: "20px",
                    textShadow: "0 1px 2px rgba(255,255,255,0.8)"
                  }}
                >
                  {p.text}
                </text>
              );
            }
            if (p.type === "icon") {
              let IconComp = Mountain;
              if (p.icon === "castle") IconComp = Castle;
              if (p.icon === "village") IconComp = Tent;

              return (
                <g key={p.id} transform={`translate(${p.x! - 12}, ${p.y! - 12})`}>
                  <IconComp className="w-6 h-6" color={p.color} />
                </g>
              )
            }
            return (
              <path
                key={p.id}
                d={p.d}
                stroke={p.color}
                strokeWidth={p.width}
                strokeOpacity={0.8}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
          {currentPath && (
            <path
              d={currentPath}
              stroke={color}
              strokeWidth={lineWidth}
              strokeOpacity={0.8}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>

      <div className="absolute bottom-4 right-4 text-[10px] text-[var(--drawing-ink-signature)] opacity-50 font-serif select-none pointer-events-none">
        {t("world.drawing.mapMakerMode")}
      </div>
    </div>
  );
}
