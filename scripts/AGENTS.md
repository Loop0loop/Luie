# 스크립트와 품질 게이트

명령 연결은 `package.json`을 확인한다. `check:*`의 실패 조건은 저장소 정책이므로 이번 변경을 통과시키려고 완화하거나 우회하지 않는다.

| 변경 영역 | 관련 검사 |
| --- | --- |
| IPC·preload | `check:ipc-contract-map`, `check:ipc-handler-schemas`, `check:preload-contract-regression` |
| 보안·프로세스 | `check:no-escape-hatches`, `check:security-profile`, `check:utility-process-boundary` |
| store·persist | `check:renderer-store-usage`, `check:persist-contracts` |
| 의존성 | `check:deps`, `check:version-pins` |
| 빌드·복잡도·스타일 | `check:build-warning-regression`, `check:core-complexity`, `check:source-loc`, `check:design-tokens` |

검사 코드 변경은 대응 `tests/scripts/`에서 정상·위반 입력을 확인한다. 검사 스크립트는 가능한 한 결정적 입력·출력과 좁은 파일 범위를 유지한다.

`qa:core`는 빌드 검사·DB benchmark까지 포함하는 넓은 검증이다. 문서나 작은 수정마다 실행하지 않으며, 여러 경계 변경·릴리스 검증에서는 관련 범위를 확인해 사용한다.

## 운영 명령

- `release-mac.mjs`는 GitHub release와 asset을 변경한다. `pnpm run build:mac`이 이 스크립트를 호출한다.
- 로컬 mac 패키지는 `build:mac:arm64` 등 `--publish never` 경로를 확인한다. 서명·공증이나 빌드 hook 부작용도 별도로 확인한다.
- `memory:*`, Supabase deploy/secret, 데이터 재생성·복구 명령은 이름만으로 안전한 검사라고 판단하지 않는다. 대상 DB·파일·외부 서비스와 변경 여부를 읽고 요청 범위에 맞춰 실행한다.
- 릴리스 변경은 `.github/workflows/release-windows.yml`, `release-macos.yml`, `electron-builder.json`과 함께 검증한다.
