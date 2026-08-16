# Platty 분석을 막은 GitHub skill 링크 오류

## 증상

`platty analyze --project q10gPtPtcSOfLe6giWNTX --json`가 분석 시작 전에
`.github/skills/backend-agent`를 찾지 못해 `UNEXPECTED_ERROR`로 종료됐다.

## 근본 원인

`.github/skills/*` 심볼릭 링크 9개가 존재하지 않는 `.agent/skills/*`를
가리켰다. 실제 공유 skill 디렉터리는 `.agents/skills/*`이다.

## 수정

모든 `.github/skills/*` 링크 대상을 `../../.agents/skills/<name>`으로
변경했다. `tests/scripts/githubSkillLinks.test.ts`에서 링크 종류, 대상 문자열,
최종 디렉터리 해석을 검증한다.

## 예방

skill 링크를 추가하거나 이름을 변경할 때 회귀 테스트를 실행해 링크 대상이
실제로 존재하는지 확인한다.

## 변경 파일

- `.github/skills/*` 심볼릭 링크 9개
- `tests/scripts/githubSkillLinks.test.ts`
- `.gemini/antigravity/brain/bugs/2026-07-21-platty-broken-github-skill-links.md`
