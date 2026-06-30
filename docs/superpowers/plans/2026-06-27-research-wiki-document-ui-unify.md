# Research Wiki/Document View UI Unification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the research feature's wiki + document views so characters, events, and factions share one design language — `WikiDetailView` (character) is the canonical target; `EntityDetailView` (event/faction) is migrated onto it.

**Architecture:** Two shared components are extracted to kill duplication, then event/faction are repointed at them. (1) `WikiContentPanel` is generalized to take a structural `WikiContentModel` + i18n prefix, so the TOC + sections + add-section block is one component used by all three entity types. (2) A new shared `NotionDocumentView` absorbs `CharacterDocumentView`'s `PropertyRow` + `MarkdownDocumentEditor` + `decomposeBody` logic; character and event/faction both become thin wrappers that feed it properties + a content model. `EntityDetailView` then drops its namuwiki-style boxed TOC, dashed add-button, heavy classification chip, and the legacy free-form HTML `document` field — reading/writing the same `sections` + per-section content the wiki view uses.

**Tech Stack:** React + TypeScript, Tailwind v4 (`@theme` tokens in `src/renderer/src/styles/global.tokens.css`), TipTap (`@tiptap/react` + `tiptap-markdown`), `react-i18next`. Verification = `pnpm typecheck` + `pnpm build` + `pnpm lint-all` + visual check (this codebase has no component unit-test harness; TDD here means the project's own build/typecheck/lint gates — matching the precedent in `docs/design-redesign-plan.md`).

## Global Constraints

- **Token vocabulary:** Luie core tokens only (`bg-app/sidebar/panel/surface`, `text-fg/muted/accent`, `border-border`, `rounded-control/panel`). Do NOT introduce new `--namu-*` references; this plan removes them.
- **No new dependencies.** TipTap + tiptap-markdown are already installed.
- **i18n parity:** keys touched must stay symmetric across `ko`/`en`/`ja`. The keys this plan consumes (`{prefix}.tocLabel`, `{prefix}.addSection`, `{prefix}.newSection`, `{prefix}.classificationLabel`, `{prefix}.uncategorized`) already exist for `event` and `faction` in `src/renderer/src/i18n/locales/{ko,en}/workspace/World.ts`. Do not add keys unless a step says to.
- **No behavioral data migration.** The legacy `attributes.document` HTML field on events/factions becomes inert (no longer read or written). Per user decision (Notion-style upgrade). Existing `attributes.document` content is not surfaced; this is accepted (YAGNI on a migration). Note this ceiling in the Task 4 commit message.
- **Surgical:** touch only the files each task names. Match existing Tailwind class style.

## File Structure

- **Modify** `src/renderer/src/features/research/components/wiki/WikiContentPanel.tsx` — generalize to a structural model + i18n prefix (Task 1).
- **Create** `src/renderer/src/features/research/components/shared/NotionDocumentView.tsx` — shared Notion-style document surface (`PropertyRow`, `MarkdownDocumentEditor`, `decomposeBody`, `DocumentPropertyRow`) (Task 2).
- **Modify** `src/renderer/src/features/research/components/wiki/CharacterDocumentView.tsx` — thin wrapper around `NotionDocumentView` (Task 2).
- **Modify** `src/renderer/src/features/research/components/wiki/EntityDetailView.tsx` — wiki-mode cleanup (Task 3), document-mode swap (Task 4).
- **Modify** `src/renderer/src/features/research/components/wiki/Infobox.tsx` — namu tokens → core tokens (Task 5).
- **Delete** `src/renderer/src/features/research/components/shared/EntityDocumentView.tsx` (Task 6; only importer is `EntityDetailView`, replaced in Task 4).

---

### Task 1: Generalize `WikiContentPanel` to a structural model + i18n prefix

The panel currently hardcodes the `character.*` i18n namespace and `CharacterWikiAttrs`. Lift both so event/faction can reuse it. No visual change for the character view.

**Files:**
- Modify: `src/renderer/src/features/research/components/wiki/WikiContentPanel.tsx`

**Interfaces:**
- Produces: `WikiContentModel` (exported structural type) and `WikiContentPanel` props now `{ attrs: WikiContentModel; i18nPrefix: string; newSectionFallback?: string }`.

- [ ] **Step 1: Edit `WikiContentPanel.tsx` — replace the props type and i18n usage**

Replace the entire file content with:

```tsx
import { useTranslation } from "react-i18next";
import { useDialog } from "@shared/ui/useDialog";
import { WikiSection } from "./WikiSection";
import type { WikiSectionData } from "./types";

// ── WikiContentPanel ──────────────────────────────────────────────────────

/**
 * Structural content model shared by the wiki view of every entity type.
 * Character passes its `CharacterWikiAttrs` directly (it already matches);
 * event/faction build an adapter over their `attributes` bag.
 */
export type WikiContentModel = {
  sections: WikiSectionData[];
  getSectionContent: (id: string) => string;
  setSectionContent: (id: string, value: string) => void;
  setSections: (sections: WikiSectionData[]) => void;
};

type WikiContentPanelProps = {
  attrs: WikiContentModel;
  /** i18n namespace: "character" | "event" | "faction". */
  i18nPrefix: string;
  newSectionFallback?: string;
};

export function WikiContentPanel({
  attrs,
  i18nPrefix,
  newSectionFallback,
}: WikiContentPanelProps) {
  const { t } = useTranslation();
  const dialog = useDialog();

  const sections = attrs.sections;

  // ── Section CRUD ────────────────────────────────────────────────────────

  const addSection = () => {
    const id = `section_${Date.now()}`;
    const label = `${sections.length + 1}. ${
      newSectionFallback ?? t(`${i18nPrefix}.newSection`, "New Section")
    }`;
    attrs.setSections([...sections, { id, label }]);
  };

  const renameSection = (id: string, newLabel: string) =>
    attrs.setSections(sections.map((s) => (s.id === id ? { ...s, label: newLabel } : s)));

  const deleteSection = (id: string) => {
    void (async () => {
      const confirmed = await dialog.confirm({
        title: t(`${i18nPrefix}.wiki.sectionDeleteTitle`, "Delete Section"),
        message: t(
          `${i18nPrefix}.deleteSectionConfirm`,
          "Are you sure you want to delete this section?",
        ),
        isDestructive: true,
      });
      if (!confirmed) return;
      attrs.setSections(sections.filter((s) => s.id !== id));
    })();
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-9">
      {/* Table of Contents */}
      <nav className="self-start">
        <p className="text-[11px] font-medium text-muted mb-2 uppercase tracking-wider">
          {t(`${i18nPrefix}.tocLabel`, "Contents")}
        </p>
        <div className="flex flex-col gap-0.5 text-[13px] pl-3 border-l border-border/50">
          {sections.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className="text-accent/70 no-underline hover:text-accent hover:underline leading-snug py-0.5 transition-colors"
            >
              {sec.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Sections */}
      {sections.map((sec) => (
        <WikiSection
          key={sec.id}
          id={sec.id}
          label={sec.label}
          content={attrs.getSectionContent(sec.id)}
          onRename={(val) => renameSection(sec.id, val)}
          onUpdateContent={(val) => attrs.setSectionContent(sec.id, val)}
          onDelete={() => deleteSection(sec.id)}
        />
      ))}

      {/* Add section */}
      <button
        type="button"
        onClick={addSection}
        className="self-start flex items-center gap-1.5 text-[13px] text-muted/50 hover:text-accent transition-colors cursor-pointer bg-transparent border-none pl-1"
      >
        <span className="text-[16px] leading-none">+</span>
        {t(`${i18nPrefix}.addSection`, "+ Add section")}
      </button>
    </div>
  );
}
```

Note: this removes the `useEffectiveCharacterSections` call from this file — the character view passes already-effective sections (see Task 2 wrapper / the character hook already provides them upstream). The character caller will be updated in Step 2 to pass effective sections.

- [ ] **Step 2: Update the character caller in `WikiDetailView.tsx`**

The character view must now (a) pass `i18nPrefix="character"` and (b) pass effective sections through the model, since `WikiContentPanel` no longer calls `useEffectiveCharacterSections` itself.

In `src/renderer/src/features/research/components/wiki/WikiDetailView.tsx`:

Add the hook import next to the existing `useCharacterWikiAttrs` import (around line 14):

```tsx
import { useEffectiveCharacterSections } from "./hooks/useEffectiveCharacterSections";
```

Inside `WikiDetailView` (after `const attrs = useCharacterWikiAttrs();`, around line 103), add:

```tsx
const effectiveSections = useEffectiveCharacterSections(attrs.sections);
```

Then wrap the model at the `<WikiContentPanel>` call site (around line 337). Replace:

```tsx
<WikiContentPanel attrs={attrs} />
```

with:

```tsx
<WikiContentPanel
  attrs={{
    sections: effectiveSections,
    getSectionContent: attrs.getSectionContent,
    setSectionContent: attrs.setSectionContent,
    setSections: attrs.setSections,
  }}
  i18nPrefix="character"
/>
```

- [ ] **Step 3: Verify typecheck + build**

Run: `pnpm typecheck`
Expected: clean (no errors).

Run: `pnpm build`
Expected: exit 0.

- [ ] **Step 4: Visual check (character wiki view)**

Launch the app, open a character's wiki view. Confirm: TOC, sections, add-section button render exactly as before (no visual change). Confirm adding/renaming/deleting a section still works and persists.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/features/research/components/wiki/WikiContentPanel.tsx \
        src/renderer/src/features/research/components/wiki/WikiDetailView.tsx
git commit -m "$(cat <<'EOF'
refactor(wiki): generalize WikiContentPanel to structural model + i18n prefix

No visual change. Lifts the CharacterWikiAttrs coupling and hardcoded
character.* i18n namespace so event/faction can reuse the same TOC +
sections + add-section block.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Extract shared `NotionDocumentView`; make `CharacterDocumentView` a thin wrapper

Move `PropertyRow`, `MarkdownDocumentEditor`, `decomposeBody`, and the `DocumentPropertyRow` type out of `CharacterDocumentView` into a new shared file. `CharacterDocumentView` keeps only its character-specific property assembly and delegates rendering. No visual change.

**Files:**
- Create: `src/renderer/src/features/research/components/shared/NotionDocumentView.tsx`
- Modify: `src/renderer/src/features/research/components/wiki/CharacterDocumentView.tsx`

**Interfaces:**
- Produces: `NotionDocumentView` (default export) with props:

```ts
type NotionDocumentViewProps = {
  properties: DocumentPropertyRow[];   // header property rows (label + value/onSave)
  sections: WikiSectionData[];          // effective sections (single source with wiki view)
  getSectionContent: (id: string) => string;
  setSections: (sections: WikiSectionData[]) => void;
  setSectionContent: (id: string, value: string) => void;
  bodyPlaceholder: string;
};
```

…where `DocumentPropertyRow` is the existing type (now exported from the shared file):

```ts
export type DocumentPropertyRow = {
  label: string;
  value?: string;
  placeholder?: string;
  onSave?: (value: string) => void;     // omit for readonly rows
  readonlyValue?: string;
};
```

- Consumes: `WikiSectionData` from `features/research/components/wiki/types`.

- [ ] **Step 1: Create `shared/NotionDocumentView.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { BufferedInput } from "@shared/ui/BufferedInput";
import type { WikiSectionData } from "@renderer/features/research/components/wiki/types";

/** tiptap-markdown augments editor.storage at runtime; type it locally. */
type MarkdownStorage = { markdown?: { getMarkdown?: () => string } };

/** A property row shown in the document header. */
export type DocumentPropertyRow = {
  label: string;
  value?: string;
  placeholder?: string;
  onSave?: (value: string) => void;
  readonlyValue?: string;
};

type NotionDocumentViewProps = {
  properties: DocumentPropertyRow[];
  sections: WikiSectionData[];
  getSectionContent: (id: string) => string;
  setSections: (sections: WikiSectionData[]) => void;
  setSectionContent: (id: string, value: string) => void;
  bodyPlaceholder: string;
};

const AUTOSAVE_DELAY_MS = 500;

/**
 * Notion-style document view shared by all entity types. The header is a list
 * of property rows; the body is ONE Markdown document where each wiki section
 * is an `# h1` heading. h1 headings map 1:1 to wiki sections, so editing here
 * (rename/add/remove a heading, edit body) writes straight back to `sections`
 * + their content strings — the exact data the wiki view reads.
 */
export default function NotionDocumentView({
  properties,
  sections,
  getSectionContent,
  setSections,
  setSectionContent,
  bodyPlaceholder,
}: NotionDocumentViewProps) {
  // Compose into one markdown document — once per mount; the parent keys this
  // view by entity id (re-mount on switch).
  const [initialBody] = useState(() =>
    sections
      .map((s) => `# ${s.label}\n\n${getSectionContent(s.id)}`.trim())
      .join("\n\n"),
  );

  const saveBody = (markdown: string) => {
    const { sections: nextSections, contentById } = decomposeBody(markdown, sections);
    setSections(nextSections);
    for (const [id, content] of Object.entries(contentById)) {
      setSectionContent(id, content);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[720px] px-2 py-2 flex flex-col gap-8">
        {/* ── Properties ─────────────────────────────────────────────── */}
        <div className="flex flex-col">
          {properties.map((row) => (
            <PropertyRow key={row.label} label={row.label} readonlyValue={row.readonlyValue}>
              {row.onSave ? (
                <BufferedInput
                  className="w-full bg-transparent border-none p-0 text-[14px] text-fg focus:outline-none placeholder:text-muted/40"
                  value={row.value ?? ""}
                  placeholder={row.placeholder ?? ""}
                  onSave={row.onSave}
                />
              ) : null}
            </PropertyRow>
          ))}
        </div>

        {/* ── Body: one Markdown document; # headings = wiki sections ── */}
        <MarkdownDocumentEditor
          initialMarkdown={initialBody}
          placeholder={bodyPlaceholder}
          onSave={saveBody}
        />
      </div>
    </div>
  );
}

function PropertyRow({
  label,
  children,
  readonlyValue,
}: {
  label: string;
  children?: React.ReactNode;
  readonlyValue?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-b-0">
      <span className="w-24 shrink-0 text-[13px] text-muted pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">
        {readonlyValue !== undefined ? (
          <span className="text-[14px] text-fg">{readonlyValue}</span>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function MarkdownDocumentEditor({
  initialMarkdown,
  placeholder,
  onSave,
}: {
  initialMarkdown: string;
  placeholder: string;
  onSave: (markdown: string) => void;
}) {
  const saveTimer = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Markdown.configure({ html: false }),
    ],
    content: initialMarkdown,
    editorProps: { attributes: { class: "ProseMirror focus:outline-none" } },
    onUpdate: ({ editor }) => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        const md =
          (editor.storage as MarkdownStorage).markdown?.getMarkdown?.() ??
          editor.getText();
        onSaveRef.current(md);
      }, AUTOSAVE_DELAY_MS);
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current);
        if (editor) {
          const md =
            (editor.storage as MarkdownStorage).markdown?.getMarkdown?.() ??
            editor.getText();
          onSaveRef.current(md);
        }
      }
    };
  }, [editor]);

  return (
    <div className="tiptap entity-document">
      <EditorContent editor={editor} />
    </div>
  );
}

