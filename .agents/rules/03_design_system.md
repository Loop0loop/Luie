---
trigger: always_on
---

# Luie — Design System

## Visual Direction

Luie must feel like a calm, focused desktop productivity app.

Reference feeling:
- Scrivener
- Obsidian
- Notion desktop
- Apple Notes
- VS Code sidebar

Avoid:
- Generic SaaS dashboard aesthetics
- Landing page hero sections
- Crypto / admin panel style
- Colorful decorative Tailwind templates
- Unnecessary gradients, glow effects, or drop shadows

---

## Tailwind Tokens

Always use semantic design tokens. Never use raw color values.

### Correct
bg-background
bg-card
bg-muted
text-foreground
text-muted-foreground
border-border
ring-ring

### Forbidden
bg-blue-500       // raw color
text-purple-400   // raw color
bg-gradient-to-r  // decorative gradient
shadow-2xl        // excessive shadow

---

## Spacing

Use consistent scale:
gap-2, gap-3, gap-4
p-3, p-4
px-4, py-2

Avoid arbitrary values unless there is a precise layout reason:
w-[347px]
mt-[13px]
h-[91px]

---

## Typography

| Role | Classes |
|------|---------|
| Page title | text-xl or text-2xl font-semibold |
| Section title | text-sm font-medium or text-base font-semibold |
| Body | text-sm |
| Metadata / caption | text-xs text-muted-foreground |

Do not over-enlarge text in dense desktop UI.
Readable hierarchy matters more than dramatic size differences.

---

## Layout Patterns

Preferred patterns for desktop productivity:
- sidebar + content
- sidebar + list + editor
- split pane
- inspector panel (right side)
- toolbar + editor
- tree / list / detail

For writing screens specifically:
- Editor focus comes first — it must be the visual center
- Navigation is accessible but not visually dominant
- Metadata and tools are secondary
- Long-form text readability matters more than visual decoration

---

## UI States

Every UI component must handle:

| State | Required |
|-------|----------|
| Default | ✅ |
| Loading | ✅ |
| Empty | ✅ |
| Error | ✅ |
| Selected | ✅ |
| Disabled | ✅ |

Do not assume data always exists.
Do not crash on empty arrays or null values.