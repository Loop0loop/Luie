# GitHub Release Flow (Windows NSIS Web + Local mac Upload)

## 1) Windows 릴리즈 자동 업로드

태그(`v*`)를 push하면 GitHub Actions가 Windows `x64`/`arm64`를 순차 빌드하고,
`electron-builder --publish always`로 같은 GitHub Release에 자동 업로드합니다.

```bash
git tag v0.1.10
git push origin v0.1.10
```

- 워크플로우: `.github/workflows/release-windows.yml`
- 설치기: `nsis-web` (웹 설치기)
- 보조 산출물: `portable`
- 매트릭스 동시실행 제한: `strategy.max-parallel: 1`

## 2) 태그-버전 동기화 정책 (실무 안전장치)

Windows 릴리즈 워크플로우는 인라인 `node -e` 대신
`scripts/ci/sync-release-version-from-tag.mjs`를 사용합니다.

- 입력: `GITHUB_REF_NAME` 또는 `GITHUB_REF`
- 규칙: 태그는 반드시 `v` 접두사 + semver (`v0.1.10` 등)
- 동작: `package.json` 버전이 다르면 태그 버전으로 자동 동기화
- 실패 조건: 태그 누락/형식 오류

즉, `Tag version (...) and package.json version (...) must match.` 형태로
불필요하게 빌드를 중단하지 않고, 태그를 기준으로 릴리즈 버전을 일관되게 맞춥니다.

## 3) macOS 로컬 빌드 + Release 업로드

`build:mac`는 로컬에서 패키징 후 `v{package.json version}` 릴리즈를 생성/재사용하고,
`dist`의 `dmg + zip` 자산을 업로드합니다(동일 파일명은 교체 시도).

```bash
export GITHUB_TOKEN=ghp_xxx
pnpm build:mac
```

요구사항:
- `GITHUB_TOKEN` 필수
- `origin` remote가 GitHub 저장소를 가리켜야 함 (기본: `Loop0loop/Luie`)

## 4) macOS 패키징만 수행

업로드 없이 로컬 패키징만 필요하면 아래를 사용합니다.

```bash
pnpm build:mac:package
```

`build:mac:package`는 `ELECTRON_BUILDER_CACHE=.cache/electron-builder`를 기본 사용합니다.

## 5) 아이콘 생성

앱 아이콘은 `/Users/user/Luie/assets/public/luie.png`를 원본으로 생성합니다.

```bash
pnpm generate:icons
```

생성 경로:
- `build/icons/icon.png`
- `build/icons/icon.ico`
- `build/icons/icon.icns`

## 6) 참고 문서 (GitHub Actions 공식)

- Variables: [Store information in variables](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables)
- Contexts: [Contexts reference (`github.ref_name`)](https://docs.github.com/en/actions/learn-github-actions/contexts)
- Outputs: [Workflow commands (`GITHUB_OUTPUT`)](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions)
- Matrix 제어: [Workflow syntax (`jobs.<job_id>.strategy.max-parallel`)](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
