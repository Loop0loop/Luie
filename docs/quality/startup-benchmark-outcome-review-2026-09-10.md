# 시작 벤치마크 판정 오류 수정 — 사용자 검증용 기록

상태: **수정 및 제한된 자동 테스트 실행 결과 제출. 최종 수용 판단은 사용자 검토 대기.**

기준 커밋: `02e9e08f1675127ea1e092b0be03335a7ad5da31`. 실행 환경: 현재 macOS 개발 환경, 설치된 Node/Vitest 사용. 실제 Electron 창은 이번에 실행하지 않았다. 기존 P0/P1의 통과 보고·성능 표본은 이 수정의 승인 근거로 사용하지 않으며, 과거 이력으로만 보존한다. 이번 통과 개수 역시 앱 안정성 또는 성능 보장이 아니다.

## 1. 확인된 결함과 수정 범위

`scripts/benchmark-startup.mjs`의 `deadline()`은 `Promise.race`로 대기 시간을 제한하지만 전달받은 비동기 작업을 취소하지 않는다. 기존 구현은 그 내부에서 `run.status = "passed"`와 `run.phase = "complete"`를 기록했다.

따라서 `timeout → catch에서 오류 기록 → 앱 정리 대기 → 늦은 screenshot 완료` 순서에서 실패가 성공으로 바뀌었다. 오류 문자열이 있어도 summary의 실패 수가 0이고 `process.exitCode`도 실패로 설정되지 않을 수 있었다.

수정:

- 두 성공 기록을 `await deadline(...)`이 정상 반환한 뒤로 이동했다. timeout/reject 경로는 해당 코드에 도달하지 않는다.
- 기존 실행 함수를 `export`해 테스트가 CLI와 같은 `main()`을 직접 호출한다. 판정 로직을 테스트에 복사하지 않았다.
- 기존 `qa:core` 선택 목록에 실행기 테스트와 기존 계약 테스트를 포함했다. 전체 `qa:core` 통과를 의미하지 않는다.
- 제품 `src/`, Electron 애니메이션, IPC, 의존성은 변경하지 않았다.

## 2. 테스트가 실제로 실행하는 것과 대체하는 것

파일: `tests/scripts/startupBenchmarkExecution.test.ts`.

**실행하는 실제 코드:** 옵션 해석, 실행 반복, `deadline`, try/catch/finally, 성공/실패 상태 변경, JSON 직렬화, summary 집계, 종료 코드 설정, 종료 실패 시 반복 중단.

**대체한 경계:** Playwright/Electron launch·page·screenshot·close·kill, 파일 읽기/쓰기, git 명령. 파일 기록 호출에 전달된 JSON 문자열을 다시 파싱해 검사한다. 테스트에서 가짜 증거 경로에 실제 파일을 쓰거나 실제 프로세스를 종료하지 않는다. renderer/main의 `evaluate` callback 본문은 실행하지 않고 테스트 응답을 돌려준다.

`setTimeout`/`clearTimeout`만 가짜 시간으로 제어한다. screenshot과 close는 독립된 수동 Promise다. 실제 screenshot 속도, OS 타이머 정확도, CPU 시간, Electron close 동작을 흉내 낸다는 뜻이 아니다. `performance.now()`로 나온 시간값을 성능 비교에 사용하지 않는다.

실행 함수가 `process.argv`, `process.exitCode`, 오류 이벤트 구독을 사용하므로 테스트 종료 시 원래 argv/exitCode/listener 및 타이머/spy를 복원한다. 미처리 rejection을 무시하도록 설정하지 않았다. timeout 뒤 reject 사례에서 이번 실행의 Vitest 미처리 오류 보고는 없었다.

## 3. 사전에 정한 기대값

ISTQB 관점의 경계값·동등 분할·상태 전이·실패 주입을 적용했다. 이는 인증 주장이 아니다.

| 사례 | 제어한 순서 | 검사하는 기대값 |
| --- | --- | --- |
| OUTCOME-01 | 제한 1000ms, 999ms에 screenshot resolve, close resolve | passed/complete, 오류 없음, 성공 1·실패 0, 종료 코드 설정값 0, kill 없음, timer 0 |
| OUTCOME-02 resolve | 1000ms timeout 처리 확인, 1001ms screenshot resolve, 그 뒤 close resolve | failed/snapshot, 원래 timeout 오류 보존, 성공 0·실패 1, 성공 median/p95 null, 종료 코드 설정값 1, timer 0 |
| OUTCOME-02 reject | 위 순서에서 screenshot reject | 동일 실패 판정, 늦은 오류가 원래 timeout 오류를 대체하지 않음 |
| OUTCOME-03 | timeout 전 screenshot reject, close resolve | screenshot 오류 보존, 실패 집계, 종료 코드 설정값 1, timer 0 |
| OUTCOME-04 | launch Promise reject | launch 단계 오류·실패 표본 보존, close/kill 미요청, 종료 코드 설정값 1 |
| OUTCOME-05 | 2회 요청, 첫 관찰 완료 후 close reject | 첫 실행 실패 처리, SIGKILL 요청 1회, 두 번째 launch 없음, 종료 코드 설정값 1 |

