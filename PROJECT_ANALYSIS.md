<!-- PROJECT ANALYSIS REPORT -->
# Luie - 프로젝트 분석 리포트
**작성 일시:** 2026년 1월 23일

---

## 📋 프로젝트 개요

### 프로젝트 명
**Luie** - "흐름을 방해하지 않는 집필 도구"

### 프로젝트 타입
- **Electron 데스크톱 애플리케이션**
- 웹소설 작가를 위한 현대적 집필 환경
- Scrivener의 강력함 + 직관적 UX

### 주요 비전
작가가 도구가 아닌 **창작에만 집중**할 수 있는 환경 제공

---

## 🛠 기술 스택

| 영역 | 기술 |
|------|------|
| **Framework** | Electron 40.x + electron-vite 5.x |
| **Frontend** | React 19 + TailwindCSS 4 |
| **Backend** | Node.js (Main Process) |
| **Database** | SQLite + Prisma ORM 7.2.0 |
| **Language** | TypeScript 5.9 |
| **State Management** | Zustand 5.0 |
| **Editor** | TipTap 3 (Rich Text Editor) |
| **Package Manager** | pnpm |
| **Test** | Vitest 4.0 |

---

## 📁 프로젝트 구조 분석

```
/Users/user/Luie/
├── src/
│   ├── main/               # Electron Main Process
│   ├── renderer/           # React UI
│   ├── preload/            # Preload 스크립트
│   ├── shared/             # Main ↔ Renderer 공유 코드
│   └── types/              # TypeScript 타입 정의
├── prisma/                 # ORM 설정 & DB 마이그레이션
└── config files            # Electron, Vite, ESLint, Tailwind 등
```

### 주요 디렉토리별 역할

#### 1. **src/main** - Electron Main Process (백엔드 로직)

**구조:**
```
main/
├── index.ts               # 앱 시작점, 싱글 인스턴스 관리
├── core/                  # 핵심 알고리즘
│   └── keywordExtractor.ts   # 자동 캐릭터 추출
├── database/              # Prisma 클라이언트
├── services/              # 비즈니스 로직
│   ├── projectService.ts
│   ├── chapterService.ts
│   ├── characterService.ts
│   ├── termService.ts
│   ├── snapshotService.ts
│   ├── searchService.ts
│   └── autoExtractService.ts
├── handler/               # IPC 핸들러 (Main ↔ Renderer 통신)
│   ├── project/           # 프로젝트/챕터 관리
│   ├── world/             # 캐릭터/고유명사 관리
│   ├── writing/           # 자동저장/스냅샷
│   ├── search/            # 검색 기능
│   ├── system/            # 파일시스템/설정/로깅
│   └── core/              # IPC 기본 구조
├── manager/               # 리소스 관리
│   ├── windowManager.ts   # Electron 윈도우 관리
│   ├── settingsManager.ts # 애플리케이션 설정
│   └── autoSaveManager.ts # 자동저장 관리
└── utils/                 # 유틸리티
    └── validation.ts      # IPC 응답 검증
```

**역할:**
- Electron 앱 생명주기 관리
- 데이터베이스 CRUD 작업
- IPC를 통한 Main-Renderer 통신
- 파일시스템 작업

#### 2. **src/renderer** - React UI (프론트엔드)

**구조:**
```
renderer/
├── src/
│   ├── App.tsx            # 메인 컴포넌트
│   ├── main.tsx           # 진입점
│   ├── components/        # React 컴포넌트
│   │   ├── editor/        # 텍스트 에디터
│   │   ├── layout/        # 레이아웃
│   │   ├── sidebar/       # 사이드바
│   │   ├── context/       # 우측 패널 (캐릭터/고유명사)
│   │   ├── settings/      # 설정 UI
│   │   ├── research/      # 리서치 패널
│   │   └── common/        # 공통 컴포넌트
│   ├── hooks/             # 커스텀 훅
│   │   ├── useProjectInit.ts
│   │   ├── useFileImport.ts
│   │   ├── useChapterManagement.ts
│   │   ├── useSplitView.ts
│   │   └── useProjectTemplate.ts
│   ├── stores/            # Zustand 상태 관리
│   │   ├── projectStore.ts
│   │   ├── chapterStore.ts
│   │   ├── characterStore.ts
│   │   ├── termStore.ts
│   │   ├── editorStore.ts
│   │   ├── uiStore.ts
│   │   ├── autoSaveStore.ts
│   │   ├── createCRUDStore.ts   # Store 팩토리
│   │   └── others...
│   └── styles/            # CSS/Tailwind
└── index.html
```

