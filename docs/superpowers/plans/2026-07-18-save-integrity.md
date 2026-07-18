# Save Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** world entity 입력을 SQLite에 빠르고 유실 없이 저장하고, `.luie` 체크포인트와 `Cmd/Ctrl+S`, 종료 flush를 명확한 내구성 경계로 연결한다.

**Architecture:** renderer는 entity별 latest-patch queue로 입력을 직렬화하고 UI를 optimistic하게 갱신한다. main process는 entity mutation과 project revision 증가를 한 SQLite transaction으로 커밋한 뒤 즉시 ACK하고, 기존 `ProjectExportQueue`와 atomic `.luie` writer가 exported revision을 비동기로 따라간다.

**Tech Stack:** Electron 40, React 19, TypeScript 5, Zustand, Drizzle ORM, better-sqlite3, Vitest, Testing Library

## Global Constraints

- 새 npm dependency를 추가하지 않는다.
- renderer에서 Node/Electron API에 직접 접근하지 않고 preload API를 사용한다.
- 사용자에게 `saved`로 보이는 경계는 SQLite commit ACK다.
- 기본 input debounce는 `250ms`, `.luie` idle checkpoint는 `1500ms`다.
- 기존 shortcut id `chapter.save`는 사용자 설정 호환성을 위해 유지하되 동작을 프로젝트 flush로 확장한다.
- `.luie` 전체 쓰기는 기존 `writeLuieSqliteContainer`의 temp file + atomic replace를 재사용한다.
- CRDT, cloud sync 재설계, 원고 autosave manager 교체는 포함하지 않는다.
- 각 task는 지정된 테스트를 먼저 실패시키고 최소 구현으로 통과시킨다.

---

### Task 1: BufferedInput의 단일 flush 경계

**Status:** 완료

**Files:**
- Create: `tests/dom/bufferedInputSavePolicy.test.tsx`
- Modify: `src/shared/ui/BufferedInput.tsx`
- Modify: `src/shared/constants/runtime/interactionTiming.ts`

**Interfaces:**
- Consumes: `BufferedInputProps.onSave(value: string): void`
- Produces: blur, Enter, unmount가 동일한 pending value를 최대 한 번 flush하는 `BufferedInput`
- Produces: `DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS = 250`

- [x] **Step 1: blur 중복 저장을 재현하는 실패 테스트 작성**

새 dependency 없이 기존 `react-dom/client`의 `createRoot`와 native DOM event로 테스트했다. 계약은 `tests/dom/bufferedInputSavePolicy.test.tsx`의 `flushes the latest value once when blur beats debounce`가 고정한다.

- [x] **Step 2: 테스트가 현재 중복 호출로 실패하는지 확인**

Run: `SKIP_DB_TEST_SETUP=1 pnpm vitest tests/dom/bufferedInputSavePolicy.test.tsx --run`

Expected: `onSave`가 두 번 호출되어 FAIL.

Actual: blur 직후 1회, 기존 500ms timer 뒤 1회로 총 2회 호출되어 예상대로 FAIL.

- [x] **Step 3: timer와 latest value를 하나의 flush 함수로 통합**

`BufferedInput` 내부에 다음 형태의 단일 경계를 둔다.

```tsx
const latestValue = useRef(externalValue);
const lastSavedValue = useRef(externalValue);

const cancelScheduledSave = () => {
  if (debounceTimer.current === null) return;
  window.clearTimeout(debounceTimer.current);
  debounceTimer.current = null;
};

const flush = (value = latestValue.current) => {
  cancelScheduledSave();
  if (value === lastSavedValue.current) return;
  lastSavedValue.current = value;
  onSaveRef.current(value);
};
```

`handleChange`와 `handleCompositionEnd`는 `latestValueRef`를 먼저 갱신하고 timer만 예약한다. blur와 Enter는 `flush()`를 호출한다. unmount cleanup도 timer를 취소하고 최신 dirty value를 flush한다. 외부 값과 동일한 값은 저장하지 않는다.

`interactionTiming.ts`를 다음 값으로 변경한다.

```ts
export const DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS = 250;
```

- [x] **Step 4: IME와 unmount 테스트 추가 후 통과 확인**

같은 테스트 파일의 `does not save an incomplete IME composition`, `flushes the latest dirty value once on unmount`가 두 경계를 고정한다.

Run: `SKIP_DB_TEST_SETUP=1 pnpm vitest tests/dom/bufferedInputSavePolicy.test.tsx --run`

Expected: 3 tests PASS.

Actual (2026-07-18): 3 tests PASS, 대상 ESLint PASS. sandbox에서 `pnpm` launcher가 무출력 대기해 동일한 로컬 binary `./node_modules/.bin/vitest`와 `./node_modules/.bin/eslint`로 실행했다.

- [x] **Step 5: Task 1 커밋**

```bash
git add tests/dom/bufferedInputSavePolicy.test.tsx src/shared/ui/BufferedInput.tsx src/shared/constants/runtime/interactionTiming.ts
git commit -m "fix(storage): flush buffered inputs once"
```

---

### Task 2: world entity latest-patch queue와 optimistic state

**Status:** 부분 완료 — 성공 mutation 직렬화 완료, 실패 payload 보존 미구현

**Files:**
- Create: `src/renderer/src/shared/store/worldEntityMutationQueue.ts`
- Create: `tests/renderer/stores/worldEntityMutationQueue.test.ts`
- Modify: `src/renderer/src/shared/store/createCRUDStore.ts`
- Modify: `src/renderer/src/shared/store/createWorldEntityCRUDStore.ts`
- Modify: `src/renderer/src/features/research/stores/worldBuilding/worldBuildingStore.graph.ts`
- Modify: `tests/renderer/stores/createCRUDStore.test.ts`
- Modify: `tests/renderer/stores/characterStoreMutationLock.test.ts`
- Modify: `tests/renderer/stores/worldBuildingStore.graph.test.ts`

**Interfaces:**
- Produces: `createLatestMutationQueue<P, R>(options): LatestMutationQueue<P, R>`
- Produces: `flushWorldEntityMutations(): Promise<void>`
- Produces: `getPendingWorldEntityMutationCount(): number`
- Produces: `replaceEntityNodePreservingPosition(graphData, entityType, item): WorldGraphData | null`
- Changes: `CRUDStore.update(input): Promise<T | null>`
- Consumes later: Task 6의 manual save와 종료 flush

- [x] **Step 1: 저장 중 두 번째 patch가 버려지는 실패 테스트 작성**

`worldEntityMutationQueue.test.ts`에 다음 동작을 고정한다.

```ts
it("serializes and merges patches that arrive during an in-flight update", async () => {
  const first = deferred<{ id: string; name: string; description?: string }>();
  const execute = vi
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockResolvedValueOnce({ id: "char-1", name: "Hero", description: "Lead" });
  const queue = createLatestMutationQueue({
    merge: (left, right) => ({ ...left, ...right }),
    execute,
  });

  const nameSave = queue.enqueue({ id: "char-1", name: "Hero" });
  const descriptionSave = queue.enqueue({ id: "char-1", description: "Lead" });
  expect(execute).toHaveBeenCalledTimes(1);

  first.resolve({ id: "char-1", name: "Hero" });
  await Promise.all([nameSave, descriptionSave]);

  expect(execute).toHaveBeenCalledTimes(2);
  expect(execute).toHaveBeenLastCalledWith({
    id: "char-1",
    description: "Lead",
  });
});
```

- [x] **Step 2: 현재 구현에 queue가 없어 실패하는지 확인**

Run: `SKIP_DB_TEST_SETUP=1 pnpm vitest tests/renderer/stores/worldEntityMutationQueue.test.ts --run`

Expected: module 또는 export 부재로 FAIL.

Actual: module 부재 확인 후 최소 export surface를 만들었고, `execute`가 0회 호출되는 RED를 확인했다.

- [x] **Step 3: 최소 latest-patch queue 구현**

```ts
export type LatestMutationQueue<P, R> = {
  enqueue: (patch: P) => Promise<R | null>;
  flush: () => Promise<void>;
  pendingCount: () => number;
};

export function createLatestMutationQueue<P, R>(options: {
  merge: (left: P | null, right: P) => P;
  execute: (patch: P) => Promise<R | null>;
}): LatestMutationQueue<P, R>;

export async function flushWorldEntityMutations(): Promise<void>;
export function getPendingWorldEntityMutationCount(): number;
```

queue는 `pending` patch와 하나의 `inFlight` loop만 가진다. `enqueue` 호출별 resolver를 보관하고, 해당 호출이 포함된 batch의 실행 결과로 resolve한다. raw `execute` reject에서는 아직 실행하지 않은 pending patch가 남지만, 실제 CRUD IPC 실패는 `null`로 변환되어 성공처럼 제거된다. 실패 payload 보존과 재시도는 후속 Task에서 보완한다.

