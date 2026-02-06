# Luie Export Plan (DOCX + HWPX)

## Goals
- Provide fast export from the editor to .docx and .hwpx (and optionally .hwp via conversion).
- Match “Hangul/Word-like” layout: A4, 10pt Batang, line spacing ~160%, first-line indent.
- Avoid data loss during export (crash-safe, atomic file writes).

## Learnings from pypandoc-hwpx
- Uses a reference HWPX (blank.hwpx) as a style/page-setup template.
- Extracts header.xml + page setup from Contents/section0.xml.
- Converts source to Pandoc JSON AST, then writes section0.xml runs.
- Writes images into BinData/ and updates references.
- Output is a ZIP with the HWPX structure.

## Proposed Architecture
1. Renderer UI
   - Quick Export modal (Word/Hangul-style preview).
   - Exports are initiated via IPC to the main process.
2. Main Process Export Service
   - Normalizes source (HTML + title + metadata).
   - Executes format-specific exporters:
     - DOCX exporter (docx package).
     - HWPX exporter (template + XML generation).
3. File Write Layer
   - Atomic write (temp + fsync + rename) for all export outputs.

## Export Pipelines
### A. DOCX (primary)
- Input: title, content HTML (from editor), metadata.
- Build: Use docx package with explicit paragraph/section settings.
- Styling defaults:
  - A4: width=11906, height=16838 (twips)
  - Font: Batang ("Batang")
  - Size: 10pt (Size: 20 half-points)
  - Line spacing: ~1.6 (auto line spacing)
  - First-line indent: 10pt (~200 twips)
- Output: .docx file to user-selected location.

### B. HWPX (template + XML)
Option 1: JSZip + template clone (recommended)
- Use blank.hwpx as a template.
- Unzip, update:
  - Contents/header.xml (styles, fonts, numbering)
  - Contents/section0.xml (paragraphs + runs)
  - BinData/ (images)
- Re-zip as .hwpx.

Option 2: Pandoc CLI bridge (fallback)
- Use pandoc to convert HTML/MD -> HWPX with a reference document.
- Pros: faster initial delivery.
- Cons: external dependency (pandoc install), runtime fragility.

## Required Packages (NPM)
- docx
- jszip
- sanitize-filename
- iconv-lite (optional, only if encoding issues arise)

## IPC Design
- IPC channel: export:create
- Payload:
  - projectId
  - chapterId
  - title
  - html
  - format: "DOCX" | "HWPX"
  - options: page size, line spacing, font, margins
- Response:
  - success, filePath

## UI Plan (Quick Export)
- Footer right button: "Quick Export"
- Modal layout:
  - Left: preview pane (Word/Hangul style)
  - Right: format, file name, options
- Export button triggers IPC.

## Implementation Steps
1. Add IPC channel and main export service skeleton.
2. Implement DOCX exporter (docx package).
3. Implement HWPX exporter (template + XML updates).
4. Wire UI modal to IPC.
5. Add validation and error toasts.
6. Add unit tests for exporters.

## References
- docx: https://docx.js.org/
- Hancom OWPML guide: https://developer.hancom.com/
- pypandoc-hwpx: https://github.com/msjang/pypandoc-hwpx

## Risks / Notes
- Direct .hwp creation is not supported; use .hwpx or an external converter.
- Font fidelity requires Batang installed on the target system.
- Pandoc-based path requires user-installed pandoc.