/**
 * Split a markdown document into wiki sections by top-level `#` headings.
 * Section ids are matched to the existing sections by order so wiki references
 * (and per-section content keys) are preserved across edits.
 */
function decomposeBody(
  markdown: string,
  oldSections: WikiSectionData[],
): { sections: WikiSectionData[]; contentById: Record<string, string> } {
  const lines = markdown.split("\n");
  const parsed: Array<{ label: string; content: string[] }> = [];
  let current: { label: string; content: string[] } | null = null;

  for (const line of lines) {
    const heading = /^#\s+(.+?)\s*$/.exec(line);
    if (heading) {
      current = { label: heading[1], content: [] };
      parsed.push(current);
    } else if (current) {
      current.content.push(line);
    }
    // Text before the first heading has no section and is dropped.
  }

  const sections: WikiSectionData[] = parsed.map((p, index) => ({
    id: oldSections[index]?.id ?? `section_${Date.now()}_${index}`,
    label: p.label,
  }));

  const contentById: Record<string, string> = {};
  parsed.forEach((p, index) => {
    contentById[sections[index].id] = p.content.join("\n").trim();
  });

  return { sections, contentById };
}
```

Note: `saveBody` here calls `setSections` then per-id `setSectionContent`, instead of the character-specific `attrs.setManyAttrs`. The character wrapper in Step 2 wires these to `attrs`.

- [ ] **Step 2: Rewrite `CharacterDocumentView.tsx` as a thin wrapper**

Replace the entire file with:

```tsx
import { useTranslation } from "react-i18next";
import NotionDocumentView, {
  type DocumentPropertyRow,
} from "@renderer/features/research/components/shared/NotionDocumentView";
import { useEffectiveCharacterSections } from "./hooks/useEffectiveCharacterSections";
import type { CharacterWikiAttrs } from "./hooks/useCharacterWikiAttrs";