- [x] **Step 4: CRUD update가 결과를 반환하도록 변경**

`CRUDStore.update`를 `Promise<T | null>`로 바꾸고 성공 시 `updatedItem`, 실패 시 `null`을 반환한다. 기존 호출자는 반환값을 무시해도 동작하도록 유지한다.

```ts
update: async (input: UpdateInput): Promise<T | null> => {
  const response = await apiClient.update(input);
  if (!response.success || !response.data) {
    set({ error: response.error?.message });
    return null;
  }
  const updatedItem = response.data;
  set((state) => ({
    items: state.items.map((item) =>
      item.id === updatedItem.id ? updatedItem : item,
    ),
    currentItem:
      state.currentItem?.id === updatedItem.id
        ? updatedItem
        : state.currentItem,
    error: null,
  }));
  return updatedItem;
};
```

- [x] **Step 5: world entity update를 entity id별 queue로 연결**

`createWorldEntityCRUDStore`에서 프로젝트 `Set` lock을 update 경로에 사용하지 않는다. update input은 즉시 `items/currentItem`에 shallow merge한다. queue의 execute는 `crudSlice.update`를 호출한다. entity id마다 queue instance를 하나만 두어 서로 다른 entity는 병렬로, 같은 entity는 직렬로 저장한다.

update 성공 후 `reloadCurrentGraph()`를 호출하지 않는다. ACK로 받은 entity를 `replaceEntityNodePreservingPosition`에 전달해 `useWorldBuildingStore.graphData`의 해당 node만 교체한다. mapper의 기본 `(0, 0)` 대신 기존 node의 `positionX/positionY`를 유지한다. create/delete의 기존 graph refresh는 이번 task에서 유지한다.

```ts
export const replaceEntityNodePreservingPosition = (
  graphData: WorldGraphData | null,
  entityType: "Character" | "Event" | "Faction" | "Term",
  item: Character | Event | Faction | Term,
): WorldGraphData | null => {
  if (!graphData) return null;
  const current = graphData.nodes.find((node) => node.id === item.id);
  if (!current) return graphData;
  const mapped = toNodeForEntity(entityType, item);
  return replaceNodeInGraph(graphData, {
    ...mapped,
    positionX: current.positionX,
    positionY: current.positionY,
  });
};
```

- [x] **Step 6: 기존 lock 테스트를 보존 정책 테스트로 교체**

`characterStoreMutationLock.test.ts`의 첫 테스트를 다음 요구로 변경한다.

```ts
it("persists a second character update after the first update resolves", async () => {
  const firstUpdate = deferred<IPCResponse<Character>>();
  mockedApi.character.update
    .mockReturnValueOnce(firstUpdate.promise)
    .mockResolvedValueOnce({
      success: true,
      data: { ...character, name: "Hero", description: "Lead" },
    });
  useCharacterStore.setState({ items: [character], currentItem: character });

  const nameSave = useCharacterStore.getState().updateCharacter({
    id: character.id,
    name: "Hero",
  });
  const descriptionSave = useCharacterStore.getState().updateCharacter({
    id: character.id,
    description: "Lead",
  });

  expect(mockedApi.character.update).toHaveBeenCalledTimes(1);
  firstUpdate.resolve({
    success: true,
    data: { ...character, name: "Hero" },
  });
  await Promise.all([nameSave, descriptionSave]);

  expect(mockedApi.character.update).toHaveBeenCalledTimes(2);
  expect(mockedApi.character.update).toHaveBeenLastCalledWith({
    id: character.id,
    description: "Lead",
  });
  expect(mockedRefresh.refreshWorldGraph).not.toHaveBeenCalled();
});
```

기존 `worldBuildingStore.graph.test.ts`에 ACK entity의 이름/설명/attributes가 교체되면서 기존 좌표와 edge가 그대로인 회귀 테스트를 추가한다.

Run: `SKIP_DB_TEST_SETUP=1 pnpm vitest tests/renderer/stores/worldEntityMutationQueue.test.ts tests/renderer/stores/createCRUDStore.test.ts tests/renderer/stores/characterStoreMutationLock.test.ts --run`

Expected: PASS.

Actual (2026-07-18): 관련 4 files, 13 tests PASS; 대상 ESLint PASS; `./node_modules/.bin/tsc6 --noEmit` PASS.

- [x] **Step 7: Task 2 커밋**

```bash
git add src/renderer/src/shared/store/worldEntityMutationQueue.ts src/renderer/src/shared/store/createCRUDStore.ts src/renderer/src/shared/store/createWorldEntityCRUDStore.ts src/renderer/src/features/project/stores/projectStore.ts src/renderer/src/features/research/stores/worldBuilding/worldBuildingStore.graph.ts tests/renderer/stores/worldEntityMutationQueue.test.ts tests/renderer/stores/createCRUDStore.test.ts tests/renderer/stores/characterStoreMutationLock.test.ts tests/renderer/stores/worldBuildingStore.graph.test.ts
git commit -m "fix(storage): queue world entity mutations"
```

---

### Task 3: project/export revision 스키마와 저장소

**Status:** 완료

**Files:**
- Modify: `src/main/database/schema/foundation.ts`
- Modify: `src/main/database/main/packagedSchema/projectSchema.sql.ts`
- Modify: `src/main/database/packagedSchema/metadataRequiredColumns.ts`
- Modify: `src/main/database/packagedSchema/metadataColumnPatches.ts`
- Modify: `src/main/database/main/databaseSchemaBootstrap.ts`
- Create: `src/main/services/core/project/projectRevisionStore.ts`
- Create: `tests/main/services/projectRevisionStore.test.ts`
- Generate locally (gitignored): `drizzle/main/0001_save_integrity_revisions.sql`

**Interfaces:**
- Produces: `bumpProjectRevision(tx, projectId, nowIso): number`
- Produces: `getProjectRevisionState(projectId): Promise<{ revision: number; exportedRevision: number }>`
- Produces: `markProjectExported(projectId, revision): Promise<void>`
- Produces: `listProjectsNeedingExport(): Promise<string[]>`

- [x] **Step 1: revision 불변식 실패 테스트 작성**

`projectRevisionStore.test.ts`는 실제 임시 SQLite DB를 사용해 다음을 검증한다.

```ts
it("never advances exportedRevision beyond the current project revision", async () => {
  const revision = await bumpProjectRevision(db.getClient(), projectId, now);
  expect(revision).toBe(1);

  await markProjectExported(projectId, 1);
  await expect(getProjectRevisionState(projectId)).resolves.toEqual({
    revision: 1,
    exportedRevision: 1,
  });

  await expect(markProjectExported(projectId, 2)).rejects.toMatchObject({
    code: ErrorCode.VALIDATION_FAILED,
  });
});
```

- [x] **Step 2: schema 부재로 실패 확인**

Run: `SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/services/projectRevisionStore.test.ts --run`

Expected: `revision` 또는 `exportedRevision` column/export 부재로 FAIL.

Actual: schema default 부재와 `bumpProjectRevision`이 0을 반환하는 RED를 각각 확인했다.

- [x] **Step 3: Drizzle schema와 packaged bootstrap 갱신**

```ts
revision: integer("revision").notNull().default(0),
exportedRevision: integer("exportedRevision").notNull().default(0),
```

첫 줄은 기존 `project` table 정의에, 둘째 줄은 기존 `projectAttachment` table 정의에 추가한다.

`PACKAGED_SCHEMA_BOOTSTRAP_PROJECT_SQL`, metadata required columns, legacy column patch에도 동일한 기본값을 반영한다.

- [x] **Step 4: main migration 생성**

Run: `pnpm exec drizzle-kit generate --config=drizzle.main.config.ts --name=save_integrity_revisions`

Expected: gitignored `drizzle/main/0001_save_integrity_revisions.sql`, snapshot, journal entry 생성. 저장소 정책상 이 산출물은 커밋하지 않고 schema/bootstrap source만 SSOT로 둔다.

Migration SQL에 다음 두 column이 정확히 한 번 포함되는지 확인한다.

```sql
ALTER TABLE `Project` ADD `revision` integer DEFAULT 0 NOT NULL;
ALTER TABLE `ProjectAttachment` ADD `exportedRevision` integer DEFAULT 0 NOT NULL;
```

- [x] **Step 5: revision store 최소 구현**

`bumpProjectRevision`은 전달받은 Drizzle transaction/client로 `revision + 1`과 `updatedAt`을 한 UPDATE에서 수행하고 새 revision을 반환한다. `markProjectExported`는 현재 revision보다 큰 값과 기존 exported revision보다 작은 값을 거부한다.

