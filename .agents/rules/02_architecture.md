---
trigger: always_on
---

# Luie — Architecture

## Electron Boundary

### Renderer is responsible for
- UI rendering
- User interactions
- Local UI state
- Calling APIs exposed through the preload bridge

### Renderer must NEVER do

// All of these are forbidden in renderer
import fs from 'fs'
import path from 'path'
import { ipcRenderer } from 'electron'
const x = require('something')

Direct access to Node.js, the filesystem, or Electron IPC from the renderer is an architecture violation.

### If a preload API doesn't exist

Do not bypass the architecture.
Instead:
1. Identify the capability you need
2. Propose the preload API shape
3. Wait for confirmation before implementing

---

## File Organization

### Before creating a new file

1. Does a similar component / page / hook / store already exist?
2. Can the existing file be extended to cover this?
3. Is the new responsibility clearly isolated?

If you can't answer all three — explore more before creating.

### Good component names

NovelSidebar
ChapterList
ChapterTree
WritingEditorPanel
ProjectHeader
CharacterReferencePanel
TermListItem

### Bad component names

NewDesign
ModernUI
BeautifulCard
TempComponent
DashboardV2
EditorNew
SidebarFixed

### Component responsibility

Each component has exactly one responsibility.
Split into:
- layout wrapper
- list container
- list item
- toolbar
- dialog
- empty state
- editor area
- inspector / side panel

Do not put business logic inside visual components.
Use existing hooks and stores for stateful behavior.