# 🔥 Luie Electron App - Critical Issues & Action Plan

> **생성일**: 2026-02-05  
> **상태**: 🔴 CRITICAL - 즉시 수정 필요  
> **목적**: 현재 Electron 앱의 모든 구조적 문제를 진단하고 우선순위별 해결 방안 제시

---

## 📋 Executive Summary

현재 **5개 주요 카테고리**에서 **총 17개의 critical/high severity 이슈** 발견:

| 카테고리 | Critical | High | Medium | 상태 |
|---------|----------|------|--------|------|
| 1️⃣ Prisma & Database | 2 | 1 | 0 | 🔴 |
| 2️⃣ 환경 구분 (Dev/Prod) | 1 | 2 | 1 | 🟡 |
| 3️⃣ Lifecycle & State | 0 | 3 | 2 | 🟡 |
| 4️⃣ Build & Preview | 2 | 0 | 1 | 🔴 |
| 5️⃣ Security (CSP) | 1 | 1 | 0 | 🔴 |

**즉시 차단 중인 이슈**: 
- ❌ Prisma `migrate dev` 실행 실패 (seed 옵션 제거됨)
- ❌ Preview 빌드 후 static server 부재
- ❌ CSP 미설정으로 보안 경고

---

## 🔴 Category 1: Prisma & Database Issues

### Issue #1.1 - Prisma 7.x `--skip-seed` 옵션 제거 [CRITICAL]

**현재 상태**: ❌ Electron dev 실행 실패

**에러 로그**:
```
! unknown or unexpected option: --skip-seed
```

