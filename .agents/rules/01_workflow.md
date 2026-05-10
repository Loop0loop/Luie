---
trigger: always_on
---

# Luie — Workflow

## Before Every Task

### 1. Explore the codebase first

- Check the full directory structure
- Search for existing components related to the task
- Find existing stores, hooks, and services
- Identify available preload bridge APIs

Do not create anything before completing this step.

### 2. Define the scope

Answer these before writing a single line:

| Question | Answer |
|----------|--------|
| What is the user trying to do? | |
| What is the primary action? | |
| What is the information hierarchy? | |
| Which existing components can be reused? | |
| Where does the data come from? | |
| What states does this UI need? | |
| Does this touch the Electron/preload boundary? | |

### 3. When uncertain — stop

If you are unsure about structure, APIs, or existing behavior:
- Say: "I need to check [filename] before proceeding."
- Do not guess.
- Do not assume a preload API exists if you haven't confirmed it.

---

## After Every Task

Always report the following after completing work:
Files changed:
UI/UX intent:
Architecture compliance:
Components reused:
Components created (with reason):
Tailwind tokens used:
Assumptions made:
Remaining TODOs:

Never end with just "Done." or "Completed."