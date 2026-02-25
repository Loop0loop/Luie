# Luie - 차세대 작가 집필 환경

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

> "흐름을 방해하지 않는 집필 도구"

Luie는 웹소설 작가를 위한 Electron 기반 데스크톱 애플리케이션입니다. Scrivener의 강력한 기능과 현대적이고 직관적인 UX를 결합하여, 작가가 도구가 아닌 창작에만 집중할 수 있도록 설계되었습니다.

## 기술 스택

- **Framework**: Electron 34.x + electron-vite 5.x
- **Frontend**: React 19, TailwindCSS 4
- **Database**: SQLite + Prisma ORM
- **Language**: TypeScript 5
- **Test**: Vitest
- **Package Manager**: pnpm

## 프로젝트 구조

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

**Luie** - 작가가 창작에만 집중할 수 있도록
# Luie
