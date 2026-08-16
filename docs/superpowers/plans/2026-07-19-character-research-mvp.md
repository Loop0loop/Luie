# Character Research MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the real Character research panel without adding a parallel static UI.

**Architecture:** The existing `EntityGallery` stays the compact index and delegates selection through its existing callback to `WikiDetailView`. Styling uses the application token utilities and existing panel shell.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, lucide-react, react-resizable-panels.

## Global Constraints

- Do not modify `src/`, tests, or current save-integrity files.
- Do not add dependencies.
- Use tags as filters; use role/recency/current-episode context as the default information hierarchy.

---

### Task 1: Refactor the production gallery

**Files:**
- Modify: `src/renderer/src/features/research/components/wiki/EntityGallery.tsx`
- Modify: `src/renderer/src/features/research/components/wiki/WikiDetailView.tsx`
- Modify: `tests/dom/entityGallery.test.tsx`

**Interfaces:**
- Consumes: `EntityGallery`'s existing `groups`, `title`, `noDescriptionLabel`, `icon`, and `onSelect` props.
- Produces: a semantic button-based roster, local search, and the established route from a roster item to an in-panel wiki detail.

- [ ] **Step 1: Prove the production roster filters and selects**

The DOM test must type `closing`, hide `Opening`, and select the `data-entity-id="event-1"` button.

- [ ] **Step 2: Implement the smallest token-based production gallery**

Flatten caller grouping only for this panel view, render compact semantic buttons, and use the existing `onSelect` callback so the established `WikiDetailView` route remains unchanged.

- [ ] **Step 3: Remove decorative detail dividers**

Remove the per-character left color bar and internal divider rules from `WikiDetailView`; retain spacing and tokenized surfaces as the hierarchy.