**역할:**
- 사용자 인터페이스 제공
- IPC를 통해 Main Process와 통신
- Zustand를 사용한 전역 상태 관리
- TipTap을 사용한 텍스트 편집

#### 3. **src/shared** - Main ↔ Renderer 공유 코드

**현재 구조:**
```
shared/
├── constants/
│   ├── app.ts             # 앱 상수 (버전, DB명 등)
│   ├── errorCode.ts       # 에러 코드 정의 (8xxx 체계)
│   └── index.ts           # 재내보내기
├── ipc/
│   ├── channels.ts        # IPC 채널 정의 (50+ 채널)
│   ├── response.ts        # IPC 응답 타입
│   └── index.ts           # 재내보내기
├── logger/
│   └── index.ts           # 로깅 유틸리티
├── schemas/
│   └── index.ts           # Zod 검증 스키마
├── types/
│   └── index.ts           # 공유 타입 정의 (60+ 타입)
```

**역할:**
- Main과 Renderer 간 통신의 `계약(Contract)` 정의
- 양쪽에서 공통으로 사용할 타입과 상수 제공
- 에러 처리 표준화

#### 4. **src/preload**
- Electron의 preload 스크립트
- IPC 핸들러를 Renderer에 노출

#### 5. **src/types**
- 전체 애플리케이션의 TypeScript 타입 정의
- `global.d.ts`: Renderer에서 IPC 함수 타입 확장

#### 6. **prisma/**
- `schema.prisma`: 데이터베이스 스키마
- `migrations/`: 데이터베이스 마이그레이션 히스토리

---

## 🎯 MVP (Minimum Viable Product) 기능 현황

| 기능 | 상태 | 진행도 |
|------|------|--------|
| 📝 텍스트 편집기 | 95% | TipTap 통합 완료 |
| 📚 회차/문서 구조 | 90% | CRUD 구현 완료 |
| 💾 자동 저장 | 85% | 기본 기능 완료, 상세 최적화 중 |
| 📖 시놉시스 | 80% | DB 스키마 완성 |
| 🎭 캐릭터 관리 | 75% | 자동 추출 기본 구현, 고도화 필요 |
| 📚 고유명사 사전 | 75% | CRUD 구현 완료 |
| 🔍 통합 검색 | 70% | 기본 검색 기능 구현 |
| 📸 스냅샷/버전관리 | 65% | DB 스키마, 제한적 구현 |
| ⚙️ 설정 UI | 60% | 기본 구조만 구현 |

**전체 진행도: ~78%**

---

## 📊 데이터베이스 구조

### 현재 모델 (Prisma Schema)
```
Project (프로젝트)
├── Chapter (챕터/회차)
├── Character (캐릭터)
│   └── CharacterAppearance (등장 기록)
├── Term (고유명사)
├── Snapshot (스냅샷)
└── ProjectSettings (프로젝트 설정)
```

### 마이그레이션 히스토리
- **20260116144843_init**: 초기 스키마 생성
- **20260118063653_add_project_path**: 프로젝트 경로 추가

---

## 🔌 IPC 채널 분석

**총 51개 채널 정의됨:**

| 카테고리 | 채널 수 | 예시 |
|---------|--------|------|
| Project | 5 | `project:create`, `project:get-all` |
| Chapter | 6 | `chapter:create`, `chapter:reorder` |
| Character | 5 | `character:create`, `character:delete` |
| Term | 5 | `term:create`, `term:get-all` |
| Snapshot | 4 | `snapshot:create`, `snapshot:restore` |
| Auto Save | 1 | `auto-save` |
| Search | 1 | `search` |
| File System | 8 | `fs:select-directory`, `fs:save-project` |
| Settings | 8 | `settings:get-all`, `settings:reset` |
| **Total** | **51** | - |

