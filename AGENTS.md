# Luie 작업 지침

한국어로 소통한다. 코드 식별자·명령·외부 규격명은 원문을 유지한다.

Luie는 Electron 기반 장편 집필 데스크톱 앱이다. React, TypeScript, Zustand, TipTap, Drizzle/SQLite를 사용한다. 버전과 실행 명령은 `package.json`, 의존성 해석은 `pnpm-lock.yaml`을 기준으로 한다. 패키지 매니저는 pnpm이다.

## 작업 범위와 완료

- 요청에 관련된 코드·호출자·계약·테스트를 확인한 뒤 수정한다. 기존 변경분을 보존하고, 요청 밖 리팩터링은 분리해 보고한다.
- 구현·수정 요청은 관련 로컬 수정, 검증, 이번 변경에서 생긴 실패 수정까지 진행할 권한을 포함한다. 기존 코드와 요청으로 결정할 수 있는 선택은 진행하고, 결과·데이터·권한이 달라지는 미해결 선택만 질문한다.
- 검토·진단·계획만 요청받으면 해당 결과를 제공한다. 구현 권한으로 커밋·푸시·배포·외부 메시지 전송·실사용 데이터 수정을 추론하지 않는다. 이미 명시된 권한은 다시 묻지 않는다.
- 완료 시 변경 결과와 실제 검증, 남은 실패·제약을 짧게 보고한다. 추가 수정·실패·미해결 위험이 없으면 통과한 검사를 반복하지 않는다.
- 사용자 요청이 로컬 스킬의 일반 지침보다 우선한다. 지침 때문에 멈춰야 한다면 정확한 파일·문구와 필요한 결정을 설명한다.

## 문맥 찾기

작업 대상 디렉터리의 하위 `AGENTS.md`를 적용한다. 아래 문서는 해당 영역에만 읽으며, 모든 작업에서 전체 문서·스킬·저장소를 읽는 절차는 두지 않는다.

| 변경 영역 | 시작점 |
| --- | --- |
| 시작·종료·창 | `src/main/index.ts`, `src/main/lifecycle/`, `src/main/app/` |
| IPC | `src/shared/contracts/`, `src/shared/ipc/`, `src/main/handler/`, `src/preload/api/` |
| 저장·복구·DB | `src/main/domains/manuscript/`, `src/main/domains/project/`, `src/main/domains/recovery/`, `src/main/database/` |
| AI·RAG | `src/main/utility/`, `src/main/infra/utility-process/`, `src/main/services/features/memory/` |
| UI·편집기·캔버스 | `src/renderer/src/features/`; 시각 변경은 `DESIGN.md`의 관련 절 |
| 테스트·품질 검사 | `tests/AGENTS.md`, `scripts/AGENTS.md`, `package.json` |
| 평가 corpus | `corpus/AGENTS.md`의 검수·revision 계약 |
| 주석 | `docs/conventions/comments.md` |

코드 그래프가 제공되고 관계 탐색에 도움이 되면 먼저 활용한다. `query_graph`로 호출 관계, `get_impact_radius`로 변경 영향, `detect_changes`로 diff 문맥을 찾을 수 있다. 그래프 미지원·오류·누락·오래된 결과는 범위를 좁힌 `rg`와 소스 읽기로 보완한다. 자동 갱신이나 검색 결과의 완전성을 가정하지 않는다. 변경 판단은 현재 소스로 확인한다.

## 유지할 경계

- renderer의 데스크톱 기능 접근은 preload API를 통한다. Node/Electron 직접 접근이나 main 내부 import를 추가하지 않는다.
- IPC 변경은 shared 채널·타입·스키마, main 등록·검증, preload 노출·응답 계약을 함께 맞춘다.
- 원고 저장, 복구, 종료 flush와 패키지 내보내기의 성공·실패 의미를 보존한다. 테스트 통과를 데이터 내구성의 증거로 과장하지 않는다.
- 비밀·토큰·원고 본문을 소스나 진단 출력에 노출하지 않는다. 테스트를 위해 검증·CSP·품질 게이트를 완화하지 않는다.
- 기존 구현·표준 기능·설치된 의존성을 먼저 활용한다. 스킬 예시의 프레임워크나 라이브러리를 프로젝트 기본값으로 도입하지 않는다.

## 검증 선택

- 문서·지침만 변경: 경로·명령·상호 모순과 diff를 확인한다. 제품 빌드·전체 테스트는 요구하지 않는다.
- TypeScript 동작 변경: `pnpm run typecheck`, 영향받는 Vitest와 관련 `check:*`를 선택한다. renderer UI 변경은 상호작용·접근성도 확인한다.
- 비DB 테스트: `SKIP_DB_TEST_SETUP=1 pnpm exec vitest run <test-path>`. 실제 DB 동작을 검증할 때는 이 플래그로 DB 준비를 생략하지 않는다.
- 여러 경계를 바꾸거나 릴리스 검증이 필요한 경우 `qa:core`, `lint-all`, 빌드·E2E로 넓힌다. 명령의 부작용은 `package.json`과 대상 스크립트에서 확인한다.
- `tests/setup.ts`는 worker별 임시 DB와 userData를 설정·정리한다. 개별 테스트·E2E·benchmark·운영 스크립트까지 자동으로 격리된다고 가정하지 않는다.
- `pnpm dev`는 앱을 실행한다. `pnpm run build:mac`은 패키징 후 GitHub 업로드도 수행하므로 단순 로컬 검증 명령으로 사용하지 않는다.
