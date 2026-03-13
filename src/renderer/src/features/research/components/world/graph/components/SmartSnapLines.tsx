import { useStore } from 'reactflow';
import type { SnapLine } from '../hooks/useSmartSnap';

export const SmartSnapLines = ({ lines }: { lines: SnapLine[] }) => {
  const transform = useStore((s) => s.transform);

  if (!lines.length) return null;

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
      <g transform={`translate(${transform[0]}, ${transform[1]}) scale(${transform[2]})`}>
        {lines.map((line) => {
          if (line.type.includes('x')) {
            return (
              <line
                key={line.id}
                x1={line.value}
                y1={-10000}
                x2={line.value}
                y2={10000}
                stroke="#ec4899"
                strokeWidth={1.5 / transform[2]}
                strokeDasharray={`${4 / transform[2]},${4 / transform[2]}`}
              />
            );
          } else {
            return (
              <line
                key={line.id}
                x1={-10000}
                y1={line.value}
                x2={10000}
                y2={line.value}
                stroke="#ec4899"
                strokeWidth={1.5 / transform[2]}
                strokeDasharray={`${4 / transform[2]},${4 / transform[2]}`}
              />
            );
          }
        })}
      </g>
    </svg>
  );
};