export type { DocumentPropertyRow };

type CharacterDocumentViewProps = {
  classification: string;
  description: string;
  onDescriptionSave: (value: string) => void;
  properties: DocumentPropertyRow[];
  attrs: CharacterWikiAttrs;
};

/**
 * Character wrapper around the shared Notion-style document view. Builds the
 * header property rows (classification / description / infobox fields) and
 * delegates rendering + body editing to NotionDocumentView.
 */
export function CharacterDocumentView({
  classification,
  description,
  onDescriptionSave,
  properties,
  attrs,
}: CharacterDocumentViewProps) {
  const { t } = useTranslation();

  const effectiveSections = useEffectiveCharacterSections(attrs.sections);

  const headerRows: DocumentPropertyRow[] = [
    {
      label: t("character.classificationLabel"),
      readonlyValue: classification,
    },
    {
      label: t("character.wiki.descriptionLabel", "설명"),
      value: description,
      placeholder: t("character.uncategorized"),
      onSave: onDescriptionSave,
    },
    ...properties,
  ];

  return (
    <NotionDocumentView
      properties={headerRows}
      sections={effectiveSections}
      getSectionContent={attrs.getSectionContent}
      setSections={attrs.setSections}
      setSectionContent={attrs.setSectionContent}
      bodyPlaceholder={t(
        "character.document.bodyPlaceholder",
        "# 제목 으로 섹션을 만들고 자유롭게 써보세요. 마크다운(##, -, **굵게**)을 사용할 수 있어요.",
      )}
    />
  );
}
```

- [ ] **Step 3: Verify typecheck + build**

Run: `pnpm typecheck`
Expected: clean.

Run: `pnpm build`
Expected: exit 0.

- [ ] **Step 4: Visual check (character document view)**

Open a character, switch to the **문서** view. Confirm: property rows render, body markdown editor loads existing section content as `# headings`, editing body + blur auto-saves and the change is visible when switching back to the **위키** view (round-trip intact).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/features/research/components/shared/NotionDocumentView.tsx \
        src/renderer/src/features/research/components/wiki/CharacterDocumentView.tsx
