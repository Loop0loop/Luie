# 프로젝트 Claude 스킬

공통 작업 지침은 루트 `CLAUDE.md`가 `AGENTS.md`를 가져와 공유한다. 필요한 스킬만 선택하고 각 SKILL의 조건부 참고 자료를 사용한다.

- 디자인 대안: `bencium-controlled-ux-designer`
- 공개 웹 콘텐츠: `bencium-aeo`
- UI 기준 검토: `web-design-guidelines`
- 그래프 활용: `debug-issue`, `explore-codebase`, `refactor-safely`, `review-changes`
- `ui-ux-pro-max`, Vercel 스킬은 `.agents/skills/` 원본으로 연결된다.

`skills.disabled/`는 비활성 자료다. 설치된 외부 plugin과 사용자 전역 스킬은 이 디렉터리의 프로젝트 스킬과 구분한다. 깨진 symlink는 사용 가능한 기능으로 가정하지 않는다.