OUTCOME-02의 1000ms는 **먼저 timeout 처리가 일어난 것을 확인한 시점**이다. 두 Promise가 정확히 동시에 끝났을 때의 OS 순서를 보장하는 테스트가 아니다. 종료 코드도 실제 CLI 자식 프로세스의 exit 이벤트가 아니라 `process.exitCode` 설정값을 검사한다. SIGKILL 검사는 호출 의도만 확인한다.

## 4. 실제 실행 결과 — 기존 결과와 구분

### 수정 전 결함 재현

실행 함수에 `export`만 추가하고 기존 판정 위치는 그대로 둔 상태에서 신규 6개를 실행했다.

```text
Test Files: 1 failed
Tests: 1 failed | 5 passed (6)
실패: OUTCOME-02 resolve
기대: status=failed, phase=snapshot
실제: status=passed, phase=complete
error: Error: Timeout after 1000ms
```

이 실패를 확인한 뒤 성공 판정 두 줄을 이동했다. 실패하는 assertion을 삭제하거나 기대값을 성공에 맞추지 않았다.

### 수정 후 관찰

```sh
SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run tests/scripts/startupBenchmarkExecution.test.ts tests/scripts/startupBenchmark.test.ts
node_modules/.bin/eslint scripts/benchmark-startup.mjs tests/scripts/startupBenchmarkExecution.test.ts
node --check scripts/benchmark-startup.mjs
git diff --check
```

- 신규 6개 + 기존 CLI/통계/프로필 계약 14개: **2파일 20개 통과**, 명령 종료 코드 0.
- 변경 script/신규 test ESLint 및 script 구문 검사: 종료 코드 0.
- 위 결과는 이 실행에서의 자동 검사 관찰이다. 과거 78개 결과를 재사용해 이번 수정까지 검증했다고 표시하지 않는다.
- pnpm을 통한 의존성 설치/rebuild 없이 설치된 바이너리를 직접 호출했다.

## 5. 아직 검증하지 않았거나 해결하지 않은 것

- **진행 중 I/O의 즉시 취소:** 이번 변경은 취소 기능을 추가하지 않았다. timeout 뒤 작업이 잠시 계속될 수 있고, 다른 단계의 부분 관찰값/phase가 늦게 갱신되는 문제까지 검증하지 않았다. 이 수정이 보장하려는 범위는 늦은 내부 완료가 성공 판정을 쓰지 못하게 하는 것이다.
- **실제 프로세스 정리:** 기존 app.exit/close/SIGKILL 동작을 유지했다. 프로세스 트리 잔존, kill 실패, main evaluate가 멈춘 경우, 정상 저장/flush는 검증하지 않았다. fake timer 0개는 실제 OS 프로세스가 없다는 뜻이 아니다.
- **실제 CLI 종료·보고서 디스크 기록:** 이번 신규 테스트는 main 직접 호출 및 파일 경계 mock이다. SIGKILL, 디스크 용량 부족, 쓰기 실패, uncaughtExceptionMonitor 경로는 검사하지 않았다.
- **resize 시나리오:** 신규 실행기 테스트는 기본 intro 시나리오만 실행한다. 실제 DOM·opacity·MutationObserver·resize 경계는 이번 통과에 포함되지 않는다.
- **제품 검증:** Windows/macOS GUI, CPU/GPU/memory/GC, IME·원고 저장, 전체 QA/build/typecheck는 이번에 실행하지 않았다. 기존 실패들을 해결한 것으로 간주하지 않는다.
- **과거 표본:** 오류가 확인된 실행기의 기존 수치는 삭제하지 않지만 재측정/사용자 검토 전 성능 결론에 사용하지 않는다.

## 6. 사용자 확인 순서

1. 스크립트 diff에서 성공 판정이 deadline 내부에 남아 있지 않은지 확인한다.
2. 신규 테스트에서 screenshot과 close가 별개 Promise이고, timeout 후에도 close를 열어 둔 채 screenshot을 완료시키는지 확인한다. 이 순서가 없으면 원래 경합을 재현하지 못한다.
3. 위 명령으로 직접 실행하고, 기대값·mock 범위가 원하는 계약에 맞는지 판단한다.
4. 실제 Electron/Windows 검사와 잔여 프로세스 확인은 별도 검증으로 판단한다. 실제 앱 종료 코드는 Vitest 종료 코드와 구분한다.

QA 스킬은 재현·상태 전이와 검증 한계 기록에, Ponytail은 기존 도구 재사용과 판정 위치만 바꾸는 데 적용했다. graph MCP는 먼저 조회했으나 `tests_for(main)`이 무관한 DB 테스트를 반환해 실제 호출부/테스트 소스로 보완했다. QA 스킬의 examples/self-check 등 일부 참조 파일은 저장소에 없어 읽을 수 있는 실행 지침·체크리스트와 명시한 기대값으로 보완했다. 추가 성능 엔진이나 새로운 테스트 프레임워크는 넣지 않았다.