git commit -m "$(cat <<'EOF'
refactor(document): extract shared NotionDocumentView; character becomes wrapper

Moves PropertyRow / MarkdownDocumentEditor / decomposeBody out of
CharacterDocumentView into shared/NotionDocumentView so event/faction can
reuse the same Notion-style surface. No visual change for characters.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Migrate `EntityDetailView` wiki mode to the canonical language

Replace the namuwiki-style header/TOC/add-button with the character view's clean equivalents, and consume the now-shared `WikiContentPanel`. This is the core wiki-view unification.

**Files:**
- Modify: `src/renderer/src/features/research/components/wiki/EntityDetailView.tsx`

**Interfaces:**
- Consumes: `WikiContentPanel` (Task 1) with `attrs: WikiContentModel` + `i18nPrefix`.

- [ ] **Step 1: Add the `WikiContentPanel` import**

In `src/renderer/src/features/research/components/wiki/EntityDetailView.tsx`, add to the imports near the existing `WikiSection` import (line 10):

```tsx
import { WikiContentPanel, type WikiContentModel } from "./WikiContentPanel";
```

Remove the now-unused `WikiSection` import (line 10) — `WikiSection` is rendered inside `WikiContentPanel`, no longer directly by this file. (Run `pnpm typecheck` after; if `WikiSection` is still referenced anywhere in this file, keep it. It should not be after Step 3.)