```ts
export function bumpProjectRevision(
  client: MainDbClient,
  projectId: string,
  nowIso: string,
): number {
  const row = client
    .update(project)
    .set({ revision: sql`${project.revision} + 1`, updatedAt: nowIso })
    .where(eq(project.id, projectId))
    .returning({ revision: project.revision })
    .get();
  if (!row) throw new AppError(ErrorCode.NOT_FOUND, "Project not found");
  return row.revision;
}

export async function getProjectRevisionState(
  projectId: string,
): Promise<{ revision: number; exportedRevision: number }>;

export async function markProjectExported(
  projectId: string,
  revision: number,
): Promise<void>;

export async function listProjectsNeedingExport(): Promise<string[]>;
```

- [x] **Step 6: schema와 store 테스트 실행**

Run: `SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/services/projectRevisionStore.test.ts tests/main/database/schemaParity.test.ts tests/main/database/drizzleBootstrap.test.ts --run`

Expected: PASS.

Actual (2026-07-18): revision store 2 tests, schema parity 10 tests, Electron runtime bootstrap 4 tests PASS; Drizzle check, 대상 ESLint, typecheck PASS. 검증 중 레거시 column patch보다 bootstrap index가 먼저 실행되던 기존 순서 버그를 `databaseSchemaBootstrap.ts`에서 수정했다.

Run: `pnpm run check:drizzle:main`

Expected: PASS.

- [x] **Step 7: Task 3 커밋**

```bash
git add src/main/database/schema/foundation.ts src/main/database/main/packagedSchema/projectSchema.sql.ts src/main/database/packagedSchema/metadataRequiredColumns.ts src/main/database/packagedSchema/metadataColumnPatches.ts src/main/database/main/databaseSchemaBootstrap.ts src/main/services/core/project/projectRevisionStore.ts tests/main/services/projectRevisionStore.test.ts
git commit -m "feat(storage): track project export revisions"
```

---

### Task 4: world entity patch transaction과 빠른 ACK

**Status:** 완료

**Files:**
- Modify: `src/shared/types/world.ts`
- Modify: `src/shared/schemas/world.ts`
- Modify: `src/renderer/src/shared/store/createWorldEntityCRUDStore.ts`
- Modify: `src/renderer/src/features/research/components/wiki/hooks/useCharacterWikiAttrs.ts`
- Modify: `src/renderer/src/features/research/components/wiki/EntityDetailView.tsx`
- Create: `src/main/services/features/world/entities/worldEntityUpdateHelpers.ts`
- Modify: `src/main/services/features/world/entities/characterService.ts`
- Modify: `src/main/services/features/world/entities/eventService.ts`
- Modify: `src/main/services/features/world/entities/factionService.ts`
- Modify: `src/main/services/features/world/entities/termService.ts`
- Modify: `src/main/services/features/project/projectService.ts`
- Modify: `src/shared/constants/runtime/interactionTiming.ts`
- Create: `tests/main/services/worldEntitySaveIntegrity.test.ts`
- Modify: `tests/renderer/stores/characterStoreMutationLock.test.ts`
- Verify: `tests/main/handler/ipcInputValidation.system.test.ts`
- Modify: `tests/scripts/packageDurabilityBoundary.test.ts`

**Interfaces:**
- Adds: `attributesPatch?: Record<string, unknown>` to character/event/faction update input
- Produces: `mergeStructuredAttributes(current, patch): Record<string, unknown>`
- Consumes: `bumpProjectRevision(tx, projectId, nowIso)` from Task 3
- Changes: world entity create/update/delete schedule `.luie` export after SQLite commit instead of awaiting full export

- [x] **Step 1: attributes patch와 ACK 경계 실패 테스트 작성**

`worldEntitySaveIntegrity.test.ts`에 실제 DB 기반으로 다음을 작성한다.

```ts
it("merges character attributes and commits revision before scheduling export", async () => {
  const character = await seedCharacter({
    projectId,
    attributes: { role: "lead", color: "blue" },
  });
  const scheduleSpy = vi.spyOn(projectService, "schedulePackageExport");

  const updated = await characterService.updateCharacter({
    id: character.id,
    attributesPatch: { color: "red" },
  });

  expect(JSON.parse(String(updated.attributes))).toMatchObject({
    role: "lead",
    color: "red",
  });
  await expect(getProjectRevisionState(projectId)).resolves.toMatchObject({
    revision: 1,
    exportedRevision: 0,
  });
  expect(scheduleSpy).toHaveBeenCalledWith(projectId, "character:update");
});
```

- [x] **Step 2: schema/input 부재로 실패 확인**

Run: `SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/services/worldEntitySaveIntegrity.test.ts tests/main/handler/ipcInputValidation.system.test.ts --run`

Expected: `attributesPatch`가 제거되거나 revision이 증가하지 않아 FAIL.

- [x] **Step 3: shared patch 계약 추가**

character/event/faction update type과 Zod schema에 다음을 추가한다.

```ts
attributesPatch?: Record<string, unknown>;
```

Zod:

```ts
attributesPatch: z.record(z.string(), z.unknown()).optional(),
```

기존 `attributes`는 import, 오래된 renderer, plugin 호환성을 위해 유지한다. 두 값이 함께 오면 `attributes`를 base로 하고 `attributesPatch`를 마지막에 병합한다.

renderer의 wiki 편집기는 전체 attribute snapshot을 보내지 않고 변경한 key만 보낸다.

```ts
updateCharacter({
  id: character.id,
  attributesPatch: { [key]: value },
});

void updateEntity({
  id: entity.id,
  attributesPatch: { [key]: value },
});
```

`useCharacterWikiAttrs.setManyAttrs`도 `attributesPatch: updates`를 전송한다. 기존 `characterStoreMutationLock.test.ts`에 서로 다른 key를 연속 변경했을 때 두 patch가 queue에서 병합되고 어느 key도 사라지지 않는지 검증하는 회귀 테스트를 추가한다.

`createWorldEntityCRUDStore`의 queue merge도 `attributesPatch`만 중첩 병합한다.

```ts
const mergeWorldEntityUpdate = (left, right) => ({
  ...(left ?? {}),
  ...right,
  ...(left?.attributesPatch || right.attributesPatch
    ? {
        attributesPatch: {
          ...(left?.attributesPatch ?? {}),
          ...(right.attributesPatch ?? {}),
        },
      }
    : {}),
});
```

- [x] **Step 4: entity update를 단일 transaction으로 변경**

character/event/faction은 transaction 안에서 현재 row를 조회하고 structured attributes를 병합한 뒤 entity update와 `bumpProjectRevision`을 실행한다. term은 scalar patch update와 revision 증가만 같은 transaction에 둔다.

```ts
export const mergeStructuredAttributes = (
  current: unknown,
  replacement: Record<string, unknown> | undefined,
  patch: Record<string, unknown> | undefined,
): Record<string, unknown> => ({
  ...parseStructuredAttributes(current),
  ...(replacement ?? {}),
  ...(patch ?? {}),
});

const updated = db.getClient().transaction((tx) => {
  const current = findCharacterById(tx, input.id);
  const attributes = mergeStructuredAttributes(
    current.attributes,
    input.attributes,
    input.attributesPatch,
  );
  const next = updateCharacterRow(tx, input, attributes);
  bumpProjectRevision(tx, current.projectId, nowIso);
  return next;
});
```

transaction commit 후에는 다음만 실행한다.

```ts
projectService.schedulePackageExport(projectId, "character:update");
return updated;
```

name/term 변경에 따른 appearance rebuild는 `void ...catch(logger.warn)`으로 projection 작업으로 분리한다. create/delete에도 revision 증가와 scheduled export를 적용해 revision 불변식을 유지한다.

- [x] **Step 5: package export debounce를 1500ms로 변경**

```ts
export const PACKAGE_EXPORT_DEBOUNCE_MS = 1500;
```

`DEBOUNCED_PACKAGE_EXPORT_REASONS`에 character, term, event, faction의 create/update/delete reason을 추가한다. `persistPackageAfterMutation`은 해당 reason에서 즉시 export를 기다리지 않는다.

- [x] **Step 6: 잘못된 durability guard 수정**

`packageDurabilityBoundary.test.ts`는 service에 `schedulePackageExport` 문자열이 없음을 검사하지 않는다. 대신 모든 canonical mutation이 `bumpProjectRevision`과 중앙 `persistPackageAfterMutation` 또는 `schedulePackageExport`를 거치는지 검사한다.

- [x] **Step 7: Task 4 테스트 실행**

