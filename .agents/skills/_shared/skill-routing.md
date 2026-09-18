# 로컬 스킬 선택

키워드 개수보다 작업 목적과 코드 경계로 고른다. 모든 작업에 PM → 구현 → QA agent를 생성하지 않는다.

| 필요 | 후보 |
| --- | --- |
| main·IPC·DB·저장 구현 | backend-agent |
| renderer·Zustand·상호작용 구현 | frontend-agent |
| 증상에서 원인 조사·수정 | debug-agent |
| 지정 범위의 품질 감사 | qa-agent 또는 senior-code-reviewer |
| 데스크톱 UX/HIG 검토 | apple-design |
| 기존 token/CSS 구현 | ui-styling |
| 구체적인 디자인 대안 검색 | ui-ux-pro-max |
| React 성능·구성 문제 | 관련 vercel 스킬 |
| 명시적 Git 커밋 | commit |

같은 목적의 스킬을 모두 로드하지 않는다. 스킬은 지침이며 반드시 별도 agent를 의미하지 않는다. 위임은 사용자 요청·현재 환경의 권한과 실제 독립 작업 여부에 따라 결정한다.