- [ ] **Step 2: Build the `WikiContentModel` adapter for events/factions**

Inside the `EntityDetailView` component, after `sections` is computed (after line 100) and before the `return`, add:

```tsx
const contentModel: WikiContentModel = {
  sections,
  getSectionContent: (id) => (attributes[id] as string) || "",
  setSectionContent: (id, value) => handleAttrUpdate(id, value),
  setSections: (next) => handleAttrUpdate("sections", next),
};
```

- [ ] **Step 3: Rewrite the header (replace namuwiki-style block)**

Replace the header block currently at lines 211–254:

```tsx
<div className="border-b-2 border-(--namu-border) pb-4 mb-6 flex flex-col gap-3">
  <div className="flex items-center gap-2">
    <BufferedInput
      className="text-3xl font-extrabold text-fg leading-tight border-none bg-transparent flex-1 focus:outline-none min-w-0"
      value={entity.name}
      onSave={(val) => handleUpdate("name", val)}
    />
    <div className="flex items-center gap-1 p-0.5 rounded-panel bg-surface-hover border border-border/60 shrink-0">
      <button ...>{t("entityVisual.toggle.wiki")}</button>
      <button ...>{t("entityVisual.toggle.document", "문서")}</button>
    </div>
  </div>
  <div className="text-[13px] text-muted bg-surface border border-border px-3 py-1.5 rounded self-start flex items-center gap-2">
    <span className="font-bold">{t(`${prefix}.classificationLabel`, "Classification")}</span>
    <span className="text-(--namu-link) cursor-pointer hover:underline">
      {t(`${prefix}.template.basic`, templateFallback)}
    </span>
    <span className="text-border">|</span>
    <BufferedInput
      className="inline w-auto font-semibold text-(--namu-link) bg-transparent border-none p-1 focus:outline-none focus:bg-active rounded-sm"
      value={entity.description || ""}
      placeholder={t(`${prefix}.uncategorized`, "Uncategorized")}
      onSave={(val) => handleUpdate("description", val)}
    />
  </div>
</div>
```

with the character-aligned header:

