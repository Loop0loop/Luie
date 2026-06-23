import { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@shared/types/utils";
import {
  getVertex,
  buildGridPolygon,
  buildDataPolygon,
  getTextAnchor,
} from "./utils/radarGeometry";
import type { Point } from "./utils/radarGeometry";
import {
  type RadarAxis,
  RADAR_GRID_LEVELS,
  MAX_RADAR_VALUE,
  MIN_RADAR_AXES,
  MAX_RADAR_AXES,
} from "./types";

// ── EditableAxisLabel ─────────────────────────────────────────────────────

type EditableAxisLabelProps = {
  label: string;
  onCommit: (next: string) => void;
};

function EditableAxisLabel({ label, onCommit }: EditableAxisLabelProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== label) onCommit(trimmed);
    else setDraft(label);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(label);
            setEditing(false);
          }
        }}
        onBlur={commit}
        className="w-14 text-[11px] bg-transparent border-b border-accent/60 outline-none text-fg pb-0.5 shrink-0"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(label);
        setEditing(true);
      }}
      className="w-14 text-[11px] text-left text-muted hover:text-fg transition-colors truncate shrink-0"
    >
      {label}
    </button>
  );
}

// ── RadarChartSvg ─────────────────────────────────────────────────────────

type RadarChartSvgProps = {
  axes: RadarAxis[];
  color: string;
  size: number;
};

function RadarChartSvg({ axes, color, size }: RadarChartSvgProps) {
  const center: Point = { x: size / 2, y: size / 2 };
  const maxRadius = size * 0.36;
  const labelRadius = maxRadius + 22;
  const n = axes.length;

  const dataPolygon = buildDataPolygon(
    axes.map((a) => a.value),
    MAX_RADAR_VALUE,
    maxRadius,
    center,
  );

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-hidden="true"
    >
      {/* Grid rings */}
      {RADAR_GRID_LEVELS.map((level) => (
        <polygon
          key={level}
          points={buildGridPolygon(level, MAX_RADAR_VALUE, n, maxRadius, center)}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.07"
          strokeWidth="1"
        />
      ))}

      {/* Axis spokes */}
      {axes.map((_, i) => {
        const outer = getVertex(i, n, maxRadius, center);
        return (
          <line
            key={i}
            x1={center.x}
            y1={center.y}
            x2={outer.x}
            y2={outer.y}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="1"
          />
        );
      })}

      {/* Data fill */}
      <polygon
        points={dataPolygon}
        fill={color}
        fillOpacity="0.18"
        stroke={color}
        strokeWidth="1.5"
        strokeOpacity="0.85"
      />

      {/* Data dots */}
      {axes.map((axis, i) => {
        const pt = getVertex(
          i,
          n,
          (axis.value / MAX_RADAR_VALUE) * maxRadius,
          center,
        );
        return (
          <circle key={i} cx={pt.x} cy={pt.y} r="2.5" fill={color} opacity="0.9" />
        );
      })}

      {/* Axis labels */}
      {axes.map((axis, i) => {
        const lp = getVertex(i, n, labelRadius, center);
        return (
          <text
            key={i}
            x={lp.x}
            y={lp.y}
            textAnchor={getTextAnchor(lp.x, center.x)}
            dominantBaseline="middle"
            fontSize="10"
            fill="currentColor"
            opacity="0.5"
            className="select-none pointer-events-none"
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}

// ── AxisEditor ────────────────────────────────────────────────────────────

type AxisEditorProps = {
  axes: RadarAxis[];
  color: string;
  onChange: (axes: RadarAxis[]) => void;
};

function AxisEditor({ axes, color, onChange }: AxisEditorProps) {
  const patch = (index: number, partial: Partial<RadarAxis>) =>
    onChange(axes.map((a, i) => (i === index ? { ...a, ...partial } : a)));

  const remove = (index: number) => {
    if (axes.length <= MIN_RADAR_AXES) return;
    onChange(axes.filter((_, i) => i !== index));
  };

  const add = () => {
    if (axes.length >= MAX_RADAR_AXES) return;
    onChange([...axes, { label: "새 축", value: 5 }]);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {axes.map((axis, i) => (
        <div key={i} className="group/axis flex items-center gap-2">
          <EditableAxisLabel
            label={axis.label}
            onCommit={(label) => patch(i, { label })}
          />
          <input
            type="range"
            min={0}
            max={MAX_RADAR_VALUE}
            step={1}
            value={axis.value}
            onChange={(e) => patch(i, { value: Number(e.target.value) })}
            style={{ accentColor: color }}
            className="flex-1 h-1 cursor-pointer"
          />
          <span className="w-3 text-right shrink-0 text-[11px] text-muted">
            {axis.value}
          </span>
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={axes.length <= MIN_RADAR_AXES}
            className={cn(
              "shrink-0 transition-opacity",
              axes.length <= MIN_RADAR_AXES
                ? "opacity-0 pointer-events-none"
                : "opacity-0 group-hover/axis:opacity-100 text-muted hover:text-destructive",
            )}
          >
            <X size={10} />
          </button>
        </div>
      ))}

      {axes.length < MAX_RADAR_AXES && (
        <button
          type="button"
          onClick={add}
          className="self-start flex items-center gap-1 text-[11px] text-muted/50 hover:text-accent transition-colors mt-1"
        >
          <Plus size={10} />
          축 추가
        </button>
      )}
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────

export type { RadarAxis };

type RadarChartProps = {
  axes: RadarAxis[];
  color?: string;
  size?: number;
  /** When provided, renders the axis editor below the chart. */
  onAxesChange?: (axes: RadarAxis[]) => void;
};

export function RadarChart({
  axes,
  color = DEFAULT_CHARACTER_COLOR,
  size = 200,
  onAxesChange,
}: RadarChartProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <RadarChartSvg axes={axes} color={color} size={size} />
      {onAxesChange && (
        <AxisEditor axes={axes} color={color} onChange={onAxesChange} />
      )}
    </div>
  );
}

// import kept at bottom to avoid circular — value comes from types.ts
import { DEFAULT_CHARACTER_COLOR } from "./types";