Run: `ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron ./node_modules/vitest/vitest.mjs tests/main/services/worldEntitySaveIntegrity.test.ts tests/renderer/stores/characterStoreMutationLock.test.ts tests/main/handler/ipcInputValidation.system.test.ts tests/scripts/packageDurabilityBoundary.test.ts --run`

Expected: PASS.

Actual (2026-07-18): 핵심 4 files, 19 tests PASS; queue/CRUD 회귀 3 files, 11 tests PASS; graph delta 3 tests PASS; 대상 ESLint, `./node_modules/.bin/tsc6 --noEmit`, `git diff --check` PASS. 로컬 native module이 Electron ABI로 빌드되어 실제 DB 테스트는 Electron Node 런타임으로 실행했다.

- [x] **Step 8: Task 4 커밋**

```bash
git add docs/superpowers/plans/2026-07-18-save-integrity.md src/shared/types/world.ts src/shared/schemas/world.ts src/renderer/src/shared/store/createWorldEntityCRUDStore.ts src/renderer/src/features/research/components/wiki/hooks/useCharacterWikiAttrs.ts src/renderer/src/features/research/components/wiki/EntityDetailView.tsx src/main/services/features/world/entities/worldEntityUpdateHelpers.ts src/main/services/features/world/entities/characterService.ts src/main/services/features/world/entities/eventService.ts src/main/services/features/world/entities/factionService.ts src/main/services/features/world/entities/termService.ts src/main/services/features/project/projectService.ts src/shared/constants/runtime/interactionTiming.ts tests/main/services/worldEntitySaveIntegrity.test.ts tests/renderer/stores/characterStoreMutationLock.test.ts tests/scripts/packageDurabilityBoundary.test.ts
git commit -m "fix(storage): commit world entity patches first"
```

---

### Task 5: revision-aware `.luie` checkpoint와 복구

**Status:** 완료

**Files:**
- Modify: `src/main/services/features/project/projectService.ts`
- Modify: `src/main/services/core/project/projectExportQueue.ts`
- Modify: `src/main/lifecycle/app-ready/appReady.ts`
- Modify: `tests/main/services/projectExportQueue.test.ts`
- Modify: `tests/main/services/projectService.immediateDurability.test.ts`
- Modify: `tests/main/services/projectRevisionStore.test.ts`
- Create: `tests/main/services/projectCheckpointRecovery.test.ts`

**Interfaces:**
- Changes: `ProjectExportRun(projectId, revision): Promise<boolean>`
- Produces: `ProjectService.checkpointProject(projectId, reason): Promise<boolean>`
- Produces: `ProjectService.scheduleStalePackageExports(): Promise<number>`

- [x] **Step 1: export 도중 새 revision이 생기는 실패 테스트 작성**

```ts
it("keeps a project dirty when a newer revision appears during export", async () => {
  revisionState.mockResolvedValueOnce({ revision: 1, exportedRevision: 0 });
  const firstExport = deferred<boolean>();
  runExport
    .mockReturnValueOnce(firstExport.promise)
    .mockResolvedValueOnce(true);

  queue.schedule("project-1", "character:update");
  await waitFor(() => expect(runExport).toHaveBeenCalledTimes(1));
  revisionState.mockResolvedValue({ revision: 2, exportedRevision: 0 });
  firstExport.resolve(true);
  await queue.flush();

  expect(markProjectExported).toHaveBeenNthCalledWith(1, "project-1", 1);
  expect(runExport).toHaveBeenCalledTimes(2);
  expect(markProjectExported).toHaveBeenLastCalledWith("project-1", 2);
});
```

`projectCheckpointRecovery.test.ts`에는 다음 recovery 대상 필터를 고정한다.

```ts
it("schedules only attached projects whose checkpoint is stale", async () => {
  listProjectsNeedingExport.mockResolvedValue(["project-stale"]);

  await expect(projectService.scheduleStalePackageExports()).resolves.toBe(1);
  expect(projectExportQueue.schedule).toHaveBeenCalledOnce();
  expect(projectExportQueue.schedule).toHaveBeenCalledWith(
    "project-stale",
    "startup-recovery",
  );
});
```

- [x] **Step 2: 현재 queue가 revision을 모르는 상태로 실패 확인**

Run: `SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/services/projectExportQueue.test.ts tests/main/services/projectCheckpointRecovery.test.ts --run`

Expected: revision 인자 또는 recovery method 부재로 FAIL.

- [x] **Step 3: export callback에 captured revision 전달**

queue run loop는 실행 직전에 `getProjectRevisionState(projectId).revision`을 캡처한다. export 성공 후에만 `markProjectExported(projectId, capturedRevision)`을 호출한다. 성공 뒤 최신 revision이 더 크면 `dirty = true`로 유지해 다음 loop에서 재실행한다.

```ts
export type ProjectExportRun = (
  projectId: string,
  revision: number,
) => Promise<boolean>;

const { revision: capturedRevision } =
  await getProjectRevisionState(projectId);
const exported = await runExport(projectId, capturedRevision);
if (exported) await markProjectExported(projectId, capturedRevision);
const latest = await getProjectRevisionState(projectId);
state.dirty = latest.revision > capturedRevision;
```

- [x] **Step 4: startup recovery 연결**

`runDeferredStartupMaintenance`에서 bootstrap 성공 뒤 `projectService.scheduleStalePackageExports()`를 호출한다. 이 method는 attachment가 있고 `revision > exportedRevision`인 프로젝트만 기존 queue에 예약한다.

```ts
async scheduleStalePackageExports(): Promise<number> {
  const projectIds = await listProjectsNeedingExport();
  for (const projectId of projectIds) {
    this.schedulePackageExport(projectId, "startup-recovery");
  }
  return projectIds.length;
}
```

- [x] **Step 5: 기존 atomic writer 재사용 검증**

`projectExportEngine`과 `luieSqliteContainer`는 수정하지 않는다. 기존 `luieContainer.test.ts`의 실제 `.luie` round-trip과 이전 파일 보존 테스트로 temp file + atomic replace 경계를 확인한다.

- [x] **Step 6: checkpoint 테스트 실행**

Run: `SKIP_DB_TEST_SETUP=1 ./node_modules/.bin/vitest tests/main/services/projectExportQueue.test.ts tests/main/services/projectService.immediateDurability.test.ts tests/main/services/projectCheckpointRecovery.test.ts tests/main/services/projectRevisionStore.test.ts --run`

Run (native `.luie` round-trip): `ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron ./node_modules/vitest/vitest.mjs tests/main/services/luieContainer.test.ts --run`

Expected: PASS.

Actual (2026-07-19): checkpoint/recovery 4 files, 12 tests PASS; 실제 `.luie` atomic container 12 tests PASS; 대상 ESLint, `./node_modules/.bin/tsc6 --noEmit`, `git diff --check` PASS.

- [x] **Step 7: Task 5 커밋**

```bash
git add docs/superpowers/plans/2026-07-18-save-integrity.md src/main/services/features/project/projectService.ts src/main/services/core/project/projectExportQueue.ts src/main/lifecycle/app-ready/appReady.ts tests/main/services/projectExportQueue.test.ts tests/main/services/projectService.immediateDurability.test.ts tests/main/services/projectRevisionStore.test.ts tests/main/services/projectCheckpointRecovery.test.ts
git commit -m "feat(storage): recover stale project checkpoints"
```

---

### Task 6: `Cmd/Ctrl+S`와 종료 시 전체 flush

**Status:** 부분 완료 — manual-save/quit 연결 완료, 활성 input flush와 실패 전파 미구현

**Files:**
- Modify: `src/shared/api/settings.contract.ts`
- Modify: `src/shared/api/io.contract.ts`
- Modify: `src/preload/api/systemApi.ts`
- Modify: `src/preload/api/types.ts`
- Modify: `src/preload/api/windowApi.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/main/handler/writing/ipcAutoSaveHandlers.ts`
- Modify: `src/main/handler/writing/index.ts`
- Modify: `src/main/handler/index.ts`
- Create: `src/renderer/src/features/workspace/services/saveCoordinator.ts`
- Modify: `src/renderer/src/features/workspace/components/useEditorRootShortcuts.ts`
- Modify: `src/renderer/src/features/workspace/components/layout/EditorRoot.tsx`
- Create: `tests/main/handler/manualSaveHandler.test.ts`
- Create: `tests/renderer/services/saveCoordinator.test.ts`
- Create: `tests/dom/projectSaveShortcut.test.tsx`
- Modify: `tests/main/handler/ipcInputValidation.shared.ts`
- Modify: `tests/main/handler/ipcInputValidation.system.test.ts`
- Modify: `tests/scripts/preloadContractRegression.test.ts`