```tsx
<div className="flex flex-col gap-2 pb-4 border-b border-border">
  <div className="flex items-center gap-2">
    <BufferedInput
      className="text-[26px] font-extrabold text-fg leading-tight border-none bg-transparent flex-1 focus:outline-none min-w-0"
      value={entity.name}
      onSave={(val) => handleUpdate("name", val)}
    />
    <div className="flex items-center gap-1 p-0.5 rounded-panel bg-surface-hover border border-border/60 shrink-0">
      <button
        type="button"
        onClick={() => switchViewMode("wiki")}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-control text-[12px] font-medium transition-colors",
          viewMode === "wiki" ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
        )}
      >
        <BookOpen size={12} /> {t("entityVisual.toggle.wiki")}
      </button>
      <button
        type="button"
        onClick={() => switchViewMode("document")}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-control text-[12px] font-medium transition-colors",
          viewMode === "document" ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
        )}
      >
        <FileText size={12} /> {t("entityVisual.toggle.document", "문서")}
      </button>
    </div>
  </div>

  <div className="flex items-center gap-1.5 text-[12px] text-muted">
    <span className="font-medium">{t(`${prefix}.classificationLabel`, "Classification")}</span>
    <span className="text-border/60">·</span>
    <span className="text-accent/80">{t(`${prefix}.template.basic`, templateFallback)}</span>
    <span className="text-border/60">·</span>
    <BufferedInput
      className="inline min-w-[60px] font-medium text-accent/80 bg-transparent border-none p-0 focus:outline-none focus:bg-active focus:rounded-sm focus:px-1 transition-all"
      value={entity.description || ""}
      placeholder={t(`${prefix}.uncategorized`, "Uncategorized")}
      onSave={(val) => handleUpdate("description", val)}
    />
  </div>
</div>
```

