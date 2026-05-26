# Plan: RAG 임베딩 파이프라인 + ModelTab HF 모델 검색/설치

**Created**: 2026-05-26  
**Branch**: feature/rag-embedding-modeltab-hf-search  
**Phase**: Plan

---

## Executive Summary

| 관점 | 내용 |
|---|---|
| **Problem** | RAG가 챕터 청크만 임베딩해 캐릭터/팩션/이벤트 데이터가 벡터 검색에서 완전히 누락됨. ModelTab은 단일 하드코딩 모델만 설치 가능하고 i18n 미적용. |
| **Solution** | `embeddingProjector`의 CHAPTER 하드필터 제거로 모든 엔티티 타입 임베딩 활성화. ModelTab에 HF API 검색/GGUF 파일 선택/다운로드 UI 추가. |
| **UX Effect** | 질문에 캐릭터 이름이 없어도 관련 캐릭터/팩션 정보가 RAG Evidence에 포함됨. 사용자가 원하는 GGUF 양자화 모델(Q4/Q5/Q8)을 직접 검색해 설치 가능. |
| **Core Value** | RAG가 단순 챕터 요약과 구분되는 진짜 "세계관 인식" 컨텍스트를 제공. 모델 선택 자유도 확보. |

---

## 1. User Intent Discovery (Phase 1 결과)

- **핵심 문제**: RAG가 챕터 요약과 동일한 수준 → 캐릭터/팩션/이벤트 데이터 누락
- **타겟 사용자**: 장편 집필 작가 (세계관 복잡한 경우)
- **성공 기준**:
  - 캐릭터 이름 없는 질문에도 관련 캐릭터 청크가 Layer3 Evidence에 등장
  - ModelTab에서 HF 검색 → GGUF 파일 선택 → 다운로드가 UI 안에서 완결

---

## 2. Code Review 기반 근거 (Score: 62/100)

### Critical Issues → V1 해결 대상

| ID | 파일 | 이슈 | 영향 |
|---|---|---|---|
| C1 | `embeddingProjector.ts:79` | `eq(targetType, CHAPTER)` 하드필터 | CHARACTER/FACTION 등 영구 임베딩 불가 |
| C2 | `embeddingProjector.ts:124` | `sourceType = CHAPTER` 고정 | C1과 결합, 임베딩 파이프라인 chapter 전용 |
| M2-M4 | `ModelTab.tsx`, `ipcSettingsHandlers.ts` | HF 검색 UI 없음, DEFAULT_MODEL 하드코딩 | 단일 모델만 설치 가능 |
| M1 | `ModelTab.tsx` | i18n 전체 미적용 (한국어 하드코딩 다수) | 다국어 지원 없음 |

### Deferred (V2+)

| ID | 이슈 | 이유 |
|---|---|---|
| C3 | `chapterId` → Layer3 미전달 | 임베딩 기반 개선 이후 의미 있음 |
| C4 | `searchChunks` targetType 필터 없음 | C1+C2 fix로 1차 개선 충분 |
| M5 | Layer2 keyword-only (시맨틱 없음) | C1+C2 이후 Layer3 경로로 대부분 해결 |
| M6 | 토큰 0개 시 Layer2 entities 전부 유실 | 별도 이슈로 분리 |

---

## 3. Alternatives Explored (Phase 2 결과)

### Feature A: RAG 임베딩 파이프라인 수정

**Approach A (선택)**: 단계별 파이프라인 수정
- `embeddingProjector.ts` 2줄 수정
- 기존 엔티티는 "메모리 재구성" 버튼으로 재임베딩 트리거 (별도 migration 스크립트 불필요)
- 리스크: 낮음. 기존 chapter 임베딩 로직 무변경.

**Approach B (기각)**: 엔티티별 별도 임베딩 파이프라인
- 구조적으로 깔끔하나 구현 3단계 추가, 리스크 높음

### Feature B: ModelTab HF 검색/설치

**Approach A (선택)**: HF API 직접 호출
- 백엔드 `searchHfModels`/`getHfModelFiles` IPC 노출
- 실시간 검색, 자유로운 모델 선택

**Approach B (기각)**: 큐레이션 리스트 하드코딩
- 간단하나 모델 추가마다 코드 수정 필요

---

## 4. YAGNI Review (Phase 3 결과)

### V1 포함

