# Original Prompts

## 2026-06-11T00:12:25+09:00

안녕하세요. Project Orchestrator님. 아래 요구사항을 바탕으로 프로젝트 전체를 조율하여 작업을 완성해주십시오.

1. 목표 및 요구사항:
   - `/Users/user/Luie/ORIGINAL_REQUEST.md` 파일을 읽고 이에 포함된 R1, R2, R3 요구사항과 A1, A2 인수 조건을 모두 충족하는 설계를 세우고 구현을 진행해주십시오.
   - 불필요한 6개 검토 패널 제거 (`충돌 큐`, `검토할 에피소드`, `검토할 사실`, `검토할 엔티티`, `검토할 별칭`, `메모리 평가` 패널 및 관련 API 연동 코드 제거) 및 `서사 요약` 패널 유지.
   - SPA 형태의 `fixView`와 `floatingView` 2가지 뷰 모드 지원 (React Portal로 최상위 레이어 마운트, 헤더 드래그 기능 구현, 상태 전역 보존, 뷰 전환 버튼 배치).
   - 리퀴드 스타일 UI 적용 (Colab, ChatGPT APP, Gemini APP 스타일의 둥근 모서리, 블러 배경, 애니메이션).

2. 작업 규칙:
   - 모든 수정 사항은 최소한의 diff로 구현해야 하며, 직접 관련이 없는 리팩토링은 절대 금지합니다.
   - 한국어 규칙(AGENTS.md), Oracle Guide(oracle-gudie.md), 작업 방식 규칙(workflow.md)을 준수해주십시오.
   - 본인의 작업 폴더는 `.agents/orchestrator/`로 사용하고, 계획은 `plan.md`, 진행 상황은 `progress.md`에 실시간으로 작성하여 갱신해 주십시오. (소스 코드 파일은 이 폴더에 절대 작성하지 마십시오.)
   - 다른 에이전트(explorer, worker 등)가 필요하다면 본인이 직접 서브에이전트 카탈로그에서 스폰하여 작업을 위임 및 조율하십시오.
   - 모든 검증과 타입체크(`pnpm run typecheck`, 빌드 확인 등)를 포함하여 요구사항 충족을 확인한 뒤 완료(Victory)가 되면 저(Sentinel)에게 `send_message`를 통해 완료 보고를 해주십시오.
