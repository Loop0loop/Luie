export type Point = { readonly x: number; readonly y: number };

const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI / 2;

export const polarToCartesian = (
  angle: number,
  radius: number,
  center: Point,
): Point => ({
  x: center.x + radius * Math.cos(angle),
  y: center.y + radius * Math.sin(angle),
});

const vertexAngle = (index: number, total: number): number =>
  (index / total) * TWO_PI - HALF_PI;

export const getVertex = (
  index: number,
  total: number,
  radius: number,
  center: Point,
): Point => polarToCartesian(vertexAngle(index, total), radius, center);

export const toSvgPoints = (points: Point[]): string =>
  points.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

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

export const getTextAnchor = (
  x: number,
  centerX: number,
): "start" | "middle" | "end" => {
  if (x < centerX - 5) return "end";
  if (x > centerX + 5) return "start";
  return "middle";
};
