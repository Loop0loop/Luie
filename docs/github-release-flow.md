# GitHub Release Flow (Windows NSIS Web + Local mac Upload)

## 1) Windows 릴리즈 자동 업로드

태그를 push하면 GitHub Actions가 Windows `x64`/`arm64`를 각각 빌드하고,
`electron-builder --publish always`로 Release(`v*`)에 자동 업로드합니다.

```bash
git tag v0.1.0
git push origin v0.1.0
```

- 워크플로우: `.github/workflows/release-windows.yml`
- 설치기: `nsis-web` (웹 설치기)
- 보조 산출물: `portable`

## 2) macOS 로컬 빌드 + Release 업로드

`build:mac`는 로컬에서 패키징 후 `v{package.json version}` 릴리즈를 생성/재사용하고,
`dist`의 `dmg + zip` 자산을 업로드(동일 파일명은 교체)합니다.

```bash
export GITHUB_TOKEN=ghp_xxx
pnpm build:mac
```

요구사항:
- `GITHUB_TOKEN` 필수
- `origin` remote가 GitHub 저장소를 가리켜야 함 (기본: `Loop0loop/Luie`)

## 3) macOS 패키징만 수행

업로드 없이 로컬 패키징만 필요하면 아래를 사용합니다.

```bash
pnpm build:mac:package
```

`build:mac:package`는 `ELECTRON_BUILDER_CACHE=.cache/electron-builder`를 기본 사용합니다.

## 4) 아이콘 생성

앱 아이콘은 `/Users/user/Luie/assets/public/luie.png`를 원본으로 생성합니다.

```bash
pnpm generate:icons
```

생성 경로:
- `build/icons/icon.png`
- `build/icons/icon.ico`
- `build/icons/icon.icns`