- [x] C1+C2: `embeddingProjector` CHAPTER 필터 제거
- [x] `searchHfModels` / `getHfModelFiles` IPC 노출 (channels + handler + preload)
- [x] ModelTab 검색 UI + GGUF 파일 선택 + 다운로드 progress
- [x] i18n ko/en/ja `settings.models.hfSearch.*` 키 추가

### V1 제외 (Deferred)

- [ ] C3: `chapterId` → Layer3 전달
- [ ] C4: `searchChunks` `sourceTypes` 파라미터
- [ ] M5: Layer2 시맨틱 검색
- [ ] M6: 토큰 0개 fallback
- [ ] HF 토큰 입력 UI (private 모델 접근)
- [ ] `embeddingProjector` M8 트랜잭션 async 명시

---

## 5. 구현 태스크

### Task 1: RAG — embeddingProjector CHAPTER 필터 제거

**파일**: `src/main/services/features/memory/embeddingProjector.ts`

**변경 1**: `processPendingEmbeddingJobs` 쿼리에서 targetType 필터 제거

```typescript
// Line ~79: 삭제
- eq(memoryBuildJob.targetType, MEMORY_TARGET_TYPES.CHAPTER),
```

**변경 2**: chunk 조회 시 sourceType을 job.targetType으로

```typescript
// Line ~124: 수정
- eq(memoryChunk.sourceType, MEMORY_TARGET_TYPES.CHAPTER),
+ eq(memoryChunk.sourceType, job.targetType),
```

**검증**:
- `processPendingEmbeddingJobs` 호출 시 CHARACTER/FACTION targetType job이 처리되는지 확인
- 기존 CHAPTER 임베딩 로직 무변경 확인

---

### Task 2: IPC — HF 검색/파일목록 채널 추가

**파일**: `src/shared/ipc/channels.ts`

```typescript
// 기존 MODEL_DOWNLOAD_* 아래 추가
MODEL_SEARCH_HF: "model:search-hf",
MODEL_GET_HF_FILES: "model:get-hf-files",
```

**파일**: `src/main/handler/system/ipcSettingsHandlers.ts`

```typescript
// modelStorageService import 확인 (이미 있을 경우 skip)
// 핸들러 배열에 추가:
{
  channel: IPC_CHANNELS.MODEL_SEARCH_HF,
  logTag: "MODEL_SEARCH_HF",
  failMessage: "HF model search failed",
  handler: async (_, { query }: { query: string }) =>
    modelStorageService.searchHfModels(query),
},
{
  channel: IPC_CHANNELS.MODEL_GET_HF_FILES,
  logTag: "MODEL_GET_HF_FILES",
  failMessage: "HF model files fetch failed",
  handler: async (_, { repoId }: { repoId: string }) =>
    modelStorageService.getHfModelFiles(repoId),
},
```

**파일**: `src/preload/api/systemApi.ts`

```typescript
// settings 객체에 추가
searchHfModels: (query: string) =>
  safeInvoke(IPC_CHANNELS.MODEL_SEARCH_HF, { query }),
getHfModelFiles: (repoId: string) =>
  safeInvoke(IPC_CHANNELS.MODEL_GET_HF_FILES, { repoId }),
```

**파일**: `src/shared/api/index.ts` — 타입 추가 (HfModelSearchResult, HfModelFile)

---

### Task 3: i18n — HF 검색 키 추가

**파일**: `src/renderer/src/i18n/locales/ko/base.ts`

`settings` 객체 내 `models` 하위에 추가:

```typescript
hfSearch: {
  title: "HuggingFace 모델 검색",
  placeholder: "예: Qwen2.5-Instruct, Gemma3, Llama",
  searchBtn: "검색",
  searching: "검색 중...",
  selectFile: "GGUF 파일 선택",
  noResults: "검색 결과 없음",
  downloads: "다운로드",
  size: "크기",
  downloadSelected: "선택한 모델 다운로드",
},
```

동일 키를 `en/base.ts`, `ja/base.ts`에 추가 (영문/일문 번역).

---

### Task 4: ModelTab UI — HF 검색 섹션

**파일**: `src/renderer/src/features/settings/components/tabs/ModelTab.tsx`

**추가 local state**:

```typescript
const [hfQuery, setHfQuery] = useState("");
const [hfResults, setHfResults] = useState<HfModelSearchResult[]>([]);
const [hfFiles, setHfFiles] = useState<HfModelFile[]>([]);
const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
const [selectedFile, setSelectedFile] = useState<HfModelFile | null>(null);
const [hfSearching, setHfSearching] = useState(false);
const [hfFilesLoading, setHfFilesLoading] = useState(false);
```