---

## ⚠️ SHARED 폴더에서 부족한 것들

### 1️⃣ **공유 상수 부족**
**현황:**
- 정의된 상수: 9개 (APP_NAME, DB_NAME, AUTO_SAVE_INTERVAL 등)
- **부족한 상수:** 많음

**필요한 추가 상수:**
```typescript
// UI/UX 관련
- DEFAULT_EDITOR_FONT_SIZE
- DEFAULT_EDITOR_FONT_FAMILY
- DEFAULT_THEME ('light' | 'dark')
- SIDEBAR_COLLAPSE_WIDTH
- MAX_RECENT_PROJECTS

// 성능 관련
- CHARACTER_EXTRACTION_DEBOUNCE_TIME
- AUTO_SAVE_DEBOUNCE_TIME
- SEARCH_DEBOUNCE_TIME
- MAX_CHAPTER_LOAD_COUNT (분할 로딩)

// 제약 조건
- MAX_CHARACTER_DESCRIPTION_LENGTH
- MAX_TERM_DEFINITION_LENGTH
- MAX_PROJECT_TITLE_LENGTH
- MIN_AUTO_SAVE_INTERVAL
- MAX_AUTO_SAVE_INTERVAL

// 기능 관련
- SNAPSHOT_AUTO_CREATE_ON_SIGNIFICANT_CHANGE
- CHARACTER_EXTRACTION_CONFIDENCE_THRESHOLD
- SEARCH_MIN_QUERY_LENGTH
```

### 2️⃣ **에러 코드 부족**
**현황:**
- 정의된 에러 코드: 40개
- 범주화된 체계: 있음 (1xxx~9xxx)

**부족한 에러:**
```typescript
// Window Errors (9xxx)
WINDOW_CREATION_FAILED: 'WIN_9001'
WINDOW_CLOSE_FAILED: 'WIN_9002'

// Settings Errors
SETTINGS_LOAD_FAILED: 'SET_9001'
SETTINGS_SAVE_FAILED: 'SET_9002'

// Snapshot Errors
SNAPSHOT_RESTORE_FAILED: 'SNP_9003'
SNAPSHOT_LIMIT_EXCEEDED: 'SNP_9004'

// Search Errors
SEARCH_INDEX_BUILD_FAILED: 'SRC_4004'
SEARCH_NO_RESULTS: 'SRC_4005'  // 경고 아님, 정상 응답

// Auto-Extract Errors
AUTO_EXTRACT_FAILED: 'AUT_9001'
```

### 3️⃣ **IPC 채널 부족**
**현황:**
- 정의된 채널: 51개
- 모두 구현됨

**추가 필요 채널:**
```typescript
// Window 관련
WINDOW_MINIMIZE: "window:minimize"
WINDOW_MAXIMIZE: "window:maximize"
WINDOW_CLOSE: "window:close"
WINDOW_TOGGLE_DEV_TOOLS: "window:toggle-dev-tools"

// 앱 상태
APP_GET_VERSION: "app:get-version"
APP_CHECK_UPDATE: "app:check-update"

// 로거
LOGGER_GET_LOGS: "logger:get-logs"
LOGGER_EXPORT_LOGS: "logger:export-logs"

// 캐시/성능
CACHE_CLEAR: "cache:clear"
CACHE_SIZE: "cache:get-size"
```

### 4️⃣ **검증 스키마 부족**
**현황:**
- 정의된 스키마: 7개 (CRUD 스키마만)
- Zod 사용 O

**부족한 스키마:**
```typescript
// 업데이트 스키마들
projectUpdateSchema      // ✅ 있음
chapterUpdateSchema      // ✅ 있음
characterUpdateSchema    // ❌ 없음
termUpdateSchema         // ❌ 없음

// 검색/필터 스키마
searchQuerySchema        // ❌ 없음

// 설정 스키마
settingsSchema           // ❌ 없음
editorSettingsSchema     // ❌ 없음

// 유효성 검사
projectPathSchema        // ❌ 없음
fileImportSchema         // ❌ 없음
```

### 5️⃣ **공유 타입 부족**
**현황:**
- 정의된 타입: 60+ 개
- 잘 구성됨

