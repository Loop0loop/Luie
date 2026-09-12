# 프로젝트 에이전트 지침 감사

검토일: 2026-09-12. 작업 시작 시 존재한 사용자 변경 42개 파일은 SHA-256으로 보존을 확인했다. 앱 소스·package·테스트 코드는 수정하지 않았다.

## 범위와 근거

루트·소스·테스트·스크립트·corpus의 AGENTS, CLAUDE, 프로젝트 rules/workflows, 로컬 SKILL과 공통 실행 자료, GitHub 지침, DESIGN의 적용 기준을 확인·수정했다. AGNETS.md라는 별도 오타 파일은 발견되지 않았다.

프로젝트가 관리하는 활성 진입점과 그 실행 지침을 대상으로 했다. 외부 plugin 저장소·사용자 전역 skill·비활성 skill·과거 작업 인수인계·연구 자료를 현재 작업 정책으로 일괄 수정하지 않았다. 외부 참고 모음은 출처와 예시를 보존하고 Luie 적용 범위를 명시했다.

- [사용자가 제시한 X 원문](https://x.com/pvncher/status/2095991462416490862): 직접 조회가 403으로 실패했다. 원문을 읽었다고 주장하지 않는다.
- [GeekNews 요약](https://news.hada.io/topic?id=33404): 과도한 상시 지침, 모호한 승인 경계, 스킬의 범위·점진적 자료 로딩을 재검토하는 출발점으로 사용했다.
- [OpenAI 모델 지침](https://developers.openai.com/api/docs/guides/latest-model): 사용자 요청과 스킬 지침의 충돌, 작업 지속성과 비례적 검증 원칙을 대조했다. 특정 모델명·설정 변경은 하지 않았다.
- [Codex AGENTS](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [스킬 공식 문서](https://learn.chatgpt.com/docs/build-skills): 디렉터리별 적용, 짧고 구분되는 description과 조건부 참고 자료 구성을 적용했다.
- [Claude Code 공식 문서](https://code.claude.com/docs/en/memory): 루트 CLAUDE가 AGENTS를 import하도록 중복 정책을 합쳤다. imported 문서도 context를 차지하므로 전체 참고 문서를 import하지 않았다.
- [Electron 보안](https://www.electronjs.org/docs/latest/tutorial/security), [Tailwind theme](https://tailwindcss.com/docs/theme): 실제 preload 보안 경계와 CSS-first token 구성을 대조했다.

## 실제 코드와 대조한 결정

| 기존 지침의 문제 | 확인한 코드·문맥 | 변경 |
| --- | --- | --- |
| Electron 40·TS 5 및 생성 당시 branch/commit 고정 | [package.json](../../package.json) | 버전·명령의 기준을 package/lock으로 이동 |
| main이 services/core와 manager에만 있다고 안내 | [IPC 허브](../../src/main/handler/index.ts), [manuscript 진입점](../../src/main/domains/manuscript/index.ts), [infra DB](../../src/main/infra/database/index.ts) | domain/app/infra와 기존 구현·재노출을 구분 |
| 캔버스를 research의 예전 경로로 안내 | [GraphSurface](../../src/renderer/src/features/canvas/components/graph/GraphSurface.tsx) | canvas UI ↔ research world store ↔ workspace 상태 연결 명시 |
| backend는 FastAPI·SQLAlchemy, frontend는 Next/RSC·Jotai 강제 | [renderer 진입점](../../src/renderer/src/app/main.tsx), package, IPC 허브 | Electron·Drizzle·Zustand·기존 shared UI를 기준으로 수정 |
| 저장을 일반 비동기 API와 동일 취급 | [preload queue](../../src/preload/index.ts), [자동/수동 저장 handler](../../src/main/handler/writing/ipcAutoSaveHandlers.ts), [챕터 쓰기](../../src/main/services/core/chapter/chapterWriteOperations.ts) | 자동저장 접수와 flush/export 완료, 오래된 저장 재대기·실패 전파를 보존 |
| 시작·종료의 고유 계약 부족 | [appReady](../../src/main/lifecycle/app-ready/appReady.ts), [shutdown](../../src/main/lifecycle/shutdown/shutdown.ts) | readiness/deferred 시점, 저장·export 완료 및 종료 취소 유지 |
| 모든 로컬 테스트가 안전하다고 오해할 여지 | [Vitest setup](../../tests/setup.ts), [E2E helper](../../tests/e2e/_helpers/electronApp.ts) | worker별 임시 DB와 E2E의 환경 상속·override를 구분 |
| build:mac을 로컬 build처럼 제시 | package, [release-mac](../../scripts/release-mac.mjs) | GitHub 업로드 포함을 명시하고 운영/로컬 검증 구분 |
| 모든 편집마다 Codacy, bun typecheck, 전체 감사·고정 횟수 | [.agents rules](../../.agents/rules/oracle-gudie.md), package, 검사 스크립트 | 관련 검사 선택·실패 수정·완료 기준으로 교체 |
| 존재하지 않는 .agent/_shared·예제·메모리 도구 요구 | 로컬 skills/workflows 파일 목록 | 실제 경로와 선택적 자료로 교체 |
| 디자인마다 승인, Next/Phosphor/Sonner 설치 예시 | [DESIGN](../../DESIGN.md), [global.css](../../src/renderer/src/styles/global.css) | 기존 token·Lucide·Toast/Dialog 재사용, 미결정 제품 선택만 질문 |
| corpus의 PENDING 보고 표기를 JSON 상태로 혼동 | [review 결정](../../src/shared/validation/narrative-benchmark/review-decision.ts), [schema](../../src/shared/schemas/narrative-benchmark/world.ts), corpus README·human_review | 문서 상태와 enum 구분, 사람 검수·revision 경계 유지 |

코드 그래프의 architecture overview로 주요 영역을 찾은 뒤 현재 소스를 확인했다. 그래프의 누락이나 옛 경로가 있을 수 있으므로 전 파일·전 동작을 이해했다는 주장은 하지 않는다.

## 검증

- 수정된 SKILL 18개의 공식 quick_validate 검사 통과. 시스템 Python에는 PyYAML이 없어 기존 code-review-graph용 Python 3.12 환경으로 실행했다. 의존성 설치 없음.
- 감사 문서 추가 전 지침 66개 파일의 Markdown 로컬 링크 65개를 검사했다. 기존 Vercel 모음의 깨진 링크 3개를 수정한 후 누락 0건.
- 최종 감사 문서까지 포함한 67개 파일의 로컬 링크 84개에서 누락 0건을 확인했다.
- 참조한 package script 이름 19개가 현재 package에 존재함을 확인했다.
- 이번 지침 변경 범위의 `git diff --check` 통과. 전체 diff의 `package.json` EOF 공백 경고는 기존 변경이므로 보존했다.
- 기존 사용자 변경 42개 파일의 SHA-256 일치 확인.
- 문서만 바꿨으므로 앱 typecheck·build·Vitest/E2E·benchmark는 실행하지 않았다. runtime 정책 검사나 테스트 코드는 완화하지 않았다.

지침의 시나리오 일관성은 UI 소규모 변경, 여러 프로세스의 저장 오류 수정, 리뷰만 요청, 명시적 커밋, E2E 실행, corpus 다음 단계 생성으로 대조했다. 이는 문서 검토이며 새로운 세션의 모델 행동 실험은 아니다. 실제 작업 속도·토큰·정확도 개선은 아직 측정하지 않았다.

## 범위상 남겨 둔 항목

- `.github/instructions/codacy.instructions.md`도 작업공간에서 수정했지만 기존 .gitignore 대상이다. 공유 Git diff에는 포함되지 않으며 강제 stage하지 않았다.
- `.agents/claude-plugins-official/`, ignored vendor 저장소, `.claude/skills.disabled/`, 사용자 전역·plugin cache의 지침은 유지했다.
- 과거 인수인계·연구 문서와 외부 예시는 참고 자료로 보존했다. 최신 공식 사실이나 현재 구현의 증거로 자동 승격하지 않는다.
- `.claude/skills/cavecrew`, `caveman*`에 기존 깨진 symlink가 있다. 임의 설치·삭제·전역 연결은 하지 않았다.
- MCP·hook·모델·개인 CLI mapping 설정을 바꾸지 않았다. 기존 설정이 지침 파일을 다시 생성한다면 현재 diff와 대조해야 한다.
