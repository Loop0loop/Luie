# GitHub Release Flow (.exe + local .dmg)

## 1) Windows `.exe` 자동 업로드

태그를 push하면 GitHub Actions가 Windows 빌드를 수행하고 `.exe`를 Release에 업로드합니다.

```bash
git tag v0.1.0
git push origin v0.1.0
```

워크플로우: `.github/workflows/release-windows.yml`

참고: Windows workflow는 `electron-builder --publish never`로 빌드하고,  
다음 단계에서 `gh release upload`로 `.exe`만 업로드합니다.

## 2) macOS `.dmg` 로컬 빌드

로컬 macOS에서 빌드합니다.

```bash
pnpm build:mac
```

생성물은 보통 `dist/*.dmg`에 생성됩니다.

## 3) 로컬 `.dmg`를 Release에 첨부

`.dmg` 파일을 다운로드 가능한 URL로 올린 뒤, `release-upload-dmg` workflow를 수동 실행합니다.

입력값:
- `tag`: 대상 릴리스 태그 (`v0.1.0`)
- `dmg_url`: 로컬에서 빌드한 `.dmg`의 다운로드 URL
- `asset_name`: Release에서 보일 파일명 (`Luie-mac.dmg` 기본값)

워크플로우: `.github/workflows/release-upload-dmg.yml`

## 참고

Actions가 업로드를 담당하므로 GitHub Token은 기본 `github.token`만 사용합니다.
