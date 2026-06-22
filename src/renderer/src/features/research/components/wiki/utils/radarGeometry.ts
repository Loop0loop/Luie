/**
 * Pure geometry utilities for SVG radar charts.
 * No React, no side-effects — safe to test in isolation.
 */

export type Point = { readonly x: number; readonly y: number };

const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI / 2;

// ── Core math ─────────────────────────────────────────────────────────────

/** Convert polar coordinates to Cartesian relative to a center point. */
export const polarToCartesian = (
  angle: number,
  radius: number,
  center: Point,
): Point => ({
  x: center.x + radius * Math.cos(angle),
  y: center.y + radius * Math.sin(angle),
});

/** Angle (radians) for the n-th vertex of a regular polygon, starting at top. */
const vertexAngle = (index: number, total: number): number =>
  (index / total) * TWO_PI - HALF_PI;

/** Cartesian position of the n-th vertex on a circle. */
export const getVertex = (
  index: number,
  total: number,
  radius: number,
  center: Point,
): Point => polarToCartesian(vertexAngle(index, total), radius, center);

/** Serialize points to the SVG `polygon/polyline` `points` attribute format. */
export const toSvgPoints = (points: Point[]): string =>
  points.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

// ── Derived builders ──────────────────────────────────────────────────────

/** Build the SVG polygon string for a single grid level ring. */
export const buildGridPolygon = (
  level: number,
  maxLevel: number,
  axisCount: number,
  maxRadius: number,
  center: Point,
): string => {
  const r = (level / maxLevel) * maxRadius;
  return toSvgPoints(
    Array.from({ length: axisCount }, (_, i) =>
      getVertex(i, axisCount, r, center),
    ),
  );
};

/** Build the SVG polygon string from a list of axis values. */
export const buildDataPolygon = (
  values: number[],
  maxValue: number,
  maxRadius: number,
  center: Point,
): string =>
  toSvgPoints(
    values.map((v, i) =>
      getVertex(i, values.length, (v / maxValue) * maxRadius, center),
    ),
  );

/**
 * Determine SVG `text-anchor` based on x position relative to center.
 * Used to anchor axis labels away from the chart.
 */
export const getTextAnchor = (
  x: number,
  centerX: number,
): "start" | "middle" | "end" => {
  if (x < centerX - 5) return "end";
  if (x > centerX + 5) return "start";
  return "middle";
};
