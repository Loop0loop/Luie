
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../../../shared/types/utils";
import { Eraser, PenTool, Type } from "lucide-react";

interface MapPath {
  d?: string;
  type: "path" | "text";
  color: string;
  width?: number;
  x?: number;
  y?: number;
  text?: string;
}

export function DrawingCanvas() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<"pen" | "text" | "eraser">("pen");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(2);
  const [paths, setPaths] = useState<MapPath[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);

  const colors = [
    "#000000",
    "#ef4444",
    "#3b82f6",
    "#22c55e",
    "#eab308",
    "#a855f7",
  ];
  const widths = [2, 4, 8, 16];

  const getCoords = (e: React.PointerEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (tool === "text") {
      const { x, y } = getCoords(e);
      const text = window.prompt(t("world.drawing.placePrompt"));
      if (text) {
        setPaths((prev) => [...prev, { type: "text", x, y, text, color }]);
      }
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const { x, y } = getCoords(e);
    setCurrentPath(`M ${x} ${y}`);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCoords(e);
    setCurrentPath((prev) => `${prev} L ${x} ${y}`);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (currentPath) {
      setPaths((prev) => [
        ...prev,
        { type: "path", d: currentPath, color, width: lineWidth },
      ]);
      setCurrentPath("");
    }
  };

  const clearCanvas = () => setPaths([]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Drawing Toolbar */}
      <div className="h-9 flex items-center px-4 gap-4 bg-panel border-b border-border shrink-0">
        <div
          style={{
            display: "flex",
            gap: 4,
            paddingRight: 12,
            borderRight: "1px solid var(--border-default)",
          }}
        >
          <button
            className={cn("w-7 h-7 flex items-center justify-center rounded text-muted hover:bg-hover hover:text-fg transition-colors", tool === "pen" && "bg-active text-accent")}
            onClick={() => setTool("pen")}
            title={t("world.drawing.toolPen")}
          >
            <PenTool className="icon-md" />
          </button>
          <button
            className={cn("w-7 h-7 flex items-center justify-center rounded text-muted hover:bg-hover hover:text-fg transition-colors", tool === "text" && "bg-active text-accent")}
            onClick={() => setTool("text")}
            title={t("world.drawing.toolText")}
          >
            <Type className="icon-md" />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            paddingRight: 12,
            borderRight: "1px solid var(--border-default)",
          }}
        >
          {colors.map((c) => (
            <div
              key={c}
              className={cn("w-5 h-5 rounded-full border border-border cursor-pointer hover:scale-110 transition-transform", color === c && "ring-2 ring-active ring-offset-2 ring-offset-panel")}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            paddingRight: 12,
            borderRight: "1px solid var(--border-default)",
          }}
        >
          {widths.map((w) => (
            <div
              key={w}
              onClick={() => setLineWidth(w)}
              style={{
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                opacity: lineWidth === w ? 1 : 0.4,
              }}
            >
              <div
                style={{
                  width: w,
                  height: w,
                  borderRadius: "50%",
                  background: "var(--text-primary)",
                }}
              />
            </div>
          ))}
        </div>

        <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-hover text-xs cursor-pointer text-muted hover:text-fg transition-colors" onClick={clearCanvas}>
          <Eraser className="icon-sm" /> {t("world.drawing.clear")}
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-app cursor-crosshair overflow-hidden" ref={canvasRef}>
        <svg
          style={{ width: "100%", height: "100%", touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {paths.map((p, i) => {
            if (p.type === "text") {
              return (
                <text
                  key={i}
                  x={p.x}
                  y={p.y}
                  fill={p.color}
                  style={{
                    userSelect: "none",
                    pointerEvents: "none",
                    fontSize: "var(--world-draw-text-font-size)",
                    fontWeight: "var(--world-draw-text-font-weight)",
                  }}
                >
                  {p.text}
                </text>
              );
            }
            return (
              <path
                key={i}
                d={p.d}
                stroke={p.color}
                strokeWidth={p.width}
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
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
