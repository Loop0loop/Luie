---
trigger: always_on
---

# Package
use pnpm not npm

# Prompot Language
Always answer in Korean



# Code Style Guide

This document defines the **mandatory coding standards** for this project.
All contributors (including AI-assisted code generation) **must comply** with these rules.

Failure to follow this guide is considered a **blocking issue** in code review.

---

## 1. Project Structure Compliance

### Rule

All code **must respect the existing project structure**.

Before writing any code:

* Scan the repository structure
* Identify existing conventions
* Follow them exactly

Typical structure examples:

```
/ hooks
/ styles
/ shared
/ components
```

### Requirements

* Do **not** invent new directories arbitrarily
* Do **not** duplicate responsibilities
* Prefer existing abstractions over new ones

### Example

**Incorrect**

```
/utils/useSomething.ts   // Hook placed in utils
```

**Correct**

```
/hooks/useSomething.ts
```

---

## 2. Logging Policy

### Rule

`console.log`, `console.warn`, `console.error` are **strictly forbidden**.

### Required

Use the project-provided `logger` utility.

### Rationale

* Centralized log control
* Environment-based filtering
* Production safety

### Example

**Incorrect**

```ts
console.log('User loaded')
```

**Correct**

```ts
logger.info('User loaded')
```

---

## 3. Frontend Code Quality Standards

Frontend code must go **beyond basic functionality** and meet **production-grade standards**.

### Mandatory Considerations

#### Security

* Never trust client-side input
* Avoid leaking sensitive data to the browser
* Do not expose internal error details

#### Performance

* Avoid unnecessary re-renders
* Memoize expensive computations
* Prefer lazy loading when applicable

#### Optimization

* Use `useMemo`, `useCallback` where justified
* Avoid premature optimization, but fix obvious inefficiencies

#### Real-World Practices

* Follow modern Vercel / production frontend standards
* Assume code will be maintained long-term

### Example

**Incorrect**

```tsx
const value = heavyCalculation(data)
```

**Correct**

```tsx
const value = useMemo(() => heavyCalculation(data), [data])
```

---

## 4. Unknowns Must Be Researched

### Rule

If something is unclear:

* **Search the web**, or
* **Explore the existing codebase**

### Forbidden

* Guessing
* Making assumptions without verification
* Implementing speculative logic

### Expected Behavior

* Prefer existing patterns
* Match existing APIs and conventions

---

## 5. File Creation Protocol

### Rule

Before creating new files, **you must present the proposed structure** to the user and obtain approval.

### Required Workflow

1. Propose file structure
2. Explain responsibilities
3. Wait for approval
4. Then implement

### Example

**Proposal**

```
/features/auth/
  ├─ AuthForm.tsx
  ├─ useAuth.ts
  └─ auth.types.ts
```

Only after approval may implementation begin.

---

## 6. Type Safety Verification

### Rule

After completing work, you **must run**:

```
pnpm typecheck
```

### Requirements

* Fix **all** type errors
* No unresolved TypeScript issues allowed

Code that fails type checking is **not acceptable**.

---

## 7. Professional Engineering Standard

All code must reflect a **professional engineering mindset**.

### Expectations

* Clear intent
* Readable structure
* Predictable behavior
* Maintainability over cleverness

### Non-Goals

* Over-engineering
* Experimental patterns
* Personal stylistic preferences

---

## Final Note

This guide is **non-optional**.

If a conflict arises between personal preference and this document:

> **This document wins.**

Treat this as a contract, not a suggestion.