**Interfaces:**
- Changes: `api.app.manualSave(projectId: string): Promise<IPCResponse<{ success: boolean; exported: boolean }>>`
- Produces: `saveProjectNow(projectId: string): Promise<void>`
- Adds: `api.lifecycle.onBeforeQuit(callback: () => void): () => void`
- Adds: `api.lifecycle.completeFlush(): Promise<void>`

- [x] **Step 1: manual save 순서 실패 테스트 작성**

`saveCoordinator.test.ts`에서 다음 순서를 검증한다.

```ts
it("drains renderer mutations before forcing the main checkpoint", async () => {
  const calls: string[] = [];
  vi.mocked(flushWorldEntityMutations).mockImplementation(async () => {
    calls.push("world");
  });
  mockedApi.app.manualSave.mockImplementation(async () => {
    calls.push("main");
    return { success: true, data: { success: true, exported: true } };
  });

  await saveProjectNow("project-1");
  expect(calls).toEqual(["world", "main"]);
});
```

`manualSaveHandler.test.ts`는 `autoSaveManager.flushAll()` 뒤 `projectService.exportProjectPackageNow(projectId, "manual-save")`가 호출되는지 검증한다.

- [x] **Step 2: API 부재로 실패 확인**

Run: `SKIP_DB_TEST_SETUP=1 pnpm vitest tests/renderer/services/saveCoordinator.test.ts tests/main/handler/manualSaveHandler.test.ts --run`

Expected: `manualSave(projectId)` 또는 coordinator 부재로 FAIL.

- [x] **Step 3: 기존 MANUAL_SAVE IPC를 프로젝트 flush로 확장**

handler 입력 schema는 `z.tuple([projectIdSchema])`다. 처리 순서는 다음으로 고정한다.

```ts
await autoSaveManager.flushAll();
const exported = await projectService.exportProjectPackageNow(
  projectId,
  "manual-save",
);
return { success: true, exported };
```

preload와 shared `RendererApi.app` contract의 `manualSave`에 `projectId`를 추가한다.

```ts
manualSave: (
  projectId: string,
) => Promise<IPCResponse<{ success: boolean; exported: boolean }>>;
```

- [x] **Step 4: renderer save coordinator 연결**

```ts
export async function saveProjectNow(projectId: string): Promise<void> {
  await flushWorldEntityMutations();
  const response = await api.app.manualSave(projectId);
  if (!response.success) {
    throw new Error(response.error?.message ?? "Failed to save project");
  }
}
```

기존 `chapter.save` shortcut handler는 먼저 현재 원고 `handleSave`를 호출한 뒤 `saveProjectNow(currentProjectId)`를 호출한다. shortcut id와 기본 `Cmd/Ctrl+S` 설정은 유지한다.

재검증 결과, `handleSave`와 `saveProjectNow` 전에 활성 `BufferedInput` 및 원고 제목 debounce를 강제 flush하는 공통 경계는 없다. 따라서 이 단계는 목표 저장 순서를 완전히 충족하지 않는다.

- [x] **Step 5: 종료 handshake를 renderer flush까지 확장**

preload는 `APP_BEFORE_QUIT`에서 곧바로 완료 응답을 보내지 않는다. `lifecycle.onBeforeQuit`으로 renderer에 알리고, renderer는 `flushWorldEntityMutations()` 후 `lifecycle.completeFlush()`를 호출한다. `PreloadApiModuleContext.completeAppFlush`는 preload autoSave/log queue까지 flush한 뒤 기존 `APP_FLUSH_COMPLETE` payload를 전송한다.

```ts
type PreloadApiModuleContext = {
  completeAppFlush: () => Promise<void>;
};

lifecycle: {
  onBeforeQuit: (callback) => {
    const listener = () => callback();
    ipcRenderer.on(IPC_CHANNELS.APP_BEFORE_QUIT, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.APP_BEFORE_QUIT, listener);
    };
  },
  completeFlush: () => completeAppFlush(),
};
```

`EditorRoot`는 한 번만 listener를 등록하고 다음 순서를 보장한다.

```ts
return api.lifecycle.onBeforeQuit(() => {
  void flushWorldEntityMutations().finally(() =>
    api.lifecycle.completeFlush(),
  );
});
```

world queue pending count가 0보다 크면 기존 `rendererDirty`에도 반영한다. main shutdown timeout과 사용자 선택 정책은 변경하지 않는다.

재검증 결과, world flush 실패에도 `finally`에서 완료 handshake를 보내며 main은 export flush의 `failed > 0`을 종료 차단 조건으로 사용하지 않는다. 실패 전파와 재요청 정책은 후속 Task에서 보완한다.

- [x] **Step 6: shortcut 및 preload 계약 테스트 실행**

Run: `SKIP_DB_TEST_SETUP=1 ./node_modules/.bin/vitest tests/renderer/services/saveCoordinator.test.ts tests/main/handler/manualSaveHandler.test.ts tests/dom/projectSaveShortcut.test.tsx tests/scripts/preloadContractRegression.test.ts tests/main/handler/ipcInputValidation.system.test.ts tests/renderer/stores/worldEntityMutationQueue.test.ts --run`

Expected: PASS.

Actual (2026-07-19): 6 files, 25 tests PASS; 대상 ESLint, `./node_modules/.bin/tsc6 --noEmit`, `git diff --check` PASS. preload `manualSave`는 main IPC 전에 preload autosave queue를 추가로 flush한다.

- [x] **Step 7: Task 6 커밋**

```bash
git add docs/superpowers/plans/2026-07-18-save-integrity.md src/shared/api/settings.contract.ts src/shared/api/io.contract.ts src/preload/api/systemApi.ts src/preload/api/types.ts src/preload/api/windowApi.ts src/preload/index.ts src/main/handler/writing/ipcAutoSaveHandlers.ts src/main/handler/writing/index.ts src/main/handler/index.ts src/renderer/src/features/workspace/services/saveCoordinator.ts src/renderer/src/features/workspace/components/useEditorRootShortcuts.ts src/renderer/src/features/workspace/components/layout/EditorRoot.tsx tests/main/handler/manualSaveHandler.test.ts tests/renderer/services/saveCoordinator.test.ts tests/dom/projectSaveShortcut.test.tsx tests/main/handler/ipcInputValidation.shared.ts tests/main/handler/ipcInputValidation.system.test.ts tests/scripts/preloadContractRegression.test.ts
git commit -m "feat(storage): flush projects with save shortcut"
```

---

### Task 7: 통합 정합성 검증과 품질 게이트

**Status:** 부분 완료 — 정상 경로 검증 통과, 실패 주입·실제 재시작·P95 검증 미완료

**Files:**
- Create: `tests/renderer/stores/worldEntitySaveBurst.test.ts`
- Create: `tests/main/services/projectSaveRecovery.integration.test.ts`
- Create: `src/renderer/src/features/workspace/hooks/useProjectQuitFlush.ts`
- Modify: `src/renderer/src/features/workspace/components/layout/EditorRoot.tsx`
- Modify: `src/main/services/features/project/projectService.ts`
- Modify: `docs/superpowers/specs/2026-07-18-save-integrity-design.md`

**Interfaces:**
- Verifies: mock API에서 100회 연속 patch의 마지막 값 보존
- Verifies: 직접 seed한 stale revision의 같은 프로세스 recovery와 `.luie` round-trip
- Does not verify: manual save 뒤 revision 수렴, 실제 export 실패 후 프로세스 재시작

- [x] **Step 1: 100회 연속 저장 통합 테스트 작성**

```ts
it("persists the final value from one hundred queued character patches", async () => {
  let persistedDescription = "";
  mockedApi.character.update.mockImplementation(async (input) => {
    persistedDescription = input.description ?? persistedDescription;
    return {
      success: true,
      data: { ...character, description: persistedDescription },
    };
  });
  useCharacterStore.setState({ items: [character], currentItem: character });

  const saves: Array<Promise<Character | null>> = [];
  for (let index = 1; index <= 100; index += 1) {
    saves.push(
      useCharacterStore.getState().updateCharacter({
        id: character.id,
        description: `revision-${index}`,
      }),
    );
  }
  await flushWorldEntityMutations();
  await Promise.all(saves);

  expect(persistedDescription).toBe("revision-100");
  expect(useCharacterStore.getState().currentItem?.description).toBe(
    "revision-100",
  );
});
```

- [x] **Step 2: crash recovery 통합 테스트 작성**

revision 2, exportedRevision 1 상태의 실제 임시 DB와 `.luie`를 만든 뒤 `scheduleStalePackageExports()` 및 queue flush를 실행한다. 최종 `.luie`를 다시 읽어 최신 캐릭터 값과 exportedRevision 2를 확인한다.

