# Character Research MVP Design

## Goal

Make the first Character view restore a web-novel writer's working context in seconds, rather than make them manage category sections.

## Scope

- Deliver the panel experience through the real React components only.
- Use Tailwind semantic token utilities, lucide-react, and the existing resizable panel system.
- Do not change persistence or current save-integrity work.

## Panel Constraint

The production `ResearchPanel` is rendered as a resizable sibling panel beside the editor (and is also used in binder and Google Docs side panels). It does not receive active chapter context today. The panel prototype therefore cannot claim current-chapter mentions until that data is deliberately supplied through a later memory integration.

The panel is an index and launch surface, not a second editor or a nested three-column workspace.

## Information Architecture

1. The future full workspace default, `작업 중`, contains the characters relevant to the open episode, with manually pinned characters as a fallback until memory-backed mentions are available.
2. The current implementation-aligned panel default contains `고정됨`, `최근 편집`, then the compact complete roster. It uses only data already owned by character records.
3. `전체 인물` supports filters and sorting, but does not permanently divide the page into tag sections.
4. `관계` is a separate destination for the graph; the roster is not a graph substitute.

## Decisions

- Tags are filters, not page sections.
- Era belongs to a future timeline view, not the default roster.
- 가나다순 is a roster sort option; the default sort is recent work.
- Images are optional. An identity block uses initials, name, narrative role, affiliation, and last appearance when no image exists.
- The real panel consumes Luie's `global.tokens.css`: one muted-brass accent, recessed editor surface, semantic background and text tokens, and tokenized radii.
- Selecting a roster entry opens the existing `WikiDetailView` route.

## Prototype Success Criteria

- No oversized empty image cards or horizontal category dividers.
- A writer can identify the current-episode cast, recent edits, and complete roster without leaving the screen.
- The left navigation, context panel, and main content read as one workspace through shared surface, type scale, and spacing.
