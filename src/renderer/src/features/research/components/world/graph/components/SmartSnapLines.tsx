import { memo } from 'react';
import { useStore } from 'reactflow';
import type { SnapLine, SnapGap } from '../hooks/useSmartSnap';

interface SmartSnapLinesProps {
  lines: SnapLine[];
  gaps?: SnapGap[];
}

export const SmartSnapLines = memo(({ lines, gaps = [] }: SmartSnapLinesProps) => {
  const transform = useStore((s) => s.transform);

  if (lines.length === 0 && gaps.length === 0) return null;

  const [tX, tY, tZoom] = transform;

  // Figma/Obsidian snap line UI
  const SNAP_COLOR = "#ec4899"; // Accent color for guides
  const strokeWidth = 1.5 / tZoom;
  const crossSize = 5 / tZoom;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      <g transform={`translate(${tX}, ${tY}) scale(${tZoom})`}>
        {lines.map((line) => {
          const isX = line.type.includes('x');
          const p = line.value;
          const start = line.start ?? -5000;
          const end = line.end ?? 5000;
          const isCenter = line.type.includes('center');

          return (
            <g key={line.id}>
              {isX ? (
                <>
                  <line
                    x1={p} y1={start}
                    x2={p} y2={end}
                    stroke={SNAP_COLOR}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isCenter ? 'none' : `${4 / tZoom},${4 / tZoom}`}
                    opacity={isCenter ? 0.9 : 0.7}
                  />
                  {/* Plus cross marks at the snap intersections */}
                  <line x1={p - crossSize} y1={start} x2={p + crossSize} y2={start} stroke={SNAP_COLOR} strokeWidth={strokeWidth} opacity={0.8} />
                  <line x1={p - crossSize} y1={end} x2={p + crossSize} y2={end} stroke={SNAP_COLOR} strokeWidth={strokeWidth} opacity={0.8} />
                </>
              ) : (
                <>
                  <line
                    x1={start} y1={p}
                    x2={end} y2={p}
                    stroke={SNAP_COLOR}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isCenter ? 'none' : `${4 / tZoom},${4 / tZoom}`}
                    opacity={isCenter ? 0.9 : 0.7}
                  />
                  {/* Plus cross marks at the snap intersections */}
                  <line x1={start} y1={p - crossSize} x2={start} y2={p + crossSize} stroke={SNAP_COLOR} strokeWidth={strokeWidth} opacity={0.8} />
                  <line x1={end} y1={p - crossSize} x2={end} y2={p + crossSize} stroke={SNAP_COLOR} strokeWidth={strokeWidth} opacity={0.8} />
                </>
              )}
            </g>
          );
        })}
        
        {/* Render intelligent gap spaces */}
        {gaps.map((gap) => {
          const mx = (gap.startX + gap.endX) / 2;
          const my = (gap.startY + gap.endY) / 2;
          
          return (
            <g key={gap.id}>
              <line 
                x1={gap.startX} y1={gap.startY} 
                x2={gap.endX} y2={gap.endY} 
                stroke={SNAP_COLOR} 
                strokeWidth={strokeWidth}
              />
              {/* Arrow ends */}
              {gap.axis === 'x' ? (
                 <>
                   <line x1={gap.startX} y1={gap.startY - crossSize} x2={gap.startX} y2={gap.startY + crossSize} stroke={SNAP_COLOR} strokeWidth={strokeWidth} />
                   <line x1={gap.endX} y1={gap.endY - crossSize} x2={gap.endX} y2={gap.endY + crossSize} stroke={SNAP_COLOR} strokeWidth={strokeWidth} />
                 </>
              ) : (
                 <>
                   <line x1={gap.startX - crossSize} y1={gap.startY} x2={gap.startX + crossSize} y2={gap.startY} stroke={SNAP_COLOR} strokeWidth={strokeWidth} />
                   <line x1={gap.endX - crossSize} y1={gap.endY} x2={gap.endX + crossSize} y2={gap.endY} stroke={SNAP_COLOR} strokeWidth={strokeWidth} />
                 </>
              )}
              {/* Distance Pill */}
              <text
                x={mx}
                y={my + (4 / tZoom)}
                fill={SNAP_COLOR}
                fontSize={10 / tZoom}
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  stroke: "white",
                  strokeWidth: 3 / tZoom,
                  paintOrder: "stroke"
                }}
              >
                {Math.round(gap.gapValue)}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
});

SmartSnapLines.displayName = "SmartSnapLines";
