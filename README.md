# Luie - 차세대 작가 집필 환경

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

> "흐름을 방해하지 않는 집필 도구"

Luie는 웹소설 작가를 위한 Electron 기반 데스크톱 애플리케이션입니다. Scrivener의 강력한 기능과 현대적이고 직관적인 UX를 결합하여, 작가가 도구가 아닌 창작에만 집중할 수 있도록 설계되었습니다.

## ✨ 주요 기능

### Must Have (MVP)
- 📝 **텍스트 편집기**: 방해받지 않는 집필 환경
- 📚 **회차/문서 구조**: 장편 연재 단위 관리
- 💾 **자동 저장**: 작업 손실 방지
- 📖 **시놉시스**: 전체 구조 파악
- 🎭 **캐릭터 관리**: 자동 생성 + 수동 수정
- 📚 **고유명사 사전**: 세계관 정리
- 🔍 **통합 검색**: 빠른 탐색
- 📸 **스냅샷**: 버전 복원

## 🛠 기술 스택

- **Framework**: Electron 34.x + electron-vite 5.x
- **Frontend**: React 19, TailwindCSS 4
- **Database**: SQLite + Prisma ORM
- **Language**: TypeScript 5
- **Test**: Vitest
- **Package Manager**: pnpm

## 📁 프로젝트 구조

```
src/
├── main/                 # Electron Main Process
│   ├── core/            # 핵심 로직
│   ├── services/        # 비즈니스 로직
│   ├── manager/         # 윈도우/리소스 관리
│   ├── handler/         # IPC 핸들러
│   └── database/        # Prisma 클라이언트
├── shared/              # Main-Renderer 공유 코드
│   ├── ipc/            # IPC 채널 정의
│   ├── constants/      # 상수 및 ErrorCode
│   ├── logger/         # 로깅 시스템
│   └── types/          # 공유 타입
├── types/               # TypeScript 타입 정의
├── renderer/            # React 애플리케이션
│   └── src/
└── preload/             # Preload 스크립트
```

## 🚀 시작하기

### 필수 요구사항

- Node.js 18.x 이상
- pnpm 8.x 이상

### 설치

```bash
# 의존성 설치
pnpm install

# 빌드 스크립트 승인 (native 모듈)
pnpm approve-builds @prisma/client @prisma/engines better-sqlite3 electron esbuild prisma

# 데이터베이스 마이그레이션
pnpm prisma migrate dev --name init
```

### 개발

```bash
# 개발 서버 실행
pnpm dev

# TypeScript 타입 체크
pnpm typecheck

# 프로덕션 빌드
pnpm build
```

## 📋 데이터베이스 스키마

- **Project**: 프로젝트 최상위 단위
- **Chapter**: 챕터/회차 (집필 단위)
- **Character**: 캐릭터 정보
- **Term**: 고유명사 사전
- **Snapshot**: 버전 스냅샷

자세한 내용은 [prisma/schema.prisma](prisma/schema.prisma)를 참조하세요.

## 🎯 개발 원칙

1. **Zero Learning UX**: 학습 없이 즉시 사용 가능
2. **Flow First**: 집필 흐름 방해 최소화
3. **Auto Everything**: 정리/관리 자동화
4. **Local First**: 네트워크 없이 완전 동작
5. **Data Safety**: 데이터 손실 방지 최우선

## 📝 타입 안정성

- 모든 IPC 통신은 타입 안전
- Prisma로 데이터베이스 타입 보장
- Zod로 런타임 검증 (예정)
- 엄격한 TypeScript 설정

## 🐛 디버깅

프로젝트는 명확한 에러 코드 시스템을 사용합니다:

- `DB_xxxx`: 데이터베이스 에러
- `FS_xxxx`: 파일시스템 에러
- `VAL_xxxx`: 검증 에러
- `IPC_xxxx`: IPC 에러
- `PRJ_xxxx`: 프로젝트 에러
- `CHP_xxxx`: 챕터 에러

자세한 내용은 [src/shared/constants/errorCode.ts](src/shared/constants/errorCode.ts)를 참조하세요.

## 🗺 로드맵

### v0.1 (Current - MVP)
- [x] 프로젝트 기본 구조
- [x] 데이터베이스 스키마
- [x] IPC 통신 기반
- [x] 기본 UI 레이아웃
- [ ] 텍스트 에디터 구현
- [ ] 캐릭터 관리 UI
- [ ] 고유명사 사전 UI

### v0.2
- [ ] 자동 저장 시스템
- [ ] 스냅샷 기능
- [ ] 검색 기능
- [ ] 키워드 자동 추출

### v1.0
- [ ] 아웃라이너 뷰
- [ ] 코르크보드 뷰
- [ ] 성능 최적화
- [ ] 안정성 개선

### v1.5+
- [ ] 클라우드 동기화
- [ ] 모바일 뷰어
- [ ] Tauri 마이그레이션 검토

## 📄 라이선스

MIT License

## 🙏 감사의 말

이 프로젝트는 다음 도구들로부터 영감을 받았습니다:
- Scrivener - 강력한 집필 도구의 표준
- Notion - 현대적인 UX의 기준
- Obsidian - 로컬 우선 철학

---

**Luie** - 작가가 창작에만 집중할 수 있도록
# Luie