(Keep the existing two `<button>` view-mode toggles' `onClick`/labels — only the wrapper + classification chip change. `cn` and `BookOpen`/`FileText` are already imported in this file.)

- [ ] **Step 4: Replace the wiki body (boxed TOC + inline sections + dashed add-button) with `WikiContentPanel`**

Replace the entire wiki-mode body block (currently lines 263–323, the `<div className="@container"> … </div>` inside the `viewMode !== "document"` branch) with:

```tsx
<div className="@container">
  <div className="flex flex-col @min-[700px]:flex-row gap-8 items-start min-h-0">
    <div className="flex-1 min-w-0 w-full @min-[700px]:order-1 order-2">
      <WikiContentPanel attrs={contentModel} i18nPrefix={prefix} />
    </div>
    <div className="w-full @min-[700px]:w-[280px] shrink-0 @min-[700px]:order-2 order-1">
      <Infobox
        title={entity.name}
        image={icon}
        rows={customFields.map((field) => ({
          label: field.label,
          value: attributes[field.key] as string | undefined,
          placeholder: field.placeholder,
          type: field.type,
          options: field.options,
          isCustom: true,
          onSave: (value) => handleAttrUpdate(field.key, value),
          onLabelSave: (value) => updateCustomFieldLabel(field.key, value),
          onDelete: () => deleteCustomField(field.key),
        }))}
        onAddField={addCustomField}
      />
    </div>
  </div>
</div>
```

Note the Infobox width changes from `w-[320px]` to `w-[280px]` to match the character view's column. The inline `addSection`/`renameSection`/`deleteSection` functions in this file (lines 132–168) are now unused for the section buttons — **do not delete them yet**; they may be referenced by the document-mode wrapper in Task 4. Leave them; Task 4 / Task 6 sweep will remove if orphaned.

- [ ] **Step 5: Verify typecheck + build + lint**

Run: `pnpm typecheck`
Expected: clean. (If `WikiSection` import is flagged as unused, remove it from the import line.)

Run: `pnpm build`
Expected: exit 0.

Run: `pnpm lint-all`
Expected: green; rawHex / namu-token counts should not increase (this task removes `--namu-border`/`--namu-link` references from this file).

- [ ] **Step 6: Visual check (event/faction wiki view)**

Open an event, then a faction. Confirm: header now uses a single thin border, classification is a light inline `분류: · 템플릿 · 설명` line, TOC is the inline accent link list (not a boxed table), add-section is a subtle `+ 섹션 추가` text button. Infobox sits in the right column at 280px. Adding/renaming/deleting sections + custom fields still persists.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/features/research/components/wiki/EntityDetailView.tsx
git commit -m "$(cat <<'EOF'
feat(wiki): unify event/faction wiki view to character design language

Replaces the namuwiki-style header (border-b-2), boxed TOC table, and
dashed add-section button with the character view's clean equivalents.
Event/faction now consume the shared WikiContentPanel. Document view
switch is deferred to the next commit.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Migrate `EntityDetailView` document mode to `NotionDocumentView`

Replace the legacy free-form HTML document editor with the shared Notion-style surface, building property rows from custom fields + classification/description. The document body now reads/writes the same `sections` + per-section content as the wiki view (two-way sync), matching characters.

**Files:**
- Modify: `src/renderer/src/features/research/components/wiki/EntityDetailView.tsx`

**Interfaces:**
- Consumes: `NotionDocumentView` (Task 2), `DocumentPropertyRow`.

- [ ] **Step 1: Swap imports — drop `EntityDocumentView`, add `NotionDocumentView`**

In `src/renderer/src/features/research/components/wiki/EntityDetailView.tsx`:

Remove (line 8):

```tsx
import { EntityDocumentView } from "@renderer/features/research/components/shared/EntityDocumentView";
```

Add:

```tsx
import NotionDocumentView, {
  type DocumentPropertyRow,
} from "@renderer/features/research/components/shared/NotionDocumentView";
```

- [ ] **Step 2: Replace the document-mode render**

Replace the document branch (currently lines 256–261):

```tsx
{viewMode === "document" ? (
  <EntityDocumentView
    value={(attributes.document as string) || ""}
    onSave={(html) => handleAttrUpdate("document", html)}
    placeholder={t(`${prefix}.document.placeholder`, "자유롭게 써보세요...")}
  />
) : (
  /* wiki body */
)}
```

with:

```tsx
{viewMode === "document" ? (
  <NotionDocumentView
    properties={[
      {
        label: t(`${prefix}.classificationLabel`, "Classification"),
        readonlyValue: t(`${prefix}.template.basic`, templateFallback),
      },
      {
        label: t(`${prefix}.wiki.descriptionLabel`, "설명"),
        value: entity.description || "",
        placeholder: t(`${prefix}.uncategorized`, "Uncategorized"),
        onSave: (val) => handleUpdate("description", val),
      },
      ...customFields.map<DocumentPropertyRow>((field) => ({
        label: field.label,
        value: (attributes[field.key] as string) || undefined,
        placeholder: field.placeholder,
        onSave: (value) => handleAttrUpdate(field.key, value),
      })),
    ]}
    sections={sections}
    getSectionContent={(id) => (attributes[id] as string) || ""}
    setSections={(next) => handleAttrUpdate("sections", next)}
    setSectionContent={(id, value) => handleAttrUpdate(id, value)}
    bodyPlaceholder={t(
      `${prefix}.document.bodyPlaceholder`,
      "# 제목 으로 섹션을 만들고 자유롭게 써보세요. 마크다운(##, -, **굵게**)을 사용할 수 있어요.",
    )}
  />
) : (
  /* wiki body */
)}
```

The existing `addSection`/`renameSection`/`deleteSection` functions (lines 132–168) become unused after Steps 3+4 of this and the previous task — the section CRUD now lives inside `WikiContentPanel`/`NotionDocumentView`. Remove them in Step 3.

- [ ] **Step 3: Remove now-orphaned section-CRUD helpers**

Delete the three unused functions in `EntityDetailView.tsx`:

- `addSection` (lines ~132–141)
- `renameSection` (lines ~143–150)
- `deleteSection` (lines ~152–168)

Leave `addCustomField` / `updateCustomFieldLabel` / `deleteCustomField` — these are still used by the Infobox in the wiki body.

- [ ] **Step 4: Verify typecheck + build + lint**

Run: `pnpm typecheck`
Expected: clean (no unused-var errors after Step 3 removals).

Run: `pnpm build`
Expected: exit 0.

Run: `pnpm lint-all`
Expected: green.

- [ ] **Step 5: Visual + data check (event/faction document view)**

Open an event, switch to **문서** view. Confirm:
- Property rows render (분류 readonly + 설명 editable + each custom field).
- Body editor loads the wiki sections as `# headings` (same content as wiki view).
- Edit body, blur → auto-save. Switch to **위키** view → edits visible (round-trip).
- Add a custom field in wiki view → it appears as a property row in document view.

Confirm `attributes.document` is no longer written (inspect store / DB if a quick check is available; otherwise trust the code path — no caller writes it after this task).

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/features/research/components/wiki/EntityDetailView.tsx
git commit -m "$(cat <<'EOF'
feat(document): unify event/faction document view to Notion style

Event/faction document mode now uses the shared NotionDocumentView with
property rows (classification/description/custom fields) and a markdown
body synced 1:1 with wiki sections — same model as characters.

BREAKING-ish: the legacy attributes.document HTML field is no longer read
or written; it becomes inert. No migration is provided (accepted per spec);
existing document HTML content on events/factions will not surface.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `Infobox` — replace `--namu-*` tokens with core tokens

The Infobox is shared by all three entity types. Swap its residual `--namu-border` / `--namu-table-bg` / `--namu-table-label` / `--namu-hover-bg` references to core tokens. Header tone (`bg-accent text-white`) is intentionally left untouched per the user's "layout only" scope decision.

**Files:**
- Modify: `src/renderer/src/features/research/components/wiki/Infobox.tsx`

- [ ] **Step 1: Token swaps in `InfoboxRow`**

In `src/renderer/src/features/research/components/wiki/Infobox.tsx`, in the `InfoboxRow` component:

Replace `border-b border-(--namu-border) last:border-b-0` (line 30) → `border-b border-border last:border-b-0`.
Replace `hover:bg-(--namu-hover-bg)` (line 30) → `hover:bg-surface-hover`.

Replace the label-cell className (line 31):
`w-[100px] bg-(--namu-table-bg) px-2 py-2 font-semibold text-(--namu-table-label) border-r border-(--namu-border) …`
→ `w-[100px] bg-surface-hover px-2 py-2 font-semibold text-muted border-r border-border …`

(Leave the rest of that className — `flex items-center justify-center text-center leading-tight shrink-0 relative text-[12px]` — unchanged.)

- [ ] **Step 2: Token swaps in `Infobox`**

In the `Infobox` component:

- Root container (line 94): `border border-(--namu-border) bg-surface rounded-panel …` → `border border-border bg-surface rounded-panel …`
- Image wrapper (line 99): `bg-(--namu-table-bg) flex items-center justify-center border-b border-(--namu-border) py-6` → `bg-surface-hover flex items-center justify-center border-b border-border py-6`
- Add-field button (line 110): `border-t border-(--namu-border) … hover:bg-(--namu-hover-bg) …` → `border-t border-border … hover:bg-surface-hover …`

- [ ] **Step 3: Verify typecheck + build + lint**

Run: `pnpm typecheck` → clean.
Run: `pnpm build` → exit 0.
Run: `pnpm lint-all` → green; `--namu-` references in this file should now be 0.

- [ ] **Step 4: Visual check (all three entity types)**

Open character, event, faction wiki views. Confirm the Infobox renders with the same look as before (the namu tokens were already aliased to core in Phase 2a, so this should be a no-op visually — the point is to remove the alias dependency). Borders, label-cell tint, hover states look correct in light/dark/sepia.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/features/research/components/wiki/Infobox.tsx
git commit -m "$(cat <<'EOF'
refactor(wiki): Infobox — replace --namu-* tokens with core tokens

Drops the last --namu-border/table-bg/table-label/hover-bg references in
Infobox in favor of border-border / bg-surface-hover / text-muted. Phase
2a already aliased these to the same values, so this is a no-op visually
and removes the dead alias dependency. Header tone intentionally kept.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Delete legacy `shared/EntityDocumentView.tsx`

After Task 4, nothing imports the free-form HTML document editor. Remove it.

**Files:**
- Delete: `src/renderer/src/features/research/components/shared/EntityDocumentView.tsx`

- [ ] **Step 1: Confirm no importers remain**

Run: `rg -n "shared/EntityDocumentView" src`
Expected: no output (Task 4 removed the only importer).

If output is non-empty, stop — find and migrate the stray importer before deleting.

- [ ] **Step 2: Delete the file**

```bash
git rm src/renderer/src/features/research/components/shared/EntityDocumentView.tsx
```

- [ ] **Step 3: Verify typecheck + build + lint**

Run: `pnpm typecheck` → clean.
Run: `pnpm build` → exit 0.
Run: `pnpm lint-all` → green.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore(research): delete legacy free-form EntityDocumentView

Unused after event/faction migrated to the shared NotionDocumentView.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**1. Spec coverage**
- Wiki-view layout unification (border, classification chip, TOC, add-button) → Task 3. ✓
- Shared TOC + sections extraction (`WikiContentPanel`) → Task 1. ✓
- Infobox namu→core tokens → Task 5. ✓ (Header tone redesign explicitly out of scope per user decision.)
- Document view → Notion-style with property rows + markdown body, two-way sync → Tasks 2 + 4. ✓
- Legacy HTML document path removed → Tasks 4 + 6. ✓

**2. Placeholder scan** — no TBD / "add error handling" / "similar to Task N". Each step shows the exact code or the exact className string to swap.

**3. Type consistency**
- `WikiContentModel` defined in Task 1, consumed in Task 3 (`contentModel`) — fields match: `sections`, `getSectionContent`, `setSectionContent`, `setSections`. ✓
- `NotionDocumentView` props defined in Task 2, consumed in Task 4 — `properties` / `sections` / `getSectionContent` / `setSections` / `setSectionContent` / `bodyPlaceholder` match. ✓
- `DocumentPropertyRow` exported from `NotionDocumentView` (Task 2), re-exported from `CharacterDocumentView` for back-compat, imported by `EntityDetailView` (Task 4). ✓
- `WikiSectionData` imported from `wiki/types` in both shared files — same source. ✓

**4. Risk notes (carried into commits)**
- Task 4 makes `attributes.document` inert on events/factions. No migration. Accepted per spec.
- Task 3/4 orphan the inline `addSection`/`renameSection`/`deleteSection` in `EntityDetailView`; removal is in Task 4 Step 3 (single sweep, avoids mid-task unused-var errors).
- Each task commits independently and ends green (typecheck + build + lint), so the branch is shippable at every task boundary.
