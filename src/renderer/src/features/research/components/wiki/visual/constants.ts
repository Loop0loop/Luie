/**
 * Visual constants for entity kinds (Character / Event / Faction).
 *
 * Single source of truth for:
 * - colour tints (used in nodes, badges, edges)
 * - icon mapping
 * - i18n key mapping (labels resolved by consumers via `t()`)
 */

import { Calendar, Shield, User, type LucideIcon } from "lucide-react";
import type { EntityKind } from "./types";

export const ENTITY_KIND_TINT: Record<EntityKind, string> = {
  character: "#60a5fa",
  event: "#f87171",
  faction: "#a78bfa",
};

export const ENTITY_KIND_ICON: Record<EntityKind, LucideIcon> = {
  character: User,
  event: Calendar,
  faction: Shield,
};

/** i18n keys resolved via `useTranslation()` */
export const ENTITY_KIND_LABEL_KEY: Record<EntityKind, string> = {
  character: "entityVisual.kind.character",
  event: "entityVisual.kind.event",
  faction: "entityVisual.kind.faction",
};

/** Layout constants for the relation graph */
export const RELATION_GRAPH = {
  CANVAS_HEIGHT: 420,
  CENTER_X: 280,
  CENTER_Y: 200,
  SATELLITE_RADIUS: 175,
  MIN_ZOOM: 0.6,
  MAX_ZOOM: 1.4,
  FIT_PADDING: 0.18,
} as const;
