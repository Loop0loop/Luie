/**
 * nodeStyles.ts
 *
 * Canvas node colour tokens re-export for the inspector panel.
 * The canvas node component itself is colour-neutral; only this
 * shared token map keeps the kind → colour relationship alive.
 */

import { CANVAS_NODE_KIND_COLOUR } from "../types/canvasTokens";

// Re-export for backward compatibility — single source of truth
export { CANVAS_NODE_KIND_COLOUR };
