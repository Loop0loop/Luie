---
trigger: always_on
---

# Luie — Accessibility

## Semantic HTML

✅ <button> for clickable actions
✅ <input> with associated <label>
✅ <nav> for navigation regions
✅ <main> for primary content

❌ <div onClick={...}> instead of <button>
❌ <span> used as a button
❌ <input> without a label or aria-label

---

## Focus and Keyboard

- All interactive elements must have visible focus states
- Do not remove focus outlines with outline-none unless replaced with a custom style
- Users must be able to navigate the full UI with keyboard only
- Tab order must follow visual reading order

---

## Contrast

- Body text against background: minimum 4.5:1
- Large text / UI labels: minimum 3:1
- Active / selected states must be distinguishable without color alone

---

## Interactive Targets

- Minimum click target: 32×32px
- Prefer 40×40px or larger for frequently used actions
- Do not place interactive elements too close together

---

## ARIA

Use ARIA attributes only when semantic HTML is insufficient.

✅ <button aria-label="챕터 삭제">
✅ <nav aria-label="작품 탐색">

❌ <div role="button">  ← use real <button>
❌ aria-label on everything regardless of need