**근본 원인**:
- Prisma 7.0부터 `migrate dev`가 자동으로 seed 스크립트를 실행하지 않음
- `--skip-seed` 플래그가 완전히 제거됨
- [공식 문서](https://www.prisma.io/docs/orm/reference/prisma-cli-reference): "Prisma 7+ no longer automatically triggers prisma generate or seed scripts"

**영향 범위**:
- `src/main/database/index.ts:176` - dev 환경 migration
- 테스트 환경에서도 불필요한 옵션 사용 중

**해결책** (우선순위: P0 - 즉시):
```typescript
// ❌ 현재 (Prisma 6 스타일)
execSync(`"${prismaPath}" migrate dev --skip-seed --schema="${schemaPath}"`)

// ✅ 수정 (Prisma 7)
execSync(`"${prismaPath}" migrate dev --schema="${schemaPath}"`)
```

**적용 시점**: 즉시 (이미 수정 완료)

---

### Issue #1.2 - Seed 스크립트 실행 전략 부재 [HIGH]

**현재 상태**: ⚠️ Seed 실행 시점 불명확

**문제점**:
- Prisma 7부터 seed는 명시적 호출 필요: `npx prisma db seed`
- `prisma.config.ts`에 seed 경로만 정의되어 있음
- 실제 seed 실행 전략 없음

**prisma.config.ts 현황**:
```typescript
// 현재 seed 설정 있는지 확인 필요
export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
    seed: 'tsx prisma/seed.ts' // ← 이 설정이 있는지 확인
  },
  datasource: {
    url: env('DATABASE_URL')
  }
})
```

**해결책** (우선순위: P1 - 1주 이내):
1. **개발 환경**: 수동 실행 (`pnpm db:seed` 스크립트 추가)
2. **테스트 환경**: `beforeAll` 훅에서 명시적 호출
3. **프로덕션**: 첫 실행 시 자동 seed (빈 DB 감지 시)

**Action Items**:
- [x] `package.json`에 `db:seed` 스크립트 추가
- [x] 테스트 setup에 seed 로직 추가
- [x] 프로덕션 첫 실행 감지 로직 추가

---

### Issue #1.3 - Migration 전략 혼재 [MEDIUM]

**현재 상태**: 🟡 환경별 migration 방식 이제야 정리됨

**개선 사항** (이미 적용):
```typescript
// PRODUCTION (isPackaged)
→ migrate deploy

// TEST (VITEST=true)  
→ db push --skip-generate --accept-data-loss

// DEVELOPMENT (!isPackaged && !isTest)
→ migrate dev
```

**검증 필요**:
- [ ] 각 환경에서 실제 동작 테스트
- [ ] Migration history 정상 생성 확인
- [ ] Shadow database 경로 검증

---

## 🟡 Category 2: 환경 구분 (Dev/Production)

### Issue #2.1 - `process.env.NODE_ENV` vs `app.isPackaged` 혼용 [CRITICAL]

**현재 상태**: 🟡 일부 수정 완료, 전수조사 필요

**문제점**:
- `NODE_ENV`는 build tool용 (Vite, Webpack)
- `app.isPackaged`는 Electron runtime용
- 혼용 시 dev 빌드를 production으로 오인

**수정 완료**:
- ✅ `windowManager.ts` - `app.isPackaged` 기반으로 변경
- ✅ `database/index.ts` - `isPackaged` 변수로 환경 구분

**검증 필요**:
```bash
# 전체 코드베이스에서 NODE_ENV 체크 검색
grep -r "process.env.NODE_ENV" src/
```

**해결책** (우선순위: P1):
- [ ] 모든 `process.env.NODE_ENV` 찾아서 용도별 분류
- [ ] Runtime 환경 구분은 `app.isPackaged`로 통일
- [ ] Build time 설정은 `import.meta.env.MODE` 사용 (Vite)

---

### Issue #2.2 - 환경별 설정 파일 분리 부재 [HIGH]

**현재 상태**: ⚠️ 하드코딩된 설정 다수

**문제점**:
- DEV_SERVER_URL 같은 상수가 코드에 하드코딩
- 환경별 다른 설정 관리 불가
- `.env` 파일 활용 미흡

**해결책** (우선순위: P1):
```typescript
// .env.development
VITE_DEV_SERVER_URL=http://localhost:5173
DATABASE_URL=file:./prisma/dev.db

// .env.production  
DATABASE_URL=file:{userData}/luie.db

// .env.test
DATABASE_URL=file:./prisma/.tmp/test.db
```

**Action Items**:
- [ ] `.env.development`, `.env.production`, `.env.test` 생성
- [ ] `dotenv` 로딩 순서 검증
- [ ] 환경별 설정 문서화

---

### Issue #2.3 - `isTest` 플래그 일관성 없음 [HIGH]

**현재 상태**: ⚠️ 여러 방식으로 테스트 환경 감지

```typescript
// database/index.ts
const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test"

// 다른 곳에서는?
if (process.env.NODE_ENV === 'test')
if (process.env.VITEST)
```

**해결책** (우선순위: P2):
- 공통 유틸리티 함수 생성: `src/main/utils/environment.ts`
```typescript
export const isTest = () => 
  process.env.VITEST === 'true' || 
  process.env.NODE_ENV === 'test'

export const isDev = () => 
  !app.isPackaged && !isTest()

export const isProduction = () => 
  app.isPackaged
```

---

## 🟡 Category 3: Lifecycle & State Management

### Issue #3.1 - App quit 시 save 실패 가능성 [HIGH]

**현재 상태**: ⚠️ Race condition 존재

**코드 분석** (`src/main/index.ts`):
```typescript
app.on("before-quit", (event) => {
  if (isQuitting) return;
  isQuitting = true;
  event.preventDefault();

  void (async () => {
    try {
      await Promise.race([
        autoSaveManager.flushAll(),
        new Promise((resolve) => setTimeout(resolve, 3000)), // ← 3초 timeout
      ]);
    } catch (error) {
      logger.error("Failed to flush auto-save", error);
    } finally {
      await db.disconnect();
      app.exit(0);
    }
  })();
});
```

**문제점**:
1. 3초 timeout 후 강제 종료 → 데이터 손실 가능
2. `flushAll()` 실패 시 에러만 로그하고 종료
3. DB disconnect가 완료되지 않을 수 있음

**해결책** (우선순위: P1):
```typescript
// 1. Timeout 증가 + 진행 상황 표시
await Promise.race([
  autoSaveManager.flushAll({ showProgress: true }),
  new Promise((resolve) => setTimeout(resolve, 10000)) // 10초
]);

// 2. Critical data만 우선 저장
await autoSaveManager.flushCritical(); // 1초 이내 완료 보장

// 3. 강제 종료 전 마지막 스냅샷
await createEmergencySnapshot();
```

**Action Items**:
- [ ] `flushCritical()` 메서드 구현
- [ ] Emergency snapshot 로직 추가
- [ ] Quit 진행 상황 UI 표시 (optional)

---

### Issue #3.2 - Window state 복원 없음 [MEDIUM]

**현재 상태**: ⚠️ 매번 기본 크기/위치로 시작

**문제점**:
- `windowManager.ts`에 state 저장 로직 없음
- 사용자가 창 크기/위치 조정해도 다음 실행 시 초기화

**해결책** (우선순위: P2):
```typescript
// electron-window-state 라이브러리 사용
import windowStateKeeper from 'electron-window-state';

createMainWindow() {
  const windowState = windowStateKeeper({
    defaultWidth: WINDOW_DEFAULT_WIDTH,
    defaultHeight: WINDOW_DEFAULT_HEIGHT
  });

  this.mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    // ...
  });

  windowState.manage(this.mainWindow);
}
```

---

### Issue #3.3 - Second instance 처리 미흡 [MEDIUM]

**현재 상태**: 🟡 기본 구현만 있음

**코드** (`src/main/index.ts`):
```typescript
app.on("second-instance", () => {
  const mainWindow = windowManager.getMainWindow();
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
```

**개선 가능**:
- [ ] Deep link 지원 (파일 열기)
- [ ] 두 번째 인스턴스의 argv 전달
- [ ] 알림 표시 (이미 실행 중)

---

### Issue #3.4 - Crash recovery 없음 [HIGH]

**현재 상태**: ❌ 크래시 시 데이터 손실

**해결책** (우선순위: P1):
```typescript
// 1. Renderer crash 감지
app.on('renderer-process-crashed', (event, webContents, killed) => {
  logger.error('Renderer crashed', { killed });
  // 자동 재시작 + 마지막 상태 복원
  windowManager.restartRenderer();
});

// 2. 주기적 상태 스냅샷 (이미 구현됨)
// autoSaveManager가 이미 주기적 스냅샷 생성 중

// 3. 복구 모드
if (detectLastCrash()) {
  showRecoveryDialog();
}
```

---

## 🔴 Category 4: Build & Preview

### Issue #4.1 - Preview 빌드 후 static server 부재 [CRITICAL]

**현재 상태**: ❌ `pnpm preview` 후 앱 실행 불가

**문제점**:
- `electron-vite preview` 명령이 static file serving을 하지 않음
- Production 빌드 검증 불가

**electron-vite 공식 가이드**:
```bash
# 1. Build
pnpm build

# 2. Preview (직접 electron 실행)
electron .
```

**해결책** (우선순위: P0 - 즉시):
```json
// package.json
{
  "scripts": {
    "build": "electron-vite build",
    "preview": "electron-vite preview", // ← 이건 dev server 재시작
    "preview:prod": "pnpm build && electron ." // ← 실제 production preview
  }
}
```

**또는 electron-vite 설정**:
```typescript
// electron-vite.config.ts
export default defineConfig({
  main: {
    build: {
      outDir: 'out/main'
    }
  },
  preload: {
    build: {
      outDir: 'out/preload'
    }
  },
  renderer: {
    build: {
      outDir: 'out/renderer'
    }
  }
})
```

**Action Items**:
- [ ] `package.json`에 `preview:prod` 스크립트 추가
- [ ] Production 빌드 경로 검증
- [ ] `app.loadFile()` 경로 확인

---

### Issue #4.2 - Packaged app 테스트 불가 [CRITICAL]

**현재 상태**: ❌ 패키징 설정 없음

**문제점**:
- `electron-builder` 설정 부재
- Production DB 경로 (`app.getPath("userData")`) 테스트 불가
- Code signing 설정 없음

**해결책** (우선순위: P0):
```json
// package.json
{
  "build": {
    "appId": "com.luie.app",
    "productName": "Luie",
    "directories": {
      "output": "dist"
    },
    "files": [
      "out/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.productivity",
      "target": ["dmg", "zip"]
    },
    "win": {
      "target": ["nsis", "portable"]
    },
    "linux": {
      "target": ["AppImage", "deb"]
    }
  }
}
```

**Action Items**:
- [ ] `electron-builder` 설치 및 설정
- [ ] 로컬 빌드 테스트 (서명 없이)
- [ ] Resources 경로 검증 (`process.resourcesPath`)

---

### Issue #4.3 - Source code protection 미적용 [MEDIUM]

**현재 상태**: ⚠️ JavaScript 소스 노출

**electron-vite 가이드**:
```typescript
// electron-vite.config.ts
export default defineConfig({
  main: {
    build: {
      bytecode: true, // V8 bytecode로 컴파일
      protectedStrings: [
        'encryption-key-here',
        'api-secret'
      ]
    }
  }
})
```

**Action Items** (우선순위: P2):
- [ ] Bytecode 컴파일 활성화
- [ ] 민감한 문자열 식별 및 보호
- [ ] Obfuscation 추가 (optional)

---

## 🔴 Category 5: Security (CSP & CORS)

### Issue #5.1 - Content Security Policy 미설정 [CRITICAL]

**현재 상태**: ❌ Electron Security Warning 발생

**에러**:
```
Electron Security Warning (Insecure Content-Security-Policy)
This renderer process has either no Content Security Policy set 
or a policy with "unsafe-eval" enabled.
```

**영향**:
- XSS 공격에 취약
- Malicious script injection 가능
- Electron best practices 위반

**해결책** (우선순위: P0 - 즉시):

**방법 1: HTML Meta Tag** (빠른 적용)
```html
<!-- renderer/index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:;">
```

**방법 2: BrowserWindow webPreferences** (권장)
```typescript
// windowManager.ts
this.mainWindow = new BrowserWindow({
  webPreferences: {
    contentSecurityPolicy: 
      "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:;",
    // ...
  }
})
```

**방법 3: session.webRequest** (가장 안전)
```typescript
// main/index.ts
import { session } from 'electron';

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https:; " +
          "connect-src 'self' ws://localhost:5173;" // HMR용
        ]
      }
    });
  });
});
```

**CSP for Dev vs Production**:
```typescript
const isDev = !app.isPackaged;

const cspPolicy = isDev
  ? "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval'; " + // Vite HMR needs unsafe-eval
    "connect-src 'self' ws://localhost:5173 http://localhost:5173;"
  : "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline';";
```

**Action Items**:
- [ ] CSP 정책 정의 (dev/prod 분리)
- [ ] `session.webRequest.onHeadersReceived` 구현
- [ ] 테스트: 외부 스크립트 차단 확인

---

### Issue #5.2 - CORS 설정 불명확 [HIGH]

**현재 상태**: ⚠️ 외부 API 호출 시 문제 가능성

**Electron에서 CORS**:
- File protocol (`file://`)에서는 CORS 적용 안 됨
- 하지만 `http://localhost:5173` (dev server)에서는 CORS 영향

**해결책** (우선순위: P1):
```typescript
// main/index.ts
session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
  details.requestHeaders['Origin'] = 'electron://luie';
  callback({ requestHeaders: details.requestHeaders });
});

session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  if (details.responseHeaders) {
    details.responseHeaders['Access-Control-Allow-Origin'] = ['*'];
  }
  callback({ responseHeaders: details.responseHeaders });
});
```

**주의**: Production에서는 필요한 origin만 허용
```typescript
const allowedOrigins = ['https://api.yourservice.com'];
```

---

## 📊 Priority Matrix

| Priority | Issue | Blocking | ETA |
|----------|-------|----------|-----|
| **P0** | Prisma `--skip-seed` 제거 | ✅ 완료 | - |
| **P0** | Preview static server | ❌ Yes | 1일 |
| **P0** | CSP 설정 | ⚠️ Warning | 1일 |
| **P0** | electron-builder 설정 | ❌ Yes | 2일 |
| **P1** | Seed 전략 | ⚠️ Partial | 3일 |
| **P1** | 환경 구분 통일 | ⚠️ Partial | 2일 |
| **P1** | Quit 시 save 보장 | ⚠️ Data loss | 3일 |
| **P1** | Crash recovery | ⚠️ Data loss | 5일 |
| **P1** | CORS 설정 | ⚠️ API fail | 1일 |
| **P2** | 환경별 설정 파일 | - | 2일 |
| **P2** | Window state 복원 | - | 1일 |
| **P2** | Source code protection | - | 3일 |

---

## 🎯 Immediate Action Plan (이번 주)

### Day 1 (오늘)
- [x] ~~Prisma `--skip-seed` 제거~~ (완료)
- [x] `pnpm preview:prod` 스크립트 추가
- [x] CSP 기본 설정 추가

### Day 2
- [x] `electron-builder` 설정 및 로컬 빌드 테스트
- [x] 환경 구분 유틸리티 함수 생성 (`isTest`, `isDev`, `isProd`)
- [x] CORS 설정 추가

### Day 3-5
- [x] Seed 전략 구현 (dev/test/prod)
- [ ] Quit 시 save 보장 로직 강화
- [ ] 전체 환경 변수 정리 (`.env.*` 파일들)

### Day 6-7
- [ ] Crash recovery 구현
- [ ] Window state 복원
- [ ] 통합 테스트 (dev/preview/packaged)

---

## 📚 Reference Documentation

### Prisma
- [Prisma 7 Migration Guide](https://www.prisma.io/docs/ai/prompts/prisma-7)
- [Migrate Dev Command](https://www.prisma.io/docs/orm/reference/prisma-cli-reference)
- [Seeding](https://www.prisma.io/docs/orm/reference/prisma-config-reference)

### Electron
- [Security Best Practices](https://electronjs.org/docs/latest/tutorial/security)
- [App Lifecycle](https://www.electronjs.org/docs/latest/api/app)
- [isPackaged vs NODE_ENV](https://www.electronjs.org/docs/latest/api/app#appispackaged)

### electron-vite
- [Build Configuration](https://electron-vite.org/guide/build)
- [Preview Mode](https://electron-vite.org/guide)
- [Source Code Protection](https://electron-vite.org/guide/source-code-protection)

### CSP
- [Strict CSP Guide](https://web.dev/articles/strict-csp)
- [Electron CSP Examples](https://content-security-policy.com/examples/electron/)

---

## 🔍 Verification Checklist

완료 후 다음 항목들을 검증:

### Development
- [ ] `pnpm dev` 실행 시 DB 자동 migration
- [ ] Hot reload 정상 동작
- [ ] CSP warning 없음
- [ ] 콘솔 에러 없음

### Preview
- [ ] `pnpm preview:prod` 실행 가능
- [ ] Production DB 경로 사용 (`{userData}/luie.db`)
- [ ] Static files 정상 로드

### Packaged
- [ ] 로컬 빌드 성공 (`pnpm build:mac` / `build:win`)
- [ ] 패키지 앱 실행 시 DB 정상 생성
- [ ] 앱 종료 시 데이터 저장 확인
- [ ] 두 번째 인스턴스 실행 시 포커스 이동

### Security
- [ ] CSP 헤더 설정 확인 (DevTools Network 탭)
- [ ] 외부 스크립트 차단 확인
- [ ] CORS preflight 정상 처리

---

## 📝 Notes

- 이 문서는 **living document**로, 이슈 해결 시 상태 업데이트 필요
- 각 이슈 해결 후 해당 섹션에 **✅ 완료**, **📅 완료일** 표시
- 새로운 이슈 발견 시 적절한 카테고리에 추가
    
**Last Updated**: 2026-02-05 23:15 KST  
**Next Review**: 2026-02-06 (Day 2 진행 상황 확인)
