# Save Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** world entity 입력을 SQLite에 빠르고 유실 없이 저장하고, `.luie` 체크포인트와 `Cmd/Ctrl+S`, 종료 flush를 명확한 내구성 경계로 연결한다.

**Architecture:** renderer는 entity별 latest-patch queue로 입력을 직렬화하고 UI를 optimistic하게 갱신한다. main process는 entity mutation과 project revision 증가를 한 SQLite transaction으로 커밋한 뒤 즉시 ACK하고, 기존 `ProjectExportQueue`와 atomic `.luie` writer가 exported revision을 비동기로 따라간다.

**Tech Stack:** Electron 42, React 19, TypeScript 5, Zustand, Drizzle ORM, better-sqlite3, Vitest, Testing Library

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

const { revision: capturedRevision } = await getProjectRevisionState(projectId);
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
manualSave: (projectId: string) =>
  Promise<IPCResponse<{ success: boolean; exported: boolean }>>;
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
  void flushWorldEntityMutations().finally(() => api.lifecycle.completeFlush());
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
  () =>
    registerSaveBufferFlush(async () => {
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
  await act(async () =>
    vi.advanceTimersByTimeAsync(EDITOR_AUTOSAVE_DEBOUNCE_MS),
  );
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

useEffect(() => registerSaveBufferFlush(flushLatestDraft), [flushLatestDraft]);
```

title/content effect에서 새 draft를 받으면 이전 draft의 `lastSaveErrorRef`를 지운다. manual flush 성공 시 debounce timer가 뒤늦게 같은 draft를 다시 저장하지 않아야 한다.

- [x] **Step 6: Task 9 GREEN 및 기존 autosave 회귀 확인**

Run: `SKIP_DB_TEST_SETUP=1 ./node_modules/.bin/vitest run --no-file-parallelism tests/dom/editorAutosaveManualFlush.test.tsx tests/dom/editorReadyCleanup.test.tsx`

Expected: 두 파일의 모든 테스트 PASS. unhandled rejection과 `act(...)` warning 없음.

Run: `./node_modules/.bin/tsc6 --noEmit`

Expected: PASS.

Actual (2026-07-19): 4 files, 10 tests PASS. editor autosave callback 부재로 최신 debounce draft, in-flight 뒤 pending draft, 최신 실패 전파가 각각 RED인 것을 확인했다. 오래된 in-flight 저장 실패는 최신 draft 실패로 취급하지 않고 drain을 계속하며, clean/no-`onSave` hook은 no-op이다. review follow-up에서 mid-flush unmount 직렬화, flush 중 생성된 debounce timer 중복 방지, falsy rejection 전파, in-flight 중 `onSave` 제거 시 종료를 각각 RED→GREEN으로 보강했다. `./node_modules/.bin/tsc6 --noEmit`은 Task 9 오류 없이 사용자 소유 dirty `BinderSidebarPanelBody.tsx`의 기존 `ResearchPanelTab` 오류 1건으로 exit 2다.

- [x] **Step 7: SSOT 상태와 Task 9 결과 갱신**

Task 9를 `완료`로 바꾸고 실제 테스트 결과를 기록한다. 설계 §17.2 editor autosave 항목과 §17.4 latest pending drain을 구현 완료로 표시한다.

- [x] **Step 8: Task 9 커밋**

```bash
git add src/renderer/src/features/editor/hooks/useEditorAutosave.ts tests/dom/editorAutosaveManualFlush.test.tsx docs/superpowers/plans/2026-07-18-save-integrity.md docs/superpowers/specs/2026-07-18-save-integrity-design.md
git commit -m "fix(storage): drain latest editor draft"
```

---

### Task 10: manual save와 quit의 renderer buffer 선행 flush

**Status:** 완료

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

- [x] **Step 1: manual save 순서 RED 테스트 확장**

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

- [x] **Step 2: shortcut이 부모의 stale chapter 값을 직접 저장하지 않는 RED 테스트 작성**

`tests/dom/projectSaveShortcut.test.tsx`에서 `handleSave`, `activeChapterTitle`, `content` props를 제거하고 다음만 확인한다.

```ts
await act(async () => mocked.handlers["chapter.save"]?.());

expect(mocked.saveProjectNow).toHaveBeenCalledOnce();
expect(mocked.saveProjectNow).toHaveBeenCalledWith("project-1");
```

Expected current failure: hook props 타입과 구현이 아직 `handleSave(activeChapterTitle, content)`를 요구한다.

- [x] **Step 3: quit 성공 순서와 실패 차단 RED 테스트 작성**

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

- [x] **Step 4: Task 10 RED 확인**

Run: `SKIP_DB_TEST_SETUP=1 ./node_modules/.bin/vitest run --no-file-parallelism tests/renderer/services/saveCoordinator.test.ts tests/dom/projectSaveShortcut.test.tsx tests/dom/projectQuitFlush.test.tsx`

Expected: buffers-first ordering과 quit failure 차단 테스트 FAIL.

- [x] **Step 5: coordinator와 quit hook에 registry 선행 flush 연결**

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

- [x] **Step 6: shortcut의 stale direct save 제거**

`chapter.save`은 `currentProjectId`가 있을 때 `saveProjectNow(currentProjectId)`만 호출한다. `useEditorRootShortcuts` props와 `EditorRoot` 호출부에서 `handleSave`, `activeChapterTitle`, `content`를 제거한다. 최신 editor draft는 Task 9 registry callback이 저장한다.

- [x] **Step 7: Task 10 GREEN 및 저장 회귀 확인**

Run: `SKIP_DB_TEST_SETUP=1 ./node_modules/.bin/vitest run --no-file-parallelism tests/renderer/services/saveCoordinator.test.ts tests/dom/projectSaveShortcut.test.tsx tests/dom/projectQuitFlush.test.tsx tests/dom/bufferedInputSavePolicy.test.tsx tests/dom/editorAutosaveManualFlush.test.tsx tests/renderer/stores/worldEntityMutationQueue.test.ts`

Expected: 모든 파일 PASS. stderr warning 없음.

Run: `./node_modules/.bin/tsc6 --noEmit`

Expected: PASS.

Actual (2026-07-19): RED에서 3 files, 6 tests가 buffer flush 미연결, stale shortcut save, quit failure completion 때문에 예상대로 FAIL했다. review follow-up에서 world flush 오류의 동일 객체 전파와 main checkpoint 차단 테스트를 추가했고, 오류를 임시로 삼키는 production 변이에서 해당 테스트가 예상대로 FAIL한 뒤 원본을 복원했다. focused GREEN은 3 files, 7 tests, 저장 회귀는 6 files, 26 tests PASS이며 stderr warning이 없다. buffer와 world failure 모두 quit completion을 차단한다. `./node_modules/.bin/tsc6 --noEmit`은 Task 10 오류 없이 사용자 소유 dirty `BinderSidebarPanelBody.tsx:102`의 기존 `ResearchPanelTab` 오류 1건으로 exit 2다.

- [x] **Step 8: SSOT 상태 갱신 및 차단 항목 축소**

Task 10을 `완료`로 바꾸고 실제 결과를 기록한다. 설계 §16에서 active input flush P0와 world mutation quit failure를 해결됨으로 이동한다. export queue의 `failed > 0`, 실패 mutation payload 보존, project-wide revision은 미해결로 유지한다.

- [x] **Step 9: Task 10 커밋**

```bash
git add src/renderer/src/features/workspace/services/saveCoordinator.ts src/renderer/src/features/workspace/hooks/useProjectQuitFlush.ts src/renderer/src/features/workspace/components/useEditorRootShortcuts.ts src/renderer/src/features/workspace/components/layout/EditorRoot.tsx tests/renderer/services/saveCoordinator.test.ts tests/dom/projectSaveShortcut.test.tsx tests/dom/projectQuitFlush.test.tsx docs/superpowers/plans/2026-07-18-save-integrity.md docs/superpowers/specs/2026-07-18-save-integrity-design.md
git commit -m "fix(storage): flush renderer buffers first"
```

---

### Task 11: shared buffer persistence ACK 계약과 실패 수명주기

**Status:** 완료

**Files:**

- Modify: `src/shared/ui/BufferedInput.tsx`
- Modify: `src/renderer/src/features/research/components/world/PlotBoard.tsx`
- Modify: `src/renderer/src/features/research/components/world/SynopsisEditor.tsx`
- Modify: `tests/dom/bufferedInputSavePolicy.test.tsx`
- Create: `tests/dom/worldBufferedPersistence.test.tsx`
- Modify: `docs/superpowers/plans/2026-07-18-save-integrity.md`
- Modify: `docs/superpowers/specs/2026-07-18-save-integrity-design.md`

**Interfaces:**

- Requires: shared input `onSave`가 실제 persistence ACK 또는 동기 enqueue의 drain Promise를 반환한다.
- Changes: IME 조합 중 global flush는 incomplete value를 저장하지 않고 reject한다.
- Changes: background flush rejection은 consume하되 dirty payload를 유지한다.
- Changes: unmount 뒤 실패 payload는 global registry에 남아 후속 flush에서 재시도된다.

- [x] **Step 1: 모든 `BufferedInput`/`BufferedTextArea` callsite를 읽기 전용 감사**

각 callback을 `실제 ACK 반환`, `동기 queue enqueue 반환`, `void/local state`, `Promise 폐기`로 분류한다. 사용자 dirty callsite는 수정하지 않고 이 Task의 blocker로 기록한다.

- [x] **Step 2: persistence ACK와 IME 차단 RED 테스트 작성**

Plot/Synopsis persistence Promise가 pending이면 `flushSaveBuffers()`가 완료되지 않고 resolve 뒤에만 완료되는지 검증한다. composition 중 global flush는 reject하고 coordinator/quit의 다음 단계가 호출되지 않는 기존 테스트와 함께 검증한다.

- [x] **Step 3: background rejection과 unmount 재시도 RED 테스트 작성**

debounce, blur, composition-end, unmount rejection에서 unhandled rejection이 없고 clean 승격되지 않으며, unmount 뒤에도 같은 payload를 global flush로 재시도해 성공할 수 있음을 검증한다.

- [x] **Step 4: shared buffer 최소 수명주기 구현**

일반 event 경로는 returned Promise rejection을 명시적으로 consume한다. global registry 경로만 rejection을 호출자에게 전파한다. unmount dirty payload는 저장 성공 전까지 retry flusher로 registry에 유지하고 성공하면 해제한다.

- [x] **Step 5: Plot/Synopsis callback을 실제 ACK barrier로 연결**

Plot은 timer 대기 없이 input callback에서 최신 columns snapshot을 실제 `savePlot`에 전달하고 그 Promise를 반환한다. Synopsis는 `saveSynopsis` 및 project description update의 Promise를 반환한다. 오류 toast를 유지하되 reject를 다시 전파한다.

- [x] **Step 6: GREEN, 회귀, SSOT 동기화**

관련 focused 테스트와 Task 8~10 저장 파이프라인 회귀를 실행한다. 변경 파일 ESLint, `git diff --check`, `tsc6 --noEmit` 결과를 기록하고 설계 §17의 persistence ACK/IME/failure lifecycle 계약을 갱신한다.

Actual (2026-07-19): RED에서 2 files/16 tests 중 5건이 예상대로 실패했고 debounce/blur/Enter/unmount rejection 4건이 unhandled로 검출됐다. 구현 후 focused 2 files/17 tests가 stderr warning 없이 통과했다. Plot/Synopsis pending Promise가 resolve되기 전 barrier가 완료되지 않으며 main synopsis는 project와 package ACK를 모두 기다린다. 전체 저장 회귀와 정적 검증 결과는 Task 11 report에 기록했다.

- [x] **Step 7: Task 11 커밋**

```bash
git add src/shared/ui/BufferedInput.tsx src/renderer/src/features/research/components/world/PlotBoard.tsx src/renderer/src/features/research/components/world/SynopsisEditor.tsx tests/dom/bufferedInputSavePolicy.test.tsx tests/dom/worldBufferedPersistence.test.tsx docs/superpowers/plans/2026-07-18-save-integrity.md docs/superpowers/specs/2026-07-18-save-integrity-design.md .superpowers/sdd/save-buffer-task-11-report.md
git commit -m "fix(storage): enforce buffer persistence ack"
```

#### Task 11 review follow-up: barrier 경쟁 조건

**Status:** 완료

- [x] in-flight 뒤 latest flush가 IME explicit 정책을 잃는 RED 테스트
- [x] Plot button mutation과 Synopsis status mutation의 pending/failure/retry barrier RED 테스트
- [x] Synopsis project description rerender의 hydration stale overwrite RED 테스트
- [x] Shared explicit 전달, component-level latest snapshot barrier, identity-only hydration 최소 구현
- [x] focused/7-file 회귀, ESLint, diff-check, tsc 검증 및 SSOT/report 동기화
- [x] follow-up 단일 커밋 `fix(storage): close buffer barrier races`

Actual (2026-07-19): follow-up RED는 2 files/21 tests 중 4건이 explicit 손실, button/status barrier 조기 완료, description rerender hydration 재실행으로 예상대로 실패했다. component barrier는 input callback과 registry가 같은 in-flight Promise를 공유하며 실패한 latest snapshot을 다음 flush에서 재시도한다. Synopsis main save가 pending인 동안 description rerender를 주입해도 load는 1회이고 후속 metadata payload가 최신 synopsis를 유지한다. 최종 검증 결과는 Task 11 report에 기록했다.

---

### Task 12: Canvas active buffer를 global save barrier에 연결

**Status:** 완료

**Files:**

- Modify: `src/renderer/src/features/canvas/components/shell/CanvasDocumentView.tsx`
- Modify: `src/renderer/src/features/canvas/components/shell/document/CanvasMarkdownEditor.tsx`
- Modify: `src/renderer/src/features/research/stores/memo/memoStore.ts`
- Create: `tests/dom/canvasSaveBuffer.test.tsx`
- Modify: `tests/renderer/stores/memoStore.test.ts`
- Modify: `docs/superpowers/plans/2026-07-18-save-integrity.md`
- Modify: `docs/superpowers/specs/2026-07-18-save-integrity-design.md`

**Interfaces:**

- Requires: Task 10 `flushSaveBuffers()` → world mutation drain → main checkpoint 순서.
- Changes: Canvas markdown 500ms timer를 global registry에서 실제 `onSave` ACK까지 drain한다.
- Changes: Canvas memo title/content callback은 memo store `flushSave()` ACK를 반환한다.
- Changes: Canvas entity title/description/markdown callback은 world entity update Promise를 반환한다.
- Changes: memo persistence 실패는 barrier에 reject되고 dirty snapshot은 다음 flush에서 재시도된다.

- [x] **Step 1: Canvas/memo 저장 공백 RED 테스트 작성 및 실패 확인**
- [x] **Step 2: Canvas markdown latest/in-flight/timer drain 최소 구현**
- [x] **Step 3: Canvas callsite를 실제 persistence ACK에 연결**
- [x] **Step 4: memo store 오류 전파·dirty retry 수명주기 보정**
- [x] **Step 5: focused 및 Task 8~12 회귀, ESLint, diff-check, tsc 검증**
- [x] **Step 6: SSOT/report 동기화 및 단일 커밋**

Actual (2026-07-19): RED는 2 files/14 tests 중 6건이 markdown registry 미연결, memo flush Promise 폐기, entity description blur 의존, memo persistence 오류 삼킴으로 예상대로 실패했다. GREEN은 focused 2 files/20 tests, Task 8~12 회귀 9 files/59 tests PASS이며 stderr warning/unhandled rejection이 없다. 변경 파일 ESLint와 `git diff --check`는 PASS다. `./node_modules/.bin/tsc6 --noEmit`은 Task 12 신규 오류 없이 사용자 소유 dirty `BinderSidebarPanelBody.tsx:102`의 기존 `ResearchPanelTab` 오류 1건으로 exit 2다.

#### Task 12 review follow-up: memo save drain 직렬화

**Status:** 완료

- [x] scheduled/explicit memo persistence를 단일 drain으로 직렬화하는 RED 테스트
- [x] in-flight 성공 뒤 latest snapshot 1회 drain 및 barrier ACK 대기
- [x] 실패 dirty 유지, background consume, 다음 explicit/scheduled retry
- [x] memo cleanup/project scope background rejection consume·logging 정책
- [x] focused/Task 8~12 회귀, ESLint, diff-check, tsc 및 SSOT/report 동기화
- [x] follow-up 단일 커밋 `fix(storage): serialize memo save drain`

Actual (2026-07-19): 테스트 하네스 수정 후 RED는 2 files/15 tests 중 4건이 P1 pending 중 P2 동시 시작과 hook cleanup/scope, Canvas scope rejection 미처리로 예상대로 실패했다. 최종 focused는 2 files/17 tests, Task 8~12 회귀는 10 files/66 tests PASS이며 stderr warning/unhandled rejection 0이다. P1 settle 전 P2 호출 0, P1 성공 뒤 latest P2 한 번, P2 ACK 뒤 barrier 완료, P1/P2 실패의 dirty retry와 이전 project scope 유지를 검증했다. 변경 파일 ESLint와 `git diff --check`는 PASS다. `tsc6 --noEmit`은 follow-up 신규 오류 없이 사용자 dirty `BinderSidebarPanelBody.tsx:102` 기존 오류 1건만 유지한다.

---

### Task 13: 실패한 world entity mutation payload 보존과 명시적 재시도

**Status:** 완료

**Files:**

- Modify: `src/renderer/src/shared/store/worldEntityMutationQueue.ts`
- Modify: `src/renderer/src/shared/store/createWorldEntityCRUDStore.ts`
- Modify: `tests/renderer/stores/worldEntityMutationQueue.test.ts`
- Modify: `tests/renderer/stores/characterStoreMutationLock.test.ts`
- Modify: `docs/superpowers/plans/2026-07-18-save-integrity.md`
- Modify: `docs/superpowers/specs/2026-07-18-save-integrity-design.md`
- Create: `.superpowers/sdd/save-buffer-task-13-report.md`

**Interfaces:**

- Changes: execute throw와 CRUD `null` ACK를 둘 다 mutation 실패로 취급한다.
- Changes: 실패 batch의 waiter는 reject하되 patch는 waiter 없는 pending work로 보존한다.
- Changes: 실패 patch와 더 최신 patch는 `merge(failed, newer)` 순서로 병합한다.
- Changes: 다음 enqueue 또는 다음 explicit global flush가 보존된 latest patch를 한 번 재시도한다.
- Excludes: 한 flush 내 무한 retry, 자동 backoff, delete-before-update drain.

- [x] **Step 1: queue failure retention/merge RED 테스트**
- [x] **Step 2: CRUD null ACK RED 통합 테스트**
- [x] **Step 3: retained pending과 active/map lifecycle 최소 구현**
- [x] **Step 4: waiter 없는 retry ACK의 store/graph reconciliation**
- [x] **Step 5: focused 및 Task 8~13 저장 회귀, ESLint, diff-check, tsc 검증**
- [x] **Step 6: SSOT/report 동기화 및 단일 커밋**

Actual (2026-07-19): 최초 RED는 2 files/8 tests 중 3건이 throw payload 제거, failed/newer key 유실, CRUD `null` ACK 성공 처리로 예상대로 실패했다. 추가 null ACK/next-enqueue RED도 기존 코드에서 `null` resolve로 실패했다. 최종 focused는 2 files/9 tests, Task 8~13 저장 회귀는 12 files/72 tests PASS이며 stderr warning/unhandled rejection이 없다. 실패 batch는 waiter reject 후에도 pending/active에 남고, 다음 flush/enqueue가 latest nested patch를 한 번 재시도한다. waiter 없는 retry ACK도 store/graph에 반영한 뒤 entity map/global registry를 정리한다. 대상 ESLint와 `git diff --check`는 PASS다. `tsc6 --noEmit`은 Task 13 신규 오류 없이 사용자 dirty `BinderSidebarPanelBody.tsx:102` 기존 오류 1건만 유지한다.

#### Task 13 review follow-up: retry ACK와 newer optimistic patch 경합

**Status:** 완료

- [x] retained A retry 중 newer B가 들어온 뒤 A ACK/B 실패에서 B projection 유지 RED
- [x] entity별 optimistic generation과 unacknowledged patch 최소 추적
- [x] stale ACK 반영 후 ACK가 커버하지 못한 newer patch만 store/graph에 재합성
- [x] 최신 ACK 성공/queue idle 후 generation cache와 entity queue map 정리
- [x] focused/Task 8~13 회귀, ESLint, diff-check, tsc, SSOT/report 동기화
- [x] follow-up 단일 커밋 `fix(storage): preserve latest optimistic entity`

Actual (2026-07-19): RED는 실제 character store 경로 1 files/5 tests 중 1건이 retained A retry ACK 뒤 B persist 실패 시 items/current/graph가 B가 아닌 A full entity로 덮어써져 예상대로 실패했다. entity별 generation과 unacknowledged patch를 추적해 execute 시작 후 들어온 patch만 A ACK에 재합성했다. B 실패 후 items/current/graph는 latest scalar와 nested attribute key를 유지하고 queue pending count는 1이며, 다음 retry 성공 후 ACK 상태와 일치하고 0이 된다. focused 2 files/10 tests와 Task 8~13 회귀 12 files/73 tests는 stderr warning/unhandled rejection 없이 PASS했다. 대상 ESLint와 `git diff --check`는 PASS다. `tsc6 --noEmit`은 follow-up 신규 오류 없이 사용자 dirty `BinderSidebarPanelBody.tsx:102` 기존 TS2322 1건만 유지한다.

---

### Task 14: export 실패 보존과 종료 안전 경계

**Status:** 완료

**Files:**

- Modify: `src/main/services/core/project/projectExportQueue.ts`
- Modify: `src/main/handler/writing/ipcAutoSaveHandlers.ts`
- Modify: `src/main/lifecycle/shutdown/shutdown.ts`
- Modify: `tests/main/services/projectExportQueue.test.ts`
- Modify: `tests/main/handler/manualSaveHandler.test.ts`
- Create: `tests/main/lifecycle/shutdownExportDecision.test.ts`
- Modify: `docs/superpowers/plans/2026-07-18-save-integrity.md`
- Modify: `docs/superpowers/specs/2026-07-18-save-integrity-design.md`
- Create: `.superpowers/sdd/save-buffer-task-14-report.md`

**Interfaces:**

- Changes: export callback의 `false`와 throw는 해당 project를 dirty로 유지하고 현재 호출에서는 실패로 끝난다.
- Changes: 다음 schedule/runNow/flush만 retained project를 한 번 재시도하며, 성공 뒤에만 exported revision과 queue registry를 정리한다.
- Changes: manual save의 export `false`/throw는 IPC failure로 전파한다.
- Changes: quit soft/hard flush의 `failed > 0`과 timeout은 모두 사용자 결정 경계로 이동하며 기본값은 종료 취소다.

- [x] **Step 1: queue false/throw retention과 next-call retry RED**
- [x] **Step 2: scheduled failure unhandled 방지와 newer revision 회귀 RED**
- [x] **Step 3: manual save false/throw RED**
- [x] **Step 4: quit cancel/retry/skip 및 hard failure RED**
- [x] **Step 5: 최소 queue/manual/quit 구현**
- [x] **Step 6: focused 및 Task 8~14 저장 회귀, 정적 검증**
- [x] **Step 7: SSOT/report 동기화 및 단일 커밋**

Actual (2026-07-19): 최초 RED는 3 files에서 queue false 오집계/dirty 제거, throw retry 제거, scheduled failure 정리, manual false 성공 응답의 5 assertion이 예상대로 실패했고 quit helper 부재로 1 suite가 실패했다. GREEN은 focused 3 files/18 tests, Task 8~14 비-DB 저장 회귀 15 files/93 tests PASS이며 unhandled rejection이 없다. Electron-as-Node DB recovery는 2 files/2 tests PASS했다. `dirty=false`와 `failed` 무시 변이는 각각 retry/quit cancel 테스트를 실패시켰다. 대상 ESLint와 `git diff --check`는 PASS다. `tsc6 --noEmit`은 Task 14 신규 오류 없이 사용자 dirty `BinderSidebarPanelBody.tsx:102` 기존 TS2322 1건만 유지한다.

#### Task 14 review follow-up: detached skip과 shutdown wiring

**Status:** 완료

- [x] attachment missing/non-`.luie`/invalid path를 queue adapter의 정상 `skipped`로 분리
- [x] skipped는 exported revision/failure stat 없이 idle cleanup하고 public manual save에는 성공 반환
- [x] attachment 뒤 새 schedule이 실제 export를 수행하는 RED/GREEN
- [x] 실제 `registerShutdownHandlers`의 cancel/retry/skip/hard failure wiring RED/GREEN
- [x] timeout 뒤 late throw retry RED/GREEN
- [x] Task 8~14 회귀, Electron DB recovery, 정적 검증, SSOT/report 동기화
- [x] follow-up 단일 커밋 `fix(storage): distinguish skipped exports`

Actual (2026-07-19): skip RED는 2 files/20 tests 중 5건이 detached/invalid attachment를 실제 export와 flushed로 계산하고 attachment 이후 총 export 횟수가 오염돼 예상대로 실패했다. tri-state는 queue 내부에만 두고 public runNow boolean은 `skipped`를 local save 성공으로 반환한다. focused 5 files/34 tests와 실제 shutdown wiring 5경로, Task 8~14 회귀 17 files/109 tests, Electron-as-Node DB recovery 2 files/2 tests가 PASS했다. 대상 ESLint와 `git diff --check`는 PASS다. `tsc6 --noEmit`은 follow-up 신규 오류 없이 사용자 dirty `BinderSidebarPanelBody.tsx:102` 기존 TS2322 1건만 유지한다.

#### Task 14 second review follow-up: revision 전 skip 판정

**Status:** 완료

- [x] generic queue에 optional pre-revision skip resolver 추가
- [x] missing project/detached skip은 revision/export/mark 0회와 idle cleanup
- [x] async skip 판정 중 concurrent schedule의 dirty/timer cleanup RED/GREEN
- [x] attached 경로의 revision capture/export/mark 회귀
- [x] hard retry 실패 뒤 명시적 skip의 actual shutdown wiring 테스트
- [x] 회귀/DB/정적 검증과 SSOT/report 동기화
- [x] follow-up 단일 커밋 `fix(storage): skip exports before revision lookup`

Actual (2026-07-19): RED는 3 files/30 tests 중 3건이 missing project의 revision 오류 선행과 async skip resolver 미호출로 예상대로 실패했다. optional resolver를 revision capture 전에 실행하고 skip 확정 시 concurrent timer/dirty도 정리했다. focused 5 files/39 tests, Task 8~14 회귀 17 files/114 tests, Electron-as-Node DB recovery 2 files/2 tests가 PASS했다. actual shutdown wiring은 hard retry failure/timeout 뒤 두 번째 dialog에서 명시적 skip 시 각각 `app.exit(0)` 1회를 검증한다. 대상 ESLint와 `git diff --check`는 PASS다. `tsc6 --noEmit`은 second follow-up 신규 오류 없이 사용자 dirty `BinderSidebarPanelBody.tsx:102` 기존 TS2322 1건만 유지한다.

---

### Task 15: world entity 삭제 전 update drain

**Status:** 완료

**Files:**

- Modify: `src/renderer/src/shared/store/createWorldEntityCRUDStore.ts`
- Modify: `tests/renderer/stores/characterStoreMutationLock.test.ts`
- Modify: `docs/superpowers/plans/2026-07-18-save-integrity.md`
- Modify: `docs/superpowers/specs/2026-07-18-save-integrity-design.md`
- Create: `.superpowers/sdd/save-buffer-task-15-report.md`

**Interfaces:**

- Changes: delete는 같은 entity의 in-flight/pending update queue를 먼저 drain하고 retained payload는 명시적으로 한 번 retry한다.
- Changes: drain 또는 retry 실패 시 delete API를 호출하지 않고 payload와 optimistic UI를 유지한다.
- Changes: delete drain 동안 같은 entity의 새 update는 optimistic state를 바꾸기 전에 reject한다.
- Changes: delete 성공 뒤 queue/generation/graph lifecycle을 정리하며 다른 entity queue는 기다리지 않는다.
- Excludes: project-wide serialization, 자동 backoff, Notion UI, project-wide revision 확대.

- [x] **Step 1: 실제 character store delete/update 경합 RED 테스트**
- [x] **Step 2: entity-level deleting guard와 queue drain 최소 구현**
- [x] **Step 3: delete 성공/실패 lifecycle과 다른 entity 독립성 회귀**
- [x] **Step 4: focused 및 Task 8~15 저장 회귀, 정적 검증**
- [x] **Step 5: SSOT/report 동기화 및 단일 커밋**

Actual (2026-07-19): 오염 없는 RED는 실제 character store 1 file/10 tests 중 3건이 update ACK 전 delete 호출, retained retry 미실행, delete drain 중 newer update 허용으로 예상대로 실패했다. entity id별 deleting guard와 기존 queue `flush`를 연결하고 성공 시 queue/generation/graph node를 정리했다. focused character 1 file/10 tests, queue/character/burst/event·faction wrapper 4 files/18 tests, Task 8~15 비-DB 저장 회귀 17 files/119 tests가 PASS했고 unhandled rejection은 없다. 대상 ESLint와 `git diff --check`는 PASS다. `tsc6 --noEmit`은 Task 15 신규 오류 없이 사용자 dirty `BinderSidebarPanelBody.tsx:102` 기존 TS2322 1건만 유지한다.

---

### Task 16: 프로젝트 전환 저장 scope와 종료 재시도 계약

**Status:** 완료 — 독립 재리뷰 Production-ready

**Files:**

- Modify: `src/renderer/src/features/research/components/world/PlotBoard.tsx`
- Modify: `src/renderer/src/features/research/components/world/SynopsisEditor.tsx`
- Modify: `src/main/lifecycle/shutdown/shutdown.ts`
- Modify: `src/renderer/src/features/workspace/components/useEditorRootShortcuts.ts`
- Modify: 관련 renderer DOM/main lifecycle 테스트
- Modify: 저장 SSOT와 Task 16 report

**Interfaces:**

- Changes: Plot/Synopsis dirty snapshot은 변경 당시의 `projectId`와 canonical attachment path를 함께 캡처한다.
- Changes: 프로젝트 A 저장이 실패하거나 in-flight인 상태에서 B로 전환해도 A payload는 A target으로만 drain하며 B hydration이 A retry를 지우지 않는다.
- Changes: quit 첫 renderer handshake가 실패한 뒤 사용자가 `저장 후 종료`를 선택하면 renderer flush를 다시 요청하고 ACK 성공 전에는 export/finalize로 진행하지 않는다.
- Changes: renderer 재flush도 실패하면 기본 `종료 취소`인 명시적 결정 경계로 이동한다. `저장 생략`을 고른 경우에만 ACK 없이 종료할 수 있다.
- Changes: renderer flush timeout/cancel 시 IPC listener를 제거한다.
- Changes: Cmd/Ctrl+S export 실패는 logger뿐 아니라 사용자가 관찰 가능한 실패 상태로 표시한다.
- Excludes: 사용자 dirty `NotionDocumentView`, project-wide revision 확대, world mutation 자동 backoff, P95 인증.

- [x] **Step 1: 프로젝트 A 실패/in-flight → B 전환 RED 테스트**
- [x] **Step 2: Plot/Synopsis project-bound pending drain 최소 구현**
- [x] **Step 3: renderer handshake retry/second-failure decision/listener cleanup RED 테스트**
- [x] **Step 4: shutdown renderer reflush와 명시적 skip 최소 구현**
- [x] **Step 5: manual save failure 사용자 표시 RED/GREEN**
- [x] **Step 6: focused/전체 저장 회귀와 정적 검증**
- [x] **Step 7: 독립 코드 리뷰, SSOT/report 동기화, 단일 커밋**

#### Task 16 review follow-up: 실제 input/preload/main ACK 경계

**Status:** 완료 — 두 차례 No-Go 후속 및 최종 재리뷰 clean

- [x] Plot/Synopsis의 blur 전 input dirty value를 project scope에 고정
- [x] project in-flight 전환과 load 중 save ACK 뒤 stale hydration RED/GREEN
- [x] Plot/Synopsis component unmount 뒤 failed pending을 detached registry에 유지
- [x] renderer buffer/world 성공 뒤에만 `rendererDirty=false`로 ACK
- [x] preload autosave `success:false`/throw payload 재보존과 clean ACK 차단
- [x] quit main manuscript flush reject/timeout의 retry/cancel/explicit skip 결정 경계
- [x] malformed/mismatched/sender 불일치 renderer ACK 거부
- [x] focused/전체 저장 회귀, Electron DB recovery, 정적 검증, 재리뷰

Actual (2026-07-19): 최초 RED는 A 실패 payload의 B 전환 소실, B target 교차 저장, renderer 재flush 부재, stale IPC listener, manual save 실패 무표시를 재현했다. 1차 리뷰 No-Go 뒤 실제 input callback 재바인딩, sticky renderer dirty, preload `success:false` false-ACK, main flush reject/timeout false-success, late hydration, component unmount retry 소실을 추가 RED로 고정했다. 2차 리뷰에서 동일 field id 전환, overlapping preload flush의 조기 ACK, 같은 barrier 중 newer enqueue 누락, retry ACK 뒤 revisit late load overwrite까지 mutation으로 확인하고 보완했다.

최종 구현은 project id/path/payload snapshot queue, project-keyed input subtree, hydration gate/cache/generation 및 load-start pending snapshot, detached unmount registry를 사용한다. preload autosave는 key sequence와 single-flight queue-empty drain으로 실패 payload와 최신 concurrent payload를 보존한다. quit은 requestId/sender/payload shape를 검증하며 renderer와 main save의 retry/cancel/explicit skip 결정을 분리한다. Cmd/Ctrl+S failure는 logger와 error toast에 함께 남는다.

최종 root 검증은 Task 8~16 저장 회귀 19 files/167 tests, Electron-as-Node DB recovery 2 files/2 tests, 대상 ESLint와 `git diff --check` PASS다. 전체 `tsc6 --noEmit`은 Task 16 신규 오류 없이 사용자 dirty `BinderSidebarPanelBody.tsx:102` 기존 TS2322 1건만 유지한다. 독립 코드·테스트 재리뷰는 모두 Production-ready이며 Critical/Important 0이다. 이 수치는 correctness 근거이며 P95/95% confidence 인증은 아니다.

---

### Task 17: Notion 문서 본문 공용 저장 경계 연결

**Status:** 완료 — 독립 review Approved, 단일 commit 반영

**Files:**

- Modify: `src/renderer/src/features/research/components/shared/NotionDocumentView.tsx`
- Create: `tests/dom/notionDocumentSaveBuffer.test.tsx`
- Modify: `docs/superpowers/plans/2026-07-18-save-integrity.md`
- Modify: `docs/superpowers/specs/2026-07-18-save-integrity-design.md`
- Modify: `.superpowers/sdd/progress.md`
- Create: `.superpowers/sdd/save-buffer-task-17-report.md`

**Interfaces:**

- Changes: Notion 본문 500ms timer가 `registerSaveBufferFlush`에 latest markdown을 등록한다.
- Changes: explicit flush는 timer를 취소하고 동일 snapshot의 timer/flush 경합을 한 번의 `saveBody` enqueue로 합친다.
- Changes: in-flight 뒤 newer markdown을 직렬 drain하고 성공한 snapshot만 clean으로 승격한다.
- Changes: 한 setter가 실패해도 같은 snapshot의 나머지 setter가 settle될 때까지 in-flight를 유지한 뒤 첫 오류를 전파한다.
- Changes: 뒤 setter의 동기 throw도 rejected Promise로 수집해 앞선 pending ACK를 버리지 않는다.
- Changes: background rejection은 consume하되 dirty snapshot을 다음 explicit flush에 보존한다.
- Changes: dirty/in-flight unmount는 공용 `preserveUnmountSave`에 snapshot과 retry를 넘긴다.
- Preserves: `saveBody`는 모든 world mutation setter를 첫 await 전에 동기 호출하고 그 결과 Promise를 반환하며, 기존 coordinator가 뒤의 world queue를 flush한다.
- Excludes: 새 queue/전역 상태, Canvas 공용화, world mutation automatic backoff, P95 인증.

- [x] **Step 1: production 변경 전 Notion latest/race/drain/failure/unmount RED 테스트 작성**
- [x] **Step 2: 기능 부재로 focused RED 확인**
- [x] **Step 3: 기존 Canvas ref/drain 패턴과 공용 registry 최소 적용**
- [x] **Step 4: focused GREEN과 Task 8~17 저장 회귀 확인**
- [x] **Step 5: 대상 ESLint, diff-check, typecheck baseline 확인**
- [x] **Step 6: SSOT/report 동기화**
- [x] **Step 7: 독립 task review Critical/Important 0 및 spec/quality 승인**
- [x] **Step 8: root가 사용자 accentColor hunk와 Task 17 hunk를 분리해 commit**

Actual (2026-07-19): 지정 `pnpm vitest` RED 명령은 pnpm 11.5.3 wrapper가 60초간 무출력로 정지해 exit 130으로 중단했다. 동일 로컬 Vitest 명령의 RED는 1 file/6 tests 중 registry 미연결·오류 재시도 부재 5건이 예상 실패하고 기존 timer 경합 1건만 PASS했다. 최소 구현 후 focused 1 file/6 tests와 Task 8~17 저장 회귀 20 files/173 tests가 PASS했다. 대상 ESLint와 `git diff --check`는 PASS다. `tsc6 --noEmit`은 Task 17 신규 오류 없이 사용자 dirty `BinderSidebarPanelBody.tsx:102` 기존 TS2322 1건만 유지한다. 사용자 소유 `accentColor` 제거 hunk는 의미 변경 없이 보존했다. world mutation automatic backoff와 save latency P95/95% confidence 인증은 여전히 미완료다.

Review follow-up (2026-07-19): 보강 RED는 1 file/6 tests 중 3건이 async setter ACK 전 barrier 완료, first ACK 전 second snapshot 시작, in-flight unmount latest 조기 시작으로 예상 실패했다. `setSections`/`setSectionContent` 반환을 `void | Promise<unknown>`으로 허용하고 `saveBody`가 모든 setter를 첫 await 전에 순서대로 호출한 뒤 `Promise.all`을 await/return하도록 보정했다. GREEN은 focused 1 file/6 tests와 동일 저장 회귀 20 files/173 tests PASS이며 ESLint/diff-check PASS, Task 17 type 오류 0과 기존 Binder TS2322 baseline 1건만 유지한다.

Second review follow-up (2026-07-19): RED는 1 file/7 tests 중 1건이 첫 setter reject 직후 다른 setter ACK pending을 기다리지 않고 barrier/in-flight를 해제해 예상 실패했고 기존 6건은 PASS했다. `Promise.allSettled`로 동일 snapshot의 모든 setter 결과를 기다린 뒤 첫 rejected reason을 그대로 throw하도록 최소 보정했다. GREEN은 focused 7/7, 저장 회귀 20 files/174 tests PASS이며 ESLint/diff-check PASS, Task 17 type 오류 0과 기존 Binder TS2322 baseline 1건만 유지한다.

Final review follow-up (2026-07-19): RED는 1 file/8 tests 중 1건이 앞선 setter pending 뒤 `setSectionContent` 동기 throw에서 `allSettled` 도달 전 barrier/in-flight를 해제해 예상 실패했고 기존 7건은 PASS했다. 각 setter 동기 호출을 local collector의 `Promise.resolve`/`Promise.reject`로 개별 수집하고 모든 호출 뒤 `allSettled`하는 최소 보정으로 pending ACK와 원래 sync error를 함께 보존했다. GREEN은 focused 8/8, 저장 회귀 20 files/175 tests PASS이며 ESLint/diff-check PASS, Task 17 type 오류 0과 기존 Binder TS2322 baseline 1건만 유지한다.

최종 독립 재리뷰는 Spec Compliance ✅, Task quality Approved, Critical/Important/Minor 0이다. staged Task에는 저장 로직·테스트·SSOT만 포함했고 사용자 소유 `accentColor` 제거 hunk는 working tree에 unstaged로 보존했다.

---

### Task 18: world mutation bounded backoff

**Status:** 완료 — 독립 코드/테스트 재리뷰 Production-ready

**Files:**

- Modify: `tests/renderer/stores/worldEntityMutationQueue.test.ts`
- Modify: `tests/renderer/stores/characterStoreMutationLock.test.ts`
- Modify: `src/renderer/src/shared/store/worldEntityMutationQueue.ts`
- Modify: `src/renderer/src/shared/store/createWorldEntityCRUDStore.ts`
- Modify: `src/main/services/features/project/projectService.ts`
- Modify: `tests/main/services/projectService.immediateDurability.test.ts`
- Modify: `tests/main/services/projectExportQueue.test.ts` (dirty retention 회귀가 기존 테스트로 부족할 때만)
- Create: `tests/renderer/services/worldDocumentNoRetry.test.ts`
- Modify: 저장 SSOT/plan/progress와 Task 18 report

**Interfaces:**

- Adds: `createLatestMutationQueue`의 opt-in retry delay 정책. 기본값은 자동 재시도 없음이다.
- Uses: character/event/faction/term update factory에서만 `[250, 500, 1000]` 정책을 주입한다.
- Preserves: 실패 caller reject, retained latest patch, nested attributes merge, optimistic generation, delete drain, global active count.
- Interrupts: enqueue/flush가 예약 timer를 취소하고 즉시 retry한다.
- Changes: immediate export failure의 `${reason}:retry` 자동 schedule은 제거하고 dirty payload/revision과 오류 전파를 유지한다.
- Excludes: graph/replica/document buffer backoff, 범용 retry abstraction, error taxonomy/IPC 재설계.

- [x] **Step 1: fake timer RED — exact delay와 exhaustion**
  - 최초 실패 + 250/500/1000ms 자동 3회, 총 4회 상한을 고정한다.
  - exhaustion 뒤 pending/global active count 1과 latest payload 보존을 검증한다.
- [x] **Step 2: fake timer RED — foreground interrupt와 latest merge**
  - 예약 중 새 enqueue와 explicit/global flush가 timer를 취소하고 즉시 실행하는지 검증한다.
  - retained scalar/`attributesPatch`와 newer patch의 latest merge를 검증한다.
  - timer와 foreground 경합에서 concurrent execute 최대 1을 검증한다.
  - 새 patch만 retry budget을 초기화하고 explicit flush는 budget을 초기화하지 않음을 검증한다.
- [x] **Step 3: opt-in queue policy 최소 구현**
  - generic queue 기본 동작을 유지하고 retry delay가 전달된 queue만 timer chain을 사용한다.
  - success/idle cleanup과 background rejection consumption을 구현한다.
- [x] **Step 4: 실제 world store ACK/reconciliation RED/GREEN**
  - waiter 없는 timer retry 성공이 store/graph/optimistic generation과 entity queue map을 정리하는지 검증한다.
  - manual/quit global flush 실패는 reject하고 payload는 남는지 검증한다.
- [x] **Step 5: export 비적용 회귀**
  - immediate export `false`/throw 뒤 `${reason}:retry` schedule이 없음을 RED/GREEN으로 고정한다.
  - queue dirty 상태와 manual/quit 오류 전파는 유지하고 fake timer만으로 `runExport`가 다시 호출되지 않음을 증명한다.
  - persisted revision drift의 startup recovery 1회는 유지하되 실패 뒤 같은 세션의 timer chain이 생기지 않음을 검증한다.
  - graph/replica/document export 오류가 entity queue retry를 만들지 않음을 확인한다.
- [x] **Step 6: focused/저장 회귀/정적 검증**
  - focused queue/store/export 테스트를 실행한다.
  - Task 8~18 저장 회귀, 대상 ESLint, `git diff --check`, direct typecheck baseline을 확인한다.
- [x] **Step 7: SSOT/report 동기화, 독립 리뷰, 단일 커밋**
  - 코드와 문서 수치가 일치하는지 독립 검토한다.
  - Critical/Important 0 뒤 `fix(storage): retry world mutations with backoff` 한 커밋으로 닫는다.

Actual (2026-07-20): 초기 정책 RED는 3 files/38 tests 중 11 FAIL·27 PASS였고 exact `0/250/750/1750ms`, explicit flush budget 유지, newer generation reset, latest nested merge, waiter-less ACK, delete stale timer, export false/throw 무자동 재시도를 고정했다. 최소 구현 뒤 review가 성공 ACK continuation strand, 실패 continuation, auto retry 재실패 중 newer enqueue 지연, 후속 ACK 전 flush 조기 완료를 발견했고 각 항목을 production 변경 전 단일 RED로 재현했다. 최종 queue는 batch 시작 시 foreground 요청을 소비하고 실행 중 도착한 요청만 실패 후 즉시 drain하며, flush는 queue-empty까지 새 in-flight generation도 await한다.

최종 focused 4 files/44 tests, export/startup 포함 인접 회귀 6 files/58 tests, Task 8~18 저장 회귀 21 files/194 tests PASS다. 대상 ESLint와 `git diff --check`도 PASS했다. direct `tsc6 --noEmit`은 Task 18 신규 오류 없이 사용자 dirty `BinderSidebarPanelBody.tsx:102` 기존 TS2322 한 건만 유지한다. 독립 코드 리뷰는 Production-ready, 테스트 리뷰는 Approved이며 두 리뷰 모두 Critical/Important/Minor 0이다.

---

### Task 19: 저장 latency P95와 95% 신뢰 인증

**Status:** 완료 — 독립 최종 리뷰 Critical/Important/Minor 0 (2026-07-20)

**Goal:** 저장 correctness와 별개로, 실제 SQLite commit ACK와 explicit save barrier의 latency를 반복 측정 가능한 artifact로 인증한다.

- [x] 환경, Electron/SQLite ABI, fixture 크기, warm-up, sample count를 고정한다.
- [x] 실제 DB write를 사용하며 mock timer/burst 결과를 latency sample로 세지 않는다.
- [x] 최소 30회 warm-up 뒤 독립 sample을 수집하고 raw values, P50/P95/P99, 실패율을 저장한다.
- [x] bootstrap 또는 percentile 기반 95% confidence interval을 산출하고 계산 script/test를 함께 둔다.
- [x] world 단건, 100-burst latest merge, Cmd/Ctrl+S 전체 barrier를 별도 시나리오로 측정한다.
- [x] CI/로컬 편차 때문에 hard gate가 부적절하면 regression budget과 인증 artifact를 분리해 문서화한다.
- [x] 독립 재실행에서 결과가 재현되고 SSOT/report가 일치한 뒤 한 Task/한 커밋으로 닫는다.

Actual (2026-07-20): core runner는 Electron Node ABI에서 production character store/queue를 real `characterService`와 SQLite `WAL + synchronous=FULL`에 연결한다. `coordinator-main-core-dirty-barrier`는 pending chapter autosave, world mutation, `saveProjectNow`, 실제 `.luie` export ACK를 포함하지만 preload/IPC는 in-process adapter이므로 단축키 전체 지연으로 부르지 않는다. 별도 E2E runner는 실제 Electron 창에서 물리적 `Cmd/Ctrl+S`로 저장을 발동하고, `saveProjectNow` 진입부터 pending preload autosave, renderer coordinator, IPC, main flush, SQLite와 package export ACK까지 하나의 `performance.measure`로 잰다. 동기 start와 success/error terminal measure가 단축키마다 정확히 하나인지 확인해 중복 handler와 실패 표본 오분류를 막는다. 계측 API 오류는 저장 동작에 영향을 주지 않는다. OS keydown dispatch에서 함수 진입까지는 측정값에 포함하지 않는다.

각 runner는 독립 프로세스 3회, 시나리오마다 warm-up 30회 뒤 200개 순차 표본을 남겼다. nearest-rank P50/P95/P99와 circular moving-block bootstrap(block 10, seed 고정, 10,000회) P95 95% CI를 계산해 표본 내 자기상관을 IID로 가정하지 않는다. core 세 실행 P95는 단건 `0.195/0.207/0.192ms`, 100-burst `0.477/0.451/0.451ms`, core dirty barrier `8.449/8.968/8.879ms`다. 실제 단축키 E2E P95는 `12.400/12.600/12.700ms`다. 총 2,400개 측정 표본의 실패는 0건이며 core의 latest DB/원고 값과 revision/export, E2E의 latest DB/패키지 본문이 모두 수렴했다.

세 실행의 raw artifact, Git HEAD, harness SHA-256을 보존했다. 프로세스별 분산은 관측값으로 인정하며 CI 중첩을 재현성 조건으로 과장하지 않는다. 단일 Apple M4 호스트의 절대 latency는 hard gate가 아니고 `docs/quality/save-latency-budget.json`은 세 실행 중 가장 큰 CI 상한을 바깥쪽 반올림한 local review 신호다. correctness gate만 표본 계약, 실패율 0, raw/summary 일치, latest DB 값, revision/export/package 수렴을 강제한다.

최종 통계 TDD 12/12, coordinator 6/6, 인접 world 저장 회귀 44/44, core real SQLite/package 인증 3회, physical shortcut E2E 3회가 PASS했다. build, 대상 ESLint, diff-check도 PASS했고 변경 source/test는 모두 500 LOC 이하다. direct typecheck는 이번 변경 신규 오류 없이 사용자 dirty `BinderSidebarPanelBody.tsx:102`의 기존 TS2322 한 건만 유지한다. 독립 코드·테스트와 artifact·SSOT 재리뷰는 모두 승인됐고 Critical/Important/Minor 0이다.

---

### Task 19.1: IME 중 explicit save를 composition-end ACK로 보정

**Status:** 구현·자동 검증 완료 — 실제 OS/IME release smoke pending (2026-07-21)

**Goal:** 한·일 IME composition 중 `Cmd/Ctrl+S`와 종료 flush를 일반 저장 오류로 실패시키지 않고, 최종 DOM 값의 persistence ACK까지 기다린다.

**Files:**

- Modify: `src/shared/ui/BufferedInput.tsx`
- Modify: `tests/dom/bufferedInputSavePolicy.test.tsx`
- Modify: `docs/superpowers/specs/2026-07-18-save-integrity-design.md`
- Modify: `docs/superpowers/plans/2026-07-18-save-integrity.md`

- [x] 현행 explicit reject가 사용자 로그를 재현하고 관련 4 suites/27 tests가 기존 정책대로 PASS함을 확인한다.
- [x] input/textarea composition 종료 전 barrier pending, 종료 후 최종값 ACK, 반복 flush 1회 저장, older in-flight 직렬화, unmount reject RED를 먼저 고정한다.
- [x] component-local pending Promise만 추가하고 coordinator, shortcut, registry, 별도 timeout/UI 상태는 변경하지 않는다.
- [x] focused/인접 회귀, lint/build와 독립 review를 통과한다. 전체 typecheck는 범위 밖 사용자 dirty 오류 1건만 유지한다.
- [x] SSOT와 자동 검증 결과를 동기화한다.
- [ ] 실제 Electron OS/IME matrix를 release QA에서 확인한다.

실제 Electron matrix는 macOS 기본 한글 2벌식, Windows 11 Microsoft 한글/일본어 IME에서 composition 중 단축키 1회·3회, blur, 취소, 문서 전환, 종료를 확인한다. 합성 jsdom event는 상태 머신 회귀만 증명하며 OS/IME event ordering 인증으로 과장하지 않는다.

Actual (2026-07-21): 현행 4 suites/27 tests가 explicit composition reject 정책대로 PASS하는 baseline을 확인했다. 정책을 composition-end ACK로 바꾼 RED는 focused 17건 중 4건이 기존 오류로 실패했고, unmount microtask와 non-IME in-flight/latest drain 경합도 각각 production 수정 전에 실패를 재현했다. 최소 구현은 buffer별 pending Promise를 공유하고 `compositionend.currentTarget.value`의 실제 `onSave` ACK 뒤 waiters를 완료한다. composition 중 unmount만 명시적으로 reject하며 일반 unmount의 기존 latest drain은 유지한다.

최종 저장 회귀 9 files/77 tests, 대상 ESLint, build, source LOC gate, i18n parity, diff-check가 PASS했다. direct `tsc6 --noEmit`은 이번 변경 신규 오류 없이 사용자 dirty `BinderSidebarPanelBody.tsx:102`의 기존 TS2322 한 건만 유지한다. 코드·표준·과설계 독립 재리뷰는 모두 GO이며 Critical/Important/Minor 0이다. 실제 OS/IME smoke 전에는 플랫폼 동작까지 인증 완료로 표현하지 않는다.

---

## Phase 20: SPA(Single Pattern Architecture) + 500 LOC 모듈화

**Status:** 진행 중 — 20.1 Guardrail, 20.2 Locale trio 완료

**Definition of Done:** 레이어별 정식 의존 패턴이 하나이고, hand-written production TS/TSX/CSS와 test TS/TSX가 파일당 500 LOC 이하이며, public API·IPC·DB·UI behavior 회귀가 없다. generated/vendor만 근거가 있는 예외로 허용한다.

### 20.1 Guardrail Task — 사실 baseline과 자동 gate

- [x] 기존 `pnpm run check:source-loc`의 `src` TS/TSX/CSS baseline과 `tests` TS/TSX baseline을 다시 계수하고 `docs/architecture/migration-guardrails.md`와 일치시킨다.
- [x] 신규/변경 hand-written source/test의 500 LOC 초과를 막는 repo check를 기존 `check:*` 패턴으로 확장한다.
- [x] 기존 초과 파일은 명시적 debt allowlist로 시작하되 각 분리 커밋에서 allowlist를 줄이고 최종 0으로 만든다.
- [x] SPA는 다음 하나의 흐름으로 고정한다.
  - renderer: `domain component/hook/store → renderer domain adapter → @shared/api`
  - preload: `domain API module → safeInvoke → IPC channel`
  - main: `IPC handler → domain service → infra adapter(database/repository/FS/native)`
  - shared: cross-process `contract/schema/type/constant`만 소유

Actual (2026-07-20): 커밋 `452ad1e7`의 line-terminator 기준으로 production 9개와 test 19개, 총 28개 debt ceiling을 `scripts/source-loc-debt.json`에 기록했다. `check-source-loc.mjs`는 `src`와 `tests` 전체를 순회한다. 새 501+ LOC 파일, 기존 debt ceiling 증가, 500 이하로 내려간 stale baseline, 삭제·이동돼 발견되지 않은 baseline을 모두 실패시키며 기존 debt는 기록된 ceiling 이하에서만 통과한다. black-box TDD는 신규 source/test 초과, `src/preload`·`src/types`의 500/501 경계, 기존 debt 증가, stale/missing baseline 7건을 RED/GREEN으로 고정했고 실제 저장소 check도 PASS했다. 사용자 dirty `editor.css` 축소 hunk는 수정하지 않았고 committed ceiling `547`을 기준으로 기록했다.

### 20.2 Production Task batches — behavior-neutral responsibility split

실행 시점 `check:source-loc` 재계수가 우선이다. 2026-07-20 production baseline 9개 중 Locale trio 3개를 해소해 2026-07-21 현재 6개가 남았다. 아래 7개를 원자 Task/commit 경계로 고정한다.

1. [x] **Locale trio:** `settingsAdvanced.ts` en/ja/ko(538/538/572)를 같은 domain/key 경계로 함께 분리하고 i18n parity를 검증한다.
2. **Editor CSS:** `styles/components/editor.css`(547)를 cascade 책임 단위로 분리한다. 사용자 dirty hunk와 겹치므로 소유권을 먼저 확인하고 다른 production batch와 섞지 않는다.
3. **Analysis UI:** `AnalysisSection.tsx`(507)를 기존 `analysisSection/**` feature helper 패턴으로 분리한다.
4. **Shared settings:** `settings.ts`(506)를 settings 계약 축으로 분리하고 기존 파일은 호환 barrel로 유지한다.
5. **Memory benchmark:** `memoryWriterTaskBenchmark.ts`(524)를 scenario/measurement/reporting 책임으로 분리한다.
6. **Model runtime:** `modelRuntimeFactory.ts`(510)를 provider decision과 runtime construction 책임으로 분리한다.
7. **Project service:** `projectService.ts`(526)를 마지막에 분리하며 public class/singleton과 export queue facade를 유지한다.

각 파일은 기존 인접 directory의 `index.ts`/facade/helper 패턴을 따른다. import 호환을 위해 원래 파일은 얇은 facade 또는 barrel로 유지하고, domain responsibility 단위로만 분리한다. 위 번호 하나마다 targeted characterization test → 최소 이동 → typecheck/lint/architecture check → 독립 review → 한 Task/한 커밋 순서를 지킨다.

Actual (2026-07-21, Locale trio): LOC debt 항목을 먼저 제거해 `check-source-loc`가 ko/en/ja 572/538/538 LOC를 모두 거부하는 RED를 확인했다. 이미 존재하지만 연결되지 않았던 en/ja `settingsProjectTemplate.ts`를 재사용하고, ko에도 같은 domain 모듈을 만들었다. ja 분리본의 3개 오래된 문자열은 분리 전 실제 runtime dictionary 값을 정본으로 맞췄다. `settingsAdvanced.ts`의 public key shape는 유지되며 결과 LOC는 ko/en/ja 451/423/423(source gate 기준)다. source LOC gate와 전체 locale key parity가 PASS했다.

### 20.3 Test Task batches — behavior별 suite 분리

2026-07-20 Task 18 이후 baseline은 19개다. **기존 대형 test 파일 하나를 원자 Task/commit 하나**로 고정하고 그 파일 내부를 behavior/context별 suite와 순수 fixture builder로 분리한다. 서로 다른 기존 대형 test 파일을 같은 커밋에 묶지 않는다. 파일 크기만 줄이려고 공용 mutable fixture를 만들지 않는다.

- sync: `syncService.test.ts`(1243), `syncMemoryCanonicalApply.test.ts`(861)
- world/renderer: `worldBufferedPersistence.test.tsx`(1170), `characterStoreMutationLock.test.ts`(762), `worldEntityMutationQueue.test.ts`(719), `memoStore.test.ts`(568), `worldPackageStorage.test.ts`(535)
- memory: `memoryCanonicalPackage.test.ts`(1051), `memoryBuildJobControl.test.ts`(753), `memoryWriterTaskBenchmark.test.ts`(694), `memoryReviewBacklogReport.test.ts`(585), `memoryEntityReviewService.test.ts`(556), `settingsMemoryBuildProgress.test.ts`(546), `memoryNarrativeSummaryRunner.test.ts`(533)
- lifecycle/project: `appOperationalScenarios.test.tsx`(702), `projectExportEngine.test.ts`(630), `luieContainer.extreme.test.ts`(578), `luieContainer.test.ts`(570), `projectService.test.ts`(546)

계수상 목록은 실행 전 재생성하며 문서의 숫자와 차이가 나면 코드가 아니라 SSOT baseline을 먼저 갱신한다. 각 분리 전후 test count, test name set, pass/fail 결과를 비교한다.

### 20.4 Final certification

- [ ] allowlist가 generated/vendor 외 0인지 확인한다.
- [ ] `pnpm run check:source-loc`와 tests TS/TSX 계수 결과에서 500 초과 hand-written 파일이 0인지 확인한다.
- [ ] full typecheck/lint/core QA와 관련 Electron DB suites를 통과한다.
- [ ] architecture 문서의 main/renderer/shared 현재 사실을 최종 계수와 동기화한다.
- [ ] 독립 architecture/code/test 리뷰 Critical/Important 0 뒤 Phase 완료를 기록한다.