**추가 필요 타입:**
```typescript
// Settings 타입
interface EditorSettings {
  fontFamily: string
  fontSize: number
  lineHeight: number
  theme: 'light' | 'dark'
  autoSave: boolean
  autoSaveInterval: number
}

interface WindowSettings {
  bounds: { x: number; y: number; width: number; height: number }
  isMaximized: boolean
}

// Search 결과 타입 확장
interface SearchResultDetails {
  highlightedText: string
  contextLines: string[]
  matchCount: number
}

// 작업 진행 상태
type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed'

interface TaskProgress {
  taskId: string
  status: TaskStatus
  progress: number // 0-100
  message?: string
}
```

### 6️⃣ **로깅 시스템 미흡**
**현황:**
- 기본 Logger 구현: O
- 파일 로깅: ❌ TODO로 남겨짐
- 로그 레벨: 4개 (DEBUG, INFO, WARN, ERROR)

**부족한 것:**
```typescript
// 1. 파일 로깅 미구현
// src/shared/logger/index.ts 에 TODO: 추후 파일 로깅 시스템 추가

// 2. 로그 지속성 없음
// - 메모리에만 저장

// 3. 로그 레벨 필터링 없음
// - 모든 레벨이 출력됨

// 4. 구조화된 로깅 없음
// - JSON 형식 로깅 미지원
```

### 7️⃣ **응답 타입 확장 필요**
**현황:**
```typescript
interface IPCResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}
```

**개선 필요:**
```typescript
interface IPCResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>  // ❌ 추가 필요
    timestamp?: string                 // ❌ 추가 필요
  }
  meta?: {                             // ❌ 추가 필요
    timestamp: string
    duration: number  // 응답 시간
    version: string
  }
}
```

---

## 🔄 각 영역의 역할 정리

### Main Process (src/main/)
**역할:**
- Electron 앱 관리
- 데이터베이스 CRUD
- 파일시스템 작업
- IPC 핸들러 구현

**주요 파일:**
- `services/*`: 비즈니스 로직
- `handler/*`: IPC 엔드포인트
- `manager/*`: 상태 관리

### Renderer (src/renderer/)
**역할:**
- UI 렌더링
- 사용자 입력 처리
- 전역 상태 관리 (Zustand)
- IPC를 통해 Main과 통신

**주요 파일:**
- `components/*`: React 컴포넌트
- `stores/*`: Zustand 저장소
- `hooks/*`: 커스텀 훅

### Shared (src/shared/)
**역할:**
- **메인-렌더러 간 계약 정의**
- 공유 타입, 상수, 채널 정의
- 공유 유틸리티 (Logger)
- 데이터 검증 (Schemas)

**현재 역할:**
- ✅ 타입 정의: 완성도 80%
- ✅ 채널 정의: 완성도 85%
- ✅ 상수 정의: 완성도 50%
- ✅ 에러 코드: 완성도 60%
- ✅ 로거: 완성도 70% (파일 로깅 미구현)
- ✅ 스키마: 완성도 40%

---

## 💡 결론 및 권장사항

### 현재 상태 요약
- **프로젝트:** 웹소설 작가용 Electron 데스크톱 앱
- **진행도:** ~78% (MVP 기능 대부분 구현)
- **구조:** 잘 정의된 Main-Renderer 분리, IPC 통신

### Shared 폴더의 문제점
1. **상수**: 필요한 것의 50% 정도만 정의
2. **검증**: Zod 스키마 미흡 (Update 스키마 부족)
3. **타입**: 기본은 잘 되어있으나 Settings/Progress 관련 미흡
4. **로깅**: 파일 저장 미구현
5. **에러**: 에러 코드 부분적으로 미흡

### 개선 우선순위
1. **긴급**: Update 스키마 추가 (characterUpdateSchema, termUpdateSchema)
2. **높음**: Settings 관련 타입 추가 (EditorSettings, WindowSettings)
3. **높음**: 파일 로깅 구현
4. **중간**: 부족한 상수 추가
5. **중간**: 응답 타입 확장 (meta, details)
6. **낮음**: 추가 IPC 채널 (Window 제어 등)

