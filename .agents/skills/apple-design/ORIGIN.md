# 설치 기록 (Luie)

- 출처: https://github.com/dickwu/apple-design-skill
- 설치 시점 커밋: d0bac1e
- 설치 경로: `.kiro/skills/apple-design/` (Kiro) · `.agents/skills/apple-design/` (Codex)
- 가져온 것: `SKILL.md` · `README.md` · `references/` (53개 가이드 + `hig-lookup.md`). Codex 쪽에만 `AGENTS.md` 진입점을 추가로 둔다
- 가져오지 않은 것: `.cursorrules` · `.gitignore` (이 프로젝트 규약과 무관하고 루트 `.gitignore`와 충돌 위험)
- 실행 코드 없음. 전부 마크다운이다(`ui-ux-pro-max`가 Python 스크립트를 갖는 것과 다르다)

## 주의 — 라이선스가 불명확하다

원 저장소가 스스로 "The design guidelines are derived from Apple's publicly available HIG
documentation. Use at your own discretion"이라고만 적고 라이선스 파일을 두지 않았다. Apple HIG
파생 저작물이므로 **재배포 조건이 확인되지 않은 콘텐츠**다. 이 레포가 공개된다면 재검토가 필요하다.
`ui-styling` 스킬이 `LICENSE.txt`를 함께 두고 프론트매터에 `license: MIT`를 적은 것과 대조된다.

## Luie와 겹치는 부분

이 스킬은 Apple HIG 기반 **범용** 리뷰 규범이다. Luie는 이미 자체 규범을 갖고 있으므로
충돌하면 자체 규범이 우선한다.

| 주제 | Luie의 자체 출처 |
| --- | --- |
| 색·대비·테마 토큰 | `DESIGN.md`, `src/renderer/src/styles/global.tokens.css`, `ui-todo.md` §1~§4 |
| border/focus 규범 | `ui-todo.md` §4 (Radix Colors 6/7/8 · M3 outline · WCAG 2.4.11/2.4.13 근거) |
| 모션 | `global.animations.css` (200ms `cubic-bezier(0.2,0,0,1)`) |
| 회귀 방어 | `tests/renderer/styles/borderLadderContrast.test.ts` |

특히 **`references/hig/dark-mode.md`·`color.md`·`materials.md`를 Luie 팔레트 판단에 그대로
적용하면 안 된다.** Luie는 theme 3 × 색온도 3 = 9조합을 실측 기반으로 확정해 뒀고 그 근거가
`ui-todo.md`에 남아 있다.