```ts
await seedRevisionState({
  projectId,
  revision: 2,
  exportedRevision: 1,
  characterDescription: "latest",
});

await expect(projectService.scheduleStalePackageExports()).resolves.toBe(1);
await projectService.flushPendingExports();

const reopened = await readLuieProject(projectPath);
expect(reopened.characters).toContainEqual(
  expect.objectContaining({ id: characterId, description: "latest" }),
);
await expect(getProjectRevisionState(projectId)).resolves.toEqual({
  revision: 2,
  exportedRevision: 2,
});
```

- [x] **Step 3: 타깃 테스트 실행**

Run: `SKIP_DB_TEST_SETUP=1 ./node_modules/.bin/vitest tests/dom/bufferedInputSavePolicy.test.tsx tests/renderer/stores/worldEntityMutationQueue.test.ts tests/renderer/stores/characterStoreMutationLock.test.ts tests/renderer/stores/worldBuildingStore.graph.test.ts tests/main/services/projectRevisionStore.test.ts tests/main/services/projectCheckpointRecovery.test.ts tests/main/handler/manualSaveHandler.test.ts tests/renderer/services/saveCoordinator.test.ts tests/renderer/stores/worldEntitySaveBurst.test.ts --run`

Run (real DB/FS): `ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron ./node_modules/vitest/vitest.mjs tests/main/services/worldEntitySaveIntegrity.test.ts tests/main/services/projectSaveRecovery.integration.test.ts --run`

Expected: PASS.

Actual: 11 files, 23 tests PASS. 이 숫자는 정상 경로 회귀 통과를 의미하며, SQLite 기반 100회 저장이나 실제 export 실패·프로세스 재시작을 증명하지 않는다.

- [x] **Step 4: 저장소 정책 게이트 실행**

Run: `pnpm run check:ipc-handler-schemas`

Expected: PASS.

Run: `pnpm run check:drizzle:main`

Expected: PASS.

Run: `pnpm run typecheck`

Expected: PASS.

Run: `pnpm run lint`

Expected: PASS.

Actual: IPC schema, Drizzle main, typecheck, 변경 파일 ESLint, derived DB benchmark PASS. 전체 lint는 기존 20 errors/1 warning으로 FAIL했다.

- [x] **Step 5: 전체 core QA 실행**

Run: `pnpm run qa:core`

Expected: PASS. Native ABI 문제만 발생하면 코드 실패와 분리해 `pnpm rebuild better-sqlite3` 후 한 번 재실행한다.

Actual: core test 묶음 27 files/179 tests PASS, 기존 4 files/13 tests FAIL. 추가 baseline gate 실패는 `graphStore` persist 계약, 기존 500 LOC 초과 7 files, 기존 build chunk warning이다. 이번 변경으로 LOC 한도를 넘었던 `EditorRoot`와 `projectService`는 정리 완료했다.

- [x] **Step 6: 설계 문서 상태 갱신**

당시 `docs/superpowers/specs/2026-07-18-save-integrity-design.md`의 상태를 `구현 완료, 검증 통과`로 변경했다. 2026-07-19 재검증에서 검증 범위 과장을 확인해 `부분 구현`으로 정정하고 P0/P1 차단 항목을 문서 마지막에 기록했다.

- [x] **Step 7: Task 7 커밋**

```bash
git add docs/superpowers/plans/2026-07-18-save-integrity.md docs/superpowers/specs/2026-07-18-save-integrity-design.md tests/renderer/stores/worldEntitySaveBurst.test.ts tests/main/services/projectSaveRecovery.integration.test.ts src/renderer/src/features/workspace/hooks/useProjectQuitFlush.ts src/renderer/src/features/workspace/components/layout/EditorRoot.tsx src/main/services/features/project/projectService.ts
git commit -m "test(storage): verify save integrity recovery"
```

---

### Task 8: renderer save-buffer registry와 shared input 등록

**Status:** 완료

**Files:**
- Create: `src/shared/ui/saveBufferRegistry.ts`
- Create: `tests/renderer/services/saveBufferRegistry.test.ts`
- Modify: `src/shared/ui/BufferedInput.tsx`
- Modify: `tests/dom/bufferedInputSavePolicy.test.tsx`
- Modify: `docs/superpowers/plans/2026-07-18-save-integrity.md`
- Modify: `docs/superpowers/specs/2026-07-18-save-integrity-design.md`

**Interfaces:**
- Produces: `registerSaveBufferFlush(flush: SaveBufferFlush): () => void`
- Produces: `flushSaveBuffers(): Promise<void>`
- Produces: `SaveBufferFlush = () => void | Promise<void>`
- Consumes later: Task 9의 editor autosave와 Task 10의 manual save/quit coordinator

- [x] **Step 1: registry가 모든 callback을 기다리고 실패를 전파하는 RED 테스트 작성**

```ts
import { describe, expect, it, vi } from "vitest";
import {
  flushSaveBuffers,
  registerSaveBufferFlush,
} from "../../../src/shared/ui/saveBufferRegistry.js";

describe("saveBufferRegistry", () => {
  it("waits for every registered buffer before reporting a failure", async () => {
    const calls: string[] = [];
    const unregisterFirst = registerSaveBufferFlush(async () => {
      calls.push("first");
      await Promise.resolve();
    });
    const unregisterSecond = registerSaveBufferFlush(async () => {
      calls.push("second");
      throw new Error("buffer failed");
    });

    await expect(flushSaveBuffers()).rejects.toThrow("buffer failed");
    expect(calls).toEqual(["first", "second"]);

    unregisterFirst();
    unregisterSecond();
    await expect(flushSaveBuffers()).resolves.toBeUndefined();
  });
});
```

- [x] **Step 2: registry 테스트가 module 부재로 실패하는지 확인**

Run: `SKIP_DB_TEST_SETUP=1 ./node_modules/.bin/vitest run --no-file-parallelism tests/renderer/services/saveBufferRegistry.test.ts`

Expected: FAIL with `Cannot find module .../saveBufferRegistry`.

- [x] **Step 3: 최소 registry 구현**

```ts
export type SaveBufferFlush = () => void | Promise<void>;

const flushers = new Set<SaveBufferFlush>();

export function registerSaveBufferFlush(flush: SaveBufferFlush): () => void {
  flushers.add(flush);
  return () => flushers.delete(flush);
}

export async function flushSaveBuffers(): Promise<void> {
  const results = await Promise.allSettled(
    [...flushers].map((flush) => Promise.resolve().then(flush)),
  );
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (failure) throw failure.reason;
}
```

- [x] **Step 4: shared input의 timer 이전 global flush RED 테스트 작성**

`tests/dom/bufferedInputSavePolicy.test.tsx`에 `BufferedTextArea`와 `flushSaveBuffers`를 import하고 다음 테스트를 추가한다.

```tsx
it("flushes a dirty input before its debounce timer", async () => {
  vi.useFakeTimers();
  const onSave = vi.fn();
  const { input } = mountInput(onSave);

  act(() => input.focus());
  changeInput(input, "즉시 저장");
  await act(async () => flushSaveBuffers());

  expect(onSave).toHaveBeenCalledOnce();
  expect(onSave).toHaveBeenCalledWith("즉시 저장");
  await act(async () => vi.advanceTimersByTimeAsync(250));
  expect(onSave).toHaveBeenCalledOnce();
});

it("flushes a focused textarea without blur", async () => {
  const onSave = vi.fn();
  const { textarea } = mountTextArea(onSave);

  act(() => textarea.focus());
  changeTextArea(textarea, "포커스된 본문");
  await act(async () => flushSaveBuffers());

  expect(onSave).toHaveBeenCalledOnce();
  expect(onSave).toHaveBeenCalledWith("포커스된 본문");
});

it("removes an unmounted input from the global registry", async () => {
  const onSave = vi.fn();
  const { input, unmount } = mountInput(onSave);
  changeInput(input, "unmount 값");
  unmount();
  onSave.mockClear();

  await act(async () => flushSaveBuffers());
  expect(onSave).not.toHaveBeenCalled();
});
```

- [x] **Step 5: shared input RED 확인**

Run: `SKIP_DB_TEST_SETUP=1 ./node_modules/.bin/vitest run --no-file-parallelism tests/dom/bufferedInputSavePolicy.test.tsx`

Expected: 두 신규 테스트 FAIL. 기존 blur, IME, unmount 3개는 PASS.

- [x] **Step 6: `BufferedInput`과 `BufferedTextArea`를 registry에 등록**

두 component의 `onSave` 타입은 기존 `Promise<T>` callback도 보존하도록 다음으로 통일한다.

```ts
onSave: (value: string) => void | Promise<unknown>;
```

각 component는 최신 flush 함수를 ref로 유지하고 mount 동안 한 번 등록한다. render 중 ref를 쓰지 않고 effect에서 최신 callback을 반영한다.

