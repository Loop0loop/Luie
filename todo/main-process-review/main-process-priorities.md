# Main Process 검토 우선순위

## 목적

Luie Main Process의 현재 구조를 이해하고, 이후 작업에서 먼저 수정하거나 집중적으로 검증할 영역을 정리한다.

## 1. 최우선: 저장·종료·복구 흐름

프로젝트의 핵심 가치는 긴 원고의 데이터 손실 방지다. 다음 흐름을 끝까지 추적한다.

```text
Editor 입력
→ Preload autosave queue
→ IPC
→ chapterService
→ SQLite 저장
→ mirror 저장
→ snapshot 생성
→ 앱 종료 flush
```

검토 항목:

- 자동 저장 중 앱 종료 시 최신 입력이 보존되는가
- `before-quit`와 Renderer flush 사이에 경합이 없는가
- 동기화·Utility Process·파생 작업을 멈춘 뒤 종료하는가
- 종료 취소 후 자동 저장과 동기화가 재개되는가
- DB 저장 성공 및 mirror 저장 실패 상황에서 복구 가능한가
- `.luie` 패키지 쓰기 중 강제 종료되어도 패키지가 손상되지 않는가
- 동일 챕터 저장 순서가 뒤섞이지 않는가

현재 `tests/main/lifecycle/shutdownWiring.test.ts`의 종료 순서 테스트를 유지하고, 실제 파일 시스템과 DB까지 포함하는 복구 시나리오를 추가 검토한다.

## 2. 현재 작업: AI Side Panel

현재 AI 패널은 `MainLayout.tsx`와 `BinderSidebarPanelBody.tsx` 양쪽에 렌더링되고 있다.

수정 우선순위:

1. AI 패널의 단일 렌더링 위치를 결정한다.
2. 하드코딩된 회차·시놉시스·캐릭터·복선 데이터를 현재 챕터 데이터로 교체한다.
3. 기존 `contextPanel`을 삭제할지 유지할지 결정한다.
4. `analysis` 탭을 대체하는지, 별도 AI 탭을 추가하는지 결정한다.
5. i18n을 우회하는 문구를 정리한다.

UI를 더 확장하기 전에 기존 분석 화면과 AI 코파일럿의 책임을 분리한다.

## 3. IPC 경계

Renderer는 DB·파일 시스템·Node API에 직접 접근하지 않고 IPC를 통해 Main Process에 요청해야 한다.

검토 항목:

- 모든 채널이 `src/shared/ipc/channels.ts`에 등록되어 있는가
- Handler 입력에 Zod 검증이 적용되는가
- 파일 경로 입력이 허용 경로 안에서 검증되는가
- Main 전용 객체나 Node API가 Renderer에 노출되지 않는가
- IPC 응답 형식이 도메인별로 일관적인가
- 저장 로직이 여러 Handler에 중복되지 않는가

## 4. DB와 `.luie` 패키지 정합성

저장 계층이 DB, mirror, snapshot, `.luie` 패키지로 나뉘므로 최신 상태와 복구 우선순위를 명확히 한다.

검토 질문:

```text
DB가 최신인가?
mirror가 최신인가?
snapshot이 최신인가?
.luie 패키지가 최신인가?
```

특히 migration, 프로젝트 이동, snapshot 복원, 패키지 export 중단, orphan relation 정리를 확인한다.

## 5. 도메인 경계

`src/main/domains`는 외부에 공개할 서비스를 골라주는 얇은 Facade이고, 실제 구현은 `src/main/services/features`에 있다.

집중할 의존성:

- Manuscript가 Snapshot·World·Analysis 내부 구현을 과도하게 호출하는가
- Project가 Recovery와 Export 책임까지 과도하게 가지는가
- Analysis가 검색·메모리·LLM·RAG를 모두 떠안고 있는가
- Sync가 각 도메인의 DB 내부 구조를 직접 알고 있는가
- 순환 의존성을 피하기 위한 lazy import가 과도한가

실제 결합 문제가 확인될 때만 구조를 분리한다. 선제적인 대규모 리팩터링은 하지 않는다.

## 6. Utility Process와 AI 안정성

AI·임베딩·RAG 실행은 Utility Process와 Sidecar에 의존하므로 실패와 종료 순서를 검증한다.

검토 항목:

- Utility Process 사망 후 복구되는가
- `shutdown → ack → process 종료` 순서가 보장되는가
- 분석 요청 중복·취소가 안전한가
- API 키가 Renderer 로그나 IPC 오류에 노출되지 않는가
- 긴 분석 중 앱 종료가 무한 대기하지 않는가
- 로컬 모델과 외부 API fallback이 실제로 작동하는가

## 당장 하지 않을 것

- `packageManager` 버전 한 줄 변경 검토
- `main/index.ts` 마지막 newline 정리
- 새 공통 추상화나 factory 추가
- 데이터 흐름이 정해지기 전 AI 패널 전용 전역 상태 추가

## 작업 순서

1. 저장·종료·복구 실행 순서 추적
2. 종료 및 복구 테스트 보강
3. AI Side Panel 단일 진입점과 데이터 계약 정리
4. IPC 검증 및 보안 경계 점검
5. DB·패키지 정합성 검증
6. Utility Process와 AI 실패 시나리오 검증