**추가 핸들러**:

```typescript
const handleHfSearch = async () => {
  if (!hfQuery.trim()) return;
  setHfSearching(true);
  setHfResults([]);
  setHfFiles([]);
  setSelectedRepo(null);
  setSelectedFile(null);
  try {
    const results = await api.settings.searchHfModels(hfQuery.trim());
    setHfResults(results ?? []);
  } finally {
    setHfSearching(false);
  }
};

const handleSelectRepo = async (repoId: string) => {
  setSelectedRepo(repoId);
  setSelectedFile(null);
  setHfFilesLoading(true);
  try {
    const files = await api.settings.getHfModelFiles(repoId);
    setHfFiles(files ?? []);
  } finally {
    setHfFilesLoading(false);
  }
};

const handleDownloadSelected = () => {
  if (!selectedRepo || !selectedFile) return;
  void onDownloadLocalModel({ repo: selectedRepo, filename: selectedFile.filename });
};
```

**UI 구조** (로컬 LLM 섹션 내부):

```
[검색 input] [검색 버튼]
─────────────────────────
모델 목록 (repoId | downloads | likes)
  → 클릭 시 파일 목록 펼쳐짐
  파일 목록 (filename | size)
    → 선택 후 [선택한 모델 다운로드] 버튼
─────────────────────────
기존 다운로드 progress bar (재사용)
```

**Props 변경**: `onDownloadLocalModel` 시그니처를 `() => Promise<void>` → `(opts?: { repo: string; filename: string }) => Promise<void>`로 확장.

---

### Task 5: useSettingsModel 훅 + IPC 핸들러 시그니처 일반화

**파일**: `src/renderer/src/features/settings/hooks/useSettingsModel.ts`

`handleDownloadLocalModel`이 `{ repo, filename }` 인자를 받아 `api.settings.startModelDownload({ repo, filename })`에 전달하도록 수정.

**파일**: `src/main/handler/system/ipcSettingsHandlers.ts`

`MODEL_DOWNLOAD_START` 핸들러:
- 인자가 없으면 `DEFAULT_MODEL` 사용 (기존 동작 유지)
- `{ repo, filename }` 있으면 해당 값으로 `downloadGguf` 호출

---

## 6. 의존 관계 및 실행 순서

```
Task 1 (RAG fix)          ← 독립, 먼저 실행 가능
Task 2 (IPC 채널/핸들러) ← 독립
Task 3 (i18n)             ← 독립
Task 4 (ModelTab UI)      ← Task 2, 3 완료 후
Task 5 (훅 + 핸들러 일반화) ← Task 2 완료 후, Task 4와 병렬
```

---

## 7. 검증 기준

### RAG
- `embeddingProjector` 실행 후 `memoryEmbedding` 테이블에 `sourceType = 'character'` 레코드 생성
- 캐릭터 이름 없는 질문으로 RAG Q&A 시 Layer3 Evidence에 캐릭터 청크 포함
- 기존 챕터 임베딩 로직 무변경 (chapter 청크 정상 검색)

### ModelTab
- `api.settings.searchHfModels("Qwen")` IPC 호출 → 결과 반환
- ModelTab 검색창에서 "Qwen" 입력 → 결과 목록 표시
- 모델 선택 → GGUF 파일 목록 표시 (Q4_K_M, Q5_K_S 등)
- 파일 선택 → 다운로드 progress 표시
- ko/en/ja 언어 전환 시 i18n 키 정상 렌더링
- DEFAULT_MODEL 다운로드 (기존 버튼) 동작 무변경

---

## 8. Deferred 백로그

| 이슈 | 설명 | 예상 V |
|---|---|---|
| C3 | chapterId → Layer3 evidence boosting | V2 |
| C4 | searchChunks sourceTypes 파라미터 + MemoryChunkFts sourceType 컬럼 | V2 |
| M5 | Layer2 keyword → 임베딩 hybrid 검색 | V2 |
| M6 | 토큰 0개 시 Top-N entity fallback | V2 |
| M7 | RagContextPacket diagnostics 필드 | V2 |
| HF 토큰 | Private 리포지토리 접근 UI | V3 |
| M8 | embeddingProjector 트랜잭션 async 명시 | Minor |

---

## Next Step

```
/pdca design rag-embedding-modeltab-hf-search
```