```ts
const flushRef = useRef<() => void | Promise<unknown>>(() => undefined);

useEffect(() => {
  flushRef.current = flush;
});

useEffect(
  () => registerSaveBufferFlush(async () => {
    await flushRef.current();
  }),
  [],
);
```

`BufferedTextArea`에는 `latestValue`, `lastSavedValue`, `onSaveRef`를 추가하고 change에서 latest 값을 갱신한다. blur, composition end, unmount, registry가 같은 `flush()`를 사용하며 동일 값은 한 번만 전달한다.

- [x] **Step 7: Task 8 GREEN 및 회귀 확인**

Run: `SKIP_DB_TEST_SETUP=1 ./node_modules/.bin/vitest run --no-file-parallelism tests/renderer/services/saveBufferRegistry.test.ts tests/dom/bufferedInputSavePolicy.test.tsx`

Expected: 2 files, 모든 테스트 PASS. stderr warning 없음.

Run: `./node_modules/.bin/tsc6 --noEmit`

Expected: PASS.

Actual (2026-07-19): 6 files, 9 tests PASS; 대상 ESLint와 `git diff --check` PASS. registry module 부재 RED, shared input global flush 2 tests RED, async in-flight/retry 2 tests RED를 확인했다. 같은 값의 in-flight Promise는 공유하고 최신 값은 그 뒤에 직렬화하며, 성공 뒤에만 clean으로 전환해 실패한 값은 재시도한다. 기존 `Promise<T | null>` callback 호환을 위해 shared input callback은 `Promise<unknown>`을 허용하고 registry adapter에서 `Promise<void>`로 수렴한다. `./node_modules/.bin/tsc6 --noEmit`에서 Task 8이 추가한 오류는 없으며, 사용자 소유 dirty 파일의 기존 error 때문에 전체 명령은 exit 2다.

- [x] **Step 8: SSOT 상태와 Task 8 결과 갱신**

이 Task의 `Status`를 `완료`로 바꾸고 실제 files/tests 수를 기록한다. 설계 §17.2의 shared input 두 항목은 구현 완료로 표시하되 editor/manual/quit 항목은 완료로 표시하지 않는다.

- [x] **Step 9: Task 8 커밋**

```bash
git add src/shared/ui/saveBufferRegistry.ts src/shared/ui/BufferedInput.tsx tests/renderer/services/saveBufferRegistry.test.ts tests/dom/bufferedInputSavePolicy.test.tsx docs/superpowers/plans/2026-07-18-save-integrity.md docs/superpowers/specs/2026-07-18-save-integrity-design.md
git commit -m "fix(storage): register shared save buffers"
```

---

### Task 9: editor autosave latest-draft drain

**Status:** 완료

**Files:**
- Create: `tests/dom/editorAutosaveManualFlush.test.tsx`
- Modify: `src/renderer/src/features/editor/hooks/useEditorAutosave.ts`
- Modify: `docs/superpowers/plans/2026-07-18-save-integrity.md`
- Modify: `docs/superpowers/specs/2026-07-18-save-integrity-design.md`

**Interfaces:**
- Consumes: `registerSaveBufferFlush(flush: SaveBufferFlush): () => void`
- Produces: clean editor에서는 no-op이고 dirty editor에서는 최신 title/content의 `onSave` 완료까지 기다리는 registered flush
- Preserves: 기존 debounce, latest pending draft, retry UI와 `api.lifecycle.setDirty`

- [x] **Step 1: debounce 이전 최신 editor draft flush RED 테스트 작성**

`tests/dom/editorAutosaveManualFlush.test.tsx`는 `ToastContext`, i18n, shared API를 mock하고 hook harness를 mount한다.

```tsx
type HarnessProps = {
  title: string;
  content: string;
  onSave: (title: string, content: string) => Promise<void>;
};

const Harness = (props: HarnessProps) => {
  useEditorAutosave(props);
  return null;
};

const mountAutosave = (initial: HarnessProps) => {
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(<Harness {...initial} />));
  return {
    render: (props: HarnessProps) =>
      act(() => root.render(<Harness {...props} />)),
    unmount: () => act(() => root.unmount()),
  };
};
```

```tsx
it("flushes the latest editor draft before autosave debounce", async () => {
  vi.useFakeTimers();
  const onSave = vi.fn(async () => undefined);
  const root = mountAutosave({
    title: "이전 제목",
    content: "이전 본문",
    onSave,
  });

  root.render({ title: "최신 제목", content: "최신 본문", onSave });
  await act(async () => flushSaveBuffers());

  expect(onSave).toHaveBeenCalledOnce();
  expect(onSave).toHaveBeenCalledWith("최신 제목", "최신 본문");
  await act(async () => vi.advanceTimersByTimeAsync(EDITOR_AUTOSAVE_DEBOUNCE_MS));
  expect(onSave).toHaveBeenCalledOnce();
});
```

- [x] **Step 2: in-flight 저장 뒤 latest pending draft까지 기다리는 RED 테스트 작성**

```tsx
it("waits for the latest draft queued behind an in-flight save", async () => {
  vi.useFakeTimers();
  const first = deferred<void>();
  const onSave = vi
    .fn<() => Promise<void>>()
    .mockReturnValueOnce(first.promise)
    .mockResolvedValueOnce(undefined);
  const root = mountAutosave({ title: "A", content: "1", onSave });

  root.render({ title: "B", content: "2", onSave });
  await vi.advanceTimersByTimeAsync(EDITOR_AUTOSAVE_DEBOUNCE_MS);
  root.render({ title: "C", content: "3", onSave });
  const flushPromise = flushSaveBuffers();

  first.resolve();
  await flushPromise;

  expect(onSave).toHaveBeenLastCalledWith("C", "3");
  expect(onSave).toHaveBeenCalledTimes(2);
});

it("rejects manual flush when the latest editor save fails", async () => {
  const onSave = vi.fn(async () => {
    throw new Error("chapter save failed");
  });
  const root = mountAutosave({ title: "A", content: "1", onSave });
  root.render({ title: "B", content: "2", onSave });

  await expect(flushSaveBuffers()).rejects.toThrow("chapter save failed");
});
```

- [x] **Step 3: editor autosave RED 확인**

Run: `SKIP_DB_TEST_SETUP=1 ./node_modules/.bin/vitest run --no-file-parallelism tests/dom/editorAutosaveManualFlush.test.tsx`

Expected: registry에 editor callback이 없어 두 테스트 FAIL.

- [x] **Step 4: 현재 save cycle을 관찰할 ref와 manual flush 추가**

`useEditorAutosave`에 save/error ref를 추가하고 기존 `performSaveRef`의 반환 타입을 `Promise<void>`로 변경한다.

```ts
const currentSavePromiseRef = useRef<Promise<void> | null>(null);
const lastSaveErrorRef = useRef<unknown>(null);
const performSaveRef = useRef<
  ((currentTitle: string, currentContent: string) => Promise<void>) | null
>(null);
```

`performSave`에서 실제 `onSave` promise를 ref에 보관하고 성공 시 error를 지운다.

```ts
const savePromise = Promise.resolve(onSave(currentTitle, currentContent));
currentSavePromiseRef.current = savePromise;
await savePromise;
lastSaveErrorRef.current = null;
```

catch에서는 `lastSaveErrorRef.current = error`를 기록한다. finally에서는 자신이 등록한 promise일 때만 ref를 비운 뒤 기존 latest pending draft를 시작한다.

- [x] **Step 5: 최신 draft가 durable할 때까지 기다리는 registry callback 구현**

```ts
const flushLatestDraft = useCallback(async () => {
  clearTimerRef(debounceTimerRef);
  clearTimerRef(retryTimerRef);
  if (!onSaveRef.current) return;

  for (;;) {
    const currentSave = currentSavePromiseRef.current;
    if (currentSave) {
      await currentSave.catch(() => undefined);
      continue;
    }

    if (lastSaveErrorRef.current) {
      clearTimerRef(retryTimerRef);
      throw lastSaveErrorRef.current;
    }

    const latest = latestDraftRef.current;
    if (
      latest.title === lastSavedRef.current.title &&
      latest.content === lastSavedRef.current.content
    ) {
      return;
    }

    await performSaveRef.current?.(latest.title, latest.content);
  }
}, []);

useEffect(
  () => registerSaveBufferFlush(flushLatestDraft),
  [flushLatestDraft],
);
```

title/content effect에서 새 draft를 받으면 이전 draft의 `lastSaveErrorRef`를 지운다. manual flush 성공 시 debounce timer가 뒤늦게 같은 draft를 다시 저장하지 않아야 한다.

- [x] **Step 6: Task 9 GREEN 및 기존 autosave 회귀 확인**

