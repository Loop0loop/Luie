import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../../../shared/types/utils";
import { Eraser, PenTool, Type, Map as MapIcon, Navigation, Mountain, Castle, Tent } from "lucide-react";
import { useProjectStore } from "../../../stores/projectStore";
import { DEFAULT_WORLD_DRAWING, worldPackageStorage } from "../../../services/worldPackageStorage";
import type { WorldDrawingPath } from "../../../../../shared/types";
import { useDialog } from "../../common/DialogProvider";

export function DrawingCanvas() {
  const { t } = useTranslation();
  const dialog = useDialog();
  const { currentItem: currentProject } = useProjectStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<"pen" | "text" | "eraser" | "icon">(
    DEFAULT_WORLD_DRAWING.tool ?? "pen",
  );
  const [iconType, setIconType] = useState<"mountain" | "castle" | "village">(
    DEFAULT_WORLD_DRAWING.iconType ?? "mountain",
  );
  const [color, setColor] = useState(DEFAULT_WORLD_DRAWING.color ?? "#000000");
  const [lineWidth, setLineWidth] = useState(DEFAULT_WORLD_DRAWING.lineWidth ?? 2);
  const [paths, setPaths] = useState<WorldDrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const hydratedProjectIdRef = useRef<string | null>(null);

  // Fantasy Map Colors
  const colors = [
    "#000000", // Ink
    "#8B4513", // Road/Earth
    "#2E8B57", // Forest/Region
    "#4682B4", // Water/River
    "#A52A2A", // Border/danger
    "#808080", // Stone/Mountains
  ];
  const widths = [2, 4, 8, 16];

  useEffect(() => {
    if (!currentProject?.id) {
      hydratedProjectIdRef.current = null;
      return;
    }

    let cancelled = false;
    void (async () => {
      const loaded = await worldPackageStorage.loadDrawing(
        currentProject.id,
        currentProject.projectPath,
      );
      if (cancelled) return;
      setPaths(loaded.paths);
      setTool(loaded.tool ?? "pen");
      setIconType(loaded.iconType ?? "mountain");
      setColor(loaded.color ?? "#000000");
      setLineWidth(loaded.lineWidth ?? 2);
      hydratedProjectIdRef.current = currentProject.id;
    })();

    return () => {
      cancelled = true;
    };
  }, [currentProject?.id, currentProject?.projectPath]);

  useEffect(() => {
    if (!currentProject?.id) return;
    if (hydratedProjectIdRef.current !== currentProject.id) return;
    const timer = window.setTimeout(() => {
      void worldPackageStorage.saveDrawing(currentProject.id, currentProject.projectPath, {
        paths,
        tool,
        iconType,
        color,
        lineWidth,
      });
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    paths,
    tool,
    iconType,
    color,
    lineWidth,
    currentProject?.id,
    currentProject?.projectPath,
  ]);

  const getCoords = (e: React.PointerEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const { x, y } = getCoords(e);

    if (tool === "text") {
      void (async () => {
        const text = await dialog.prompt({
          title: t("world.drawing.toolText"),
          message: t("world.drawing.placePrompt"),
          defaultValue: "",
          placeholder: t("world.drawing.placePrompt"),
        });
        if (!text?.trim()) return;
        setPaths((prev) => [
          ...prev,
          { id: Date.now().toString(), type: "text", x, y, text: text.trim(), color },
        ]);
      })();
      return;
    }

    if (tool === "icon") {
        setPaths((prev) => [...prev, { id: Date.now().toString(), type: "icon", x, y, icon: iconType, color }]);
        return;
    }

    if (tool === "eraser") {
        // Eraser logic would go here (simple clear for now in MVP or hit test)
        // For MVP, just treating as "no-op" or we could implement clear
        return; 
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
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
        { id: Date.now().toString(), type: "path", d: currentPath, color, width: lineWidth },
      ]);
      setCurrentPath("");
    }
  };

  const undo = () => setPaths((prev) => prev.slice(0, -1));
  const clearCanvas = () => {
    void (async () => {
      const confirmed = await dialog.confirm({
        title: t("world.drawing.clear"),
        message: t("world.drawing.confirmClear"),
        isDestructive: true,
      });
      if (!confirmed) return;
      setPaths([]);
    })();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#f4f1ea] dark:bg-zinc-900 relative overflow-hidden transition-colors duration-500">
      {/* Paper Texture Overlay - Light/Dark handling */}
      <div className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-20 dark:invert" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.1'/%3E%3C/svg%3E")` }} 
      />

      {/* Floating Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 p-2 bg-panel/90 backdrop-blur-md border border-border rounded-xl shadow-lg">
          <div className="flex flex-col gap-2 border-b border-border/50 pb-2">
            <button
                className={cn("w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hover hover:text-fg transition-colors", tool === "pen" && "bg-accent text-accent-foreground")}
                onClick={() => setTool("pen")}
                title={t("world.drawing.toolPen")}
            >
                <PenTool className="w-5 h-5" />
            </button>
            <button
                className={cn("w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hover hover:text-fg transition-colors", tool === "icon" && "bg-accent text-accent-foreground")}
                onClick={() => setTool("icon")}
                title={t("world.drawing.toolIcon")}
            >
                <MapIcon className="w-5 h-5" />
            </button>
            <button
                className={cn("w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hover hover:text-fg transition-colors", tool === "text" && "bg-accent text-accent-foreground")}
                onClick={() => setTool("text")}
                title={t("world.drawing.toolText")}
            >
                <Type className="w-5 h-5" />
            </button>
          </div>

          {/* Sub-tools for Icons */}
          {tool === "icon" && (
             <div className="flex flex-col gap-2 border-b border-border/50 pb-2 animate-in slide-in-from-left-2 fade-in">
                 <button onClick={() => setIconType("mountain")} className={cn("w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hover", iconType === "mountain" && "bg-active/20 text-active")}>
                     <Mountain className="w-5 h-5" />
                 </button>
                 <button onClick={() => setIconType("castle")} className={cn("w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hover", iconType === "castle" && "bg-active/20 text-active")}>
                     <Castle className="w-5 h-5" />
                 </button>
                 <button onClick={() => setIconType("village")} className={cn("w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hover", iconType === "village" && "bg-active/20 text-active")}>
                     <Tent className="w-5 h-5" />
                 </button>
             </div>
          )}

          {/* Colors */}
          <div className="grid grid-cols-2 gap-2 p-1">
              {colors.map((c) => (
                <div
                key={c}
                className={cn("w-4 h-4 rounded-full border border-border cursor-pointer hover:scale-110 transition-transform", color === c && "ring-2 ring-accent")}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                />
             ))}
          </div>

           {/* Widths */}
           <div className="flex flex-col gap-2 items-center py-2 border-t border-border/50 mt-1">
              {widths.map((w) => (
                <div
                  key={w}
                  onClick={() => setLineWidth(w)}
                  className={cn("w-6 h-6 flex items-center justify-center rounded hover:bg-hover cursor-pointer", lineWidth === w && "bg-active/10")}
                >
                  <div style={{ width: w, height: w, borderRadius: "50%", backgroundColor: "currentColor" }} className="text-fg" />
                </div>
              ))}
           </div>
          
           <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
             <button className="w-10 h-10 flex items-center justify-center rounded-lg text-muted hover:text-error hover:bg-error/10" onClick={undo} title={t("common.undo")}>
                <Navigation className="w-5 h-5 -rotate-90" />
             </button>
             <button className="w-10 h-10 flex items-center justify-center rounded-lg text-muted hover:text-error hover:bg-error/10" onClick={clearCanvas} title={t("common.clear")}>
                <Eraser className="w-5 h-5" />
             </button>
           </div>
      </div>

      {/* Canvas */}
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
      
      {/* Footer Info */}
      <div className="absolute bottom-4 right-4 text-[10px] text-[#8B4513] opacity-50 font-serif select-none pointer-events-none">
          {t("world.drawing.mapMakerMode")}
      </div>
    </div>
  );
}
