import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "../../../stores/projectStore";
import { DEFAULT_WORLD_DRAWING, worldPackageStorage } from "../../../services/worldPackageStorage";
import type { WorldDrawingPath } from "../../../../../shared/types";
import { useDialog } from "../../common/DialogProvider";

export function useDrawingCanvas({ canvasRef }: { canvasRef: React.RefObject<HTMLDivElement | null> }) {
    const { t } = useTranslation();
    const dialog = useDialog();
    const { currentItem: currentProject } = useProjectStore();

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

    return {
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
    };
}
