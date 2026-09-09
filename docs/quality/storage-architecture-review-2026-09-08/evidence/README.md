# 저장 아키텍처 감사 증빙

2026-09-08의 실제 source/native SQLite/임시 파일 관측을 보관한다. 제품 수정 결과가 아니다. 사용자 앱·데이터를 사용하지 않았으며, 모든 실행은 설치된 의존성으로 임시 fixture를 만든다.

## 실행

저장소 루트 `/Users/user/Luie`에서 실행한다. package 스크립트는 이 checkout 경로를 사용한다. 다른 checkout에서 실행하려면 각 스크립트의 `repo` 경로를 맞춘다. Node용 native module이 이미 호환되는 환경에서 실행하며 이 문서의 명령은 설치/rebuild하지 않는다.

```sh
NODE_PATH="$PWD/node_modules" node docs/quality/storage-architecture-review-2026-09-08/evidence/package-cost-repro.cjs
NODE_PATH="$PWD/node_modules" node docs/quality/storage-architecture-review-2026-09-08/evidence/package-atomicity-repro.cjs
NODE_PATH="$PWD/node_modules" node docs/quality/storage-architecture-review-2026-09-08/evidence/package-size-limit-repro.cjs
SKIP_DB_TEST_SETUP=0 node node_modules/vitest/vitest.mjs run --config docs/quality/storage-architecture-review-2026-09-08/evidence/probe.config.mjs
```

결과는 스크립트에 명시된 `/private/tmp/luie-...json`에 기록된다. 여기에 보관된 JSON은 감사 시점의 결과이며 재실행으로 덮어쓰지 않는다. DB service probe는 기존 `tests/setup.ts`를 사용해 `drizzle/.tmp/vitest-*` DB·cache·userData를 격리하고 종료 후 정리한다. 앱을 기동하지 않는다.

## 파일 의미

| 파일 | 확인 범위 |
|---|---|
| package-cost-repro.cjs / package-cost-results.json | 실제 writer + 이미 생성한 합성 payload, 전체/단건의 3회 median·논리 entry bytes. main DB collector·커널 실제 I/O 제외 |
| package-atomicity-repro.cjs / package-atomicity-results.json | 후속 SQL 실패 trigger로 단건 writer의 부분 commit 관측 |
| package-size-limit-repro.cjs / package-size-limit-results.json | 5MiB+1 entry의 저장 성공 / 같은 reader 거부 |
| stale-open-current-behavior.probe.ts / stale-open-observation.json | 실제 DB·file·서비스, export 예약만 보류하여 미반영 B가 explicit open 때 A로 되돌아가는 관측 |
| db-loss-current-api.probe.ts / db-loss-results.json | 기존 DB-loss 테스트를 현재 단건 본문 조회 API에 맞춘 독립 검사. checkpoint 후 DB 삭제·재import·원고/snapshot 본문 복원 |
| existing-real-tests.json | 기존 DB/FS 검사 3개 결과. DB-loss의 구 목록 DTO assertion 실패 포함 |

**주의:** stale-open, 원자성, 크기 제한 probe는 결함이 나타남을 assert한다. 실행 성공을 저장 안전성 통과로 해석하면 안 된다. 제품 수정 후 회귀검사에서는 정상 보존·전부 rollback·read/write 허용범위 일치를 기대하도록 바꾸어야 한다.

일반 테스트 runner에 결함 관측 코드를 자동 편입하지 않도록 `.test.ts`가 아닌 `.probe.ts`와 별도 config를 사용한다. 원본 임시 probe를 보관하면서 src import만 현재 문서 위치 기준 상대 경로로 바꿨다. 성능 결과는 macOS arm64 Node 환경의 관측이며 Windows/Linux 또는 Electron UI 속도를 인증하지 않는다.
