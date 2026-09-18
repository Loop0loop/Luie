# Electron DB 실환경 검증 보고서

## 판정

**PASS — 현재 source의 로컬 macOS Electron production bundle 범위**

검증 기준은 `a693ecdc5e5df4401447926d34c01806fd0853d5`다. 테스트 DB, Electron `userData`, `.luie`는 모두 `tests/.tmp` 아래에 격리했고 sync를 비활성화했다. 사용자 DB와 사용자 프로젝트 파일은 사용하지 않았다.

이 결과는 설치·서명된 packaged app, Windows/Linux, 실제 embedding model, 저속·외장 볼륨, 전원 차단을 검증한 결과가 아니다.

## 환경과 실행

| 항목 | 값 |
| --- | --- |
| 실행일 | 2026-09-18 KST |
| 환경 | macOS arm64, Electron 44.2.0, Electron Node 24.20.0 |
| 저장 지연 source hash | `35f76bfb6b389d7710dbc0c152cc4f568da61a651755684847840c62e465c90f` |
| 대규모 시나리오 | 300 chapters × 5,000 chars, 600 burst writes |
| 실제 단축키 시나리오 | run당 warm-up 30회 + `Cmd+S` 200회, 총 3 runs |

```sh
pnpm run bench:writing-loop:fullprod
pnpm run certify:save-latency:e2e
pnpm exec playwright test --project=e2e tests/e2e/packageDurability.phase6.spec.ts
```

## 결과

### 사용자 규모 writing loop

| 지표 | 결과 |
| --- | ---: |
| project/chapter 생성 | 1,477.761 ms |
| 600 burst writes | 10,656.547 ms |
| `chapter.update` 900회 p50 / p95 / p99 / max | 8.795 / 24.635 / 62.332 / 89.489 ms |
| manual save | 75.842 ms |
| derived queue drain | 36,534.613 ms |
| 저장·queue 실패 | 0 |
| main event-loop mean / p95 / p99 / max | 22.134 / 27.705 / 47.809 / 89.457 ms |
| main RSS | 244,629,504 bytes |
| main DB + WAL | 57,949,464 bytes |
| cache DB + WAL | 78,084,480 bytes |
| `.luie` package | 5,025,792 bytes |
| 전체 측정 저장량 | 141,059,736 bytes |

search, memory, summary, embedding queue는 종료 시 pending/running/failed가 모두 0이었다. summary completed는 1,200건이다. embedding은 모델이 준비되지 않아 626건이 skipped됐고 1,800 chunk가 unembedded 상태이므로 실제 모델 처리 성능 근거로 사용하지 않는다.

이 시나리오의 save latency는 renderer 입력이나 `Cmd+S`가 아니라 preload를 통한 `chapter.update` API 왕복이다. 실제 단축키 지연은 아래 별도 인증 결과를 따른다.

### 실제 `Cmd+S` 저장 지연

각 run은 30회 warm-up 뒤 200개 순차 표본을 수집했다. 모든 표본의 autosave와 manual save가 성공했고, 각 run 종료 후 DB와 `.luie`에서 재조회한 본문이 최종 표본과 일치했다.

| Run | p50 | p95 | p99 | max | p95 95% CI | 실패 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 10.3 ms | 15.8 ms | 19.1 ms | 23.0 ms | 14.4–16.7 ms | 0/200 |
| 2 | 11.6 ms | 18.1 ms | 29.4 ms | 40.8 ms | 15.8–19.9 ms | 0/200 |
| 3 | 10.6 ms | 14.8 ms | 16.4 ms | 18.9 ms | 14.3–15.3 ms | 0/200 |

### 강제 종료와 재시작

`packageDurability.phase6.spec.ts`의 2개 테스트가 11.3초에 통과했다.

- 손상된 `.luie`를 열면 recovery banner가 표시된다.
- package 교체 중 Electron을 `SIGKILL`해도 이전 package가 온전하게 남는다.
- 같은 DB와 `userData`로 Electron을 다시 실행한 뒤 manual save가 원래 chapter와 중단 시점 chapter를 모두 package에 기록한다.

## 남은 범위

- 현재 검증은 `electron.launch({ args: [projectRoot] })`로 production bundle을 실행했다. 설치·서명된 `.app`과 packaged resources/migration은 별도 release 검증이 필요하다.
- commit 내부의 정확한 instruction 시점, OS 전원 차단, Windows/Linux, 저속·외장 볼륨은 미검증이다.
- 실제 embedding model이 준비된 상태의 처리량·비용·event-loop 영향은 미검증이다.
- 대규모 writing loop는 단일 run이다. 장기 분포나 저사양 SLA를 확정하려면 반복 실행과 허용 기준이 필요하다.