Run: `SKIP_DB_TEST_SETUP=1 ./node_modules/.bin/vitest run --no-file-parallelism tests/dom/editorAutosaveManualFlush.test.tsx tests/dom/editorReadyCleanup.test.tsx`

Expected: 두 파일의 모든 테스트 PASS. unhandled rejection과 `act(...)` warning 없음.

Run: `./node_modules/.bin/tsc6 --noEmit`

Expected: PASS.

Actual (2026-07-19): 4 files, 6 tests PASS. editor autosave callback 부재로 최신 debounce draft, in-flight 뒤 pending draft, 최신 실패 전파가 각각 RED인 것을 확인했다. 오래된 in-flight 저장 실패는 최신 draft 실패로 취급하지 않고 drain을 계속하며, clean/no-`onSave` hook은 no-op이다. `./node_modules/.bin/tsc6 --noEmit`은 Task 9 오류 없이 사용자 소유 dirty `BinderSidebarPanelBody.tsx`의 기존 `ResearchPanelTab` 오류 1건으로 exit 2다.

- [x] **Step 7: SSOT 상태와 Task 9 결과 갱신**

Task 9를 `완료`로 바꾸고 실제 테스트 결과를 기록한다. 설계 §17.2 editor autosave 항목과 §17.4 latest pending drain을 구현 완료로 표시한다.

- [x] **Step 8: Task 9 커밋**

```bash
git add src/renderer/src/features/editor/hooks/useEditorAutosave.ts tests/dom/editorAutosaveManualFlush.test.tsx docs/superpowers/plans/2026-07-18-save-integrity.md docs/superpowers/specs/2026-07-18-save-integrity-design.md
git commit -m "fix(storage): drain latest editor draft"
```

---

### Task 10: manual save와 quit의 renderer buffer 선행 flush

**Status:** 구현 대기

**Files:**
- Modify: `src/renderer/src/features/workspace/services/saveCoordinator.ts`
- Modify: `src/renderer/src/features/workspace/hooks/useProjectQuitFlush.ts`
- Modify: `src/renderer/src/features/workspace/components/useEditorRootShortcuts.ts`
- Modify: `src/renderer/src/features/workspace/components/layout/EditorRoot.tsx`
- Modify: `tests/renderer/services/saveCoordinator.test.ts`
- Modify: `tests/dom/projectSaveShortcut.test.tsx`
- Create: `tests/dom/projectQuitFlush.test.tsx`
- Modify: `docs/superpowers/plans/2026-07-18-save-integrity.md`
- Modify: `docs/superpowers/specs/2026-07-18-save-integrity-design.md`

**Interfaces:**
- Consumes: `flushSaveBuffers(): Promise<void>`
- Consumes: `flushWorldEntityMutations(): Promise<void>`
- Changes: `saveProjectNow(projectId)` ordering to buffers → world → main
- Changes: quit completion signal is sent only after buffers and world queue both succeed

- [ ] **Step 1: manual save 순서 RED 테스트 확장**

`tests/renderer/services/saveCoordinator.test.ts`에서 registry를 mock하고 순서를 고정한다.

```ts
it("flushes renderer buffers before world mutations and main checkpoint", async () => {
  mocked.flushSaveBuffers.mockImplementationOnce(async () => {
    mocked.calls.push("buffers");
  });
  mocked.flushWorldEntityMutations.mockImplementationOnce(async () => {
    mocked.calls.push("world");
  });
  mocked.manualSave.mockImplementationOnce(async () => {
    mocked.calls.push("main");
    return { success: true, data: { success: true, exported: true } };
  });

  await saveProjectNow("project-1");
  expect(mocked.calls).toEqual(["buffers", "world", "main"]);
});
```

buffer failure 테스트는 `flushWorldEntityMutations`와 `manualSave`가 호출되지 않는지 확인한다.

- [ ] **Step 2: shortcut이 부모의 stale chapter 값을 직접 저장하지 않는 RED 테스트 작성**

`tests/dom/projectSaveShortcut.test.tsx`에서 `handleSave`, `activeChapterTitle`, `content` props를 제거하고 다음만 확인한다.

```ts
await act(async () => mocked.handlers["chapter.save"]?.());

expect(mocked.saveProjectNow).toHaveBeenCalledOnce();
expect(mocked.saveProjectNow).toHaveBeenCalledWith("project-1");
```

Expected current failure: hook props 타입과 구현이 아직 `handleSave(activeChapterTitle, content)`를 요구한다.

- [ ] **Step 3: quit 성공 순서와 실패 차단 RED 테스트 작성**

`tests/dom/projectQuitFlush.test.tsx`에서 hook harness를 mount하고 lifecycle callback을 직접 실행한다.

```tsx
it("completes quit only after buffers and world mutations flush", async () => {
  act(() => mocked.beforeQuit?.());
  await vi.waitFor(() =>
    expect(mocked.calls).toEqual(["buffers", "world", "complete"]),
  );
  expect(mocked.calls).toEqual(["buffers", "world", "complete"]);
});

it("does not complete quit when a renderer buffer fails", async () => {
  mocked.flushSaveBuffers.mockRejectedValueOnce(new Error("buffer failed"));
  act(() => mocked.beforeQuit?.());
  await vi.waitFor(() => expect(mocked.loggerError).toHaveBeenCalledOnce());
  expect(mocked.flushWorldEntityMutations).not.toHaveBeenCalled();
  expect(mocked.completeFlush).not.toHaveBeenCalled();
});
```

- [ ] **Step 4: Task 10 RED 확인**

Run: `SKIP_DB_TEST_SETUP=1 ./node_modules/.bin/vitest run --no-file-parallelism tests/renderer/services/saveCoordinator.test.ts tests/dom/projectSaveShortcut.test.tsx tests/dom/projectQuitFlush.test.tsx`

Expected: buffers-first ordering과 quit failure 차단 테스트 FAIL.

- [ ] **Step 5: coordinator와 quit hook에 registry 선행 flush 연결**

```ts
export async function saveProjectNow(projectId: string): Promise<void> {
  await flushSaveBuffers();
  await flushWorldEntityMutations();
  const response = await api.app.manualSave(projectId);
  if (!response.success) {
    throw new Error(response.error?.message ?? "Failed to save project");
  }
}
```

quit hook은 `finally` completion을 제거한다.

```ts
void (async () => {
  await flushSaveBuffers();
  await flushWorldEntityMutations();
  await api.lifecycle.completeFlush();
})().catch((error) => {
  void api.logger.error("Failed to flush renderer saves", { error });
});
```

- [ ] **Step 6: shortcut의 stale direct save 제거**

`chapter.save`은 `currentProjectId`가 있을 때 `saveProjectNow(currentProjectId)`만 호출한다. `useEditorRootShortcuts` props와 `EditorRoot` 호출부에서 `handleSave`, `activeChapterTitle`, `content`를 제거한다. 최신 editor draft는 Task 9 registry callback이 저장한다.

- [ ] **Step 7: Task 10 GREEN 및 저장 회귀 확인**

Run: `SKIP_DB_TEST_SETUP=1 ./node_modules/.bin/vitest run --no-file-parallelism tests/renderer/services/saveCoordinator.test.ts tests/dom/projectSaveShortcut.test.tsx tests/dom/projectQuitFlush.test.tsx tests/dom/bufferedInputSavePolicy.test.tsx tests/dom/editorAutosaveManualFlush.test.tsx tests/renderer/stores/worldEntityMutationQueue.test.ts`

Expected: 모든 파일 PASS. stderr warning 없음.

Run: `./node_modules/.bin/tsc6 --noEmit`

Expected: PASS.

- [ ] **Step 8: SSOT 상태 갱신 및 차단 항목 축소**

Task 10을 `완료`로 바꾸고 실제 결과를 기록한다. 설계 §16에서 active input flush P0와 world mutation quit failure를 해결됨으로 이동한다. export queue의 `failed > 0`, 실패 mutation payload 보존, project-wide revision은 미해결로 유지한다.

- [ ] **Step 9: Task 10 커밋**

```bash
git add src/renderer/src/features/workspace/services/saveCoordinator.ts src/renderer/src/features/workspace/hooks/useProjectQuitFlush.ts src/renderer/src/features/workspace/components/useEditorRootShortcuts.ts src/renderer/src/features/workspace/components/layout/EditorRoot.tsx tests/renderer/services/saveCoordinator.test.ts tests/dom/projectSaveShortcut.test.tsx tests/dom/projectQuitFlush.test.tsx docs/superpowers/plans/2026-07-18-save-integrity.md docs/superpowers/specs/2026-07-18-save-integrity-design.md
git commit -m "fix(storage): flush renderer buffers first"
```
