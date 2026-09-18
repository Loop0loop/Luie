---
name: ui-ux-pro-max
description: "색·타이포·레이아웃·상호작용·접근성의 구체적 대안을 로컬 디자인 카탈로그에서 검색할 때 사용한다."
---

# 디자인 카탈로그 검색

기존 Luie 화면 수정은 `DESIGN.md`와 실제 구현을 먼저 사용한다. 새 페이지라는 이유만으로 전체 디자인 시스템을 생성하지 않는다. 검색은 해결되지 않은 디자인 판단에만 사용한다.

저장소 루트에서:

```bash
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "keyboard focus modal" --domain ux
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "rerender subscription" --stack react
```

다른 cwd에서는 이 SKILL.md가 있는 디렉터리의 `scripts/search.py` 절대경로를 사용한다. 설치되지 않은 plugin 환경변수를 가정하지 않는다.

- 특정 문제는 한 가지 의도로 `--domain` 검색한다. Luie 구현은 `react`·`html-tailwind` 등 실제 stack을 선택한다.
- 제품 전체 시각 방향 설계가 요청된 경우에만 `--design-system`을 선택한다.
- 결과의 주제·플랫폼·기존 token과의 적합성을 확인한다. 무관하거나 비어 있으면 질의를 좁혀 재검색하고, 계속 근거가 없으면 그 한계를 설명한다.
- 검색 결과는 제안 자료다. 모바일 기본값·GSAP 코드·팔레트가 사용자 요청이나 Luie 디자인을 덮어쓰지 않는다.
- 출력 저장이 작업에 필요한 경우에만 `--persist --output-dir <project-root>`를 사용한다. 기존 MASTER/page를 읽고, `--force`는 사용자가 해당 덮어쓰기를 명시적으로 승인한 경우에만 사용한다. 검증하지 않은 결과나 민감정보를 저장하지 않는다.

필요한 상세 항목은 [quick-reference](references/quick-reference.md)에서 찾는다. [pro-rules](references/pro-rules.md)는 해당 플랫폼에 맞는 항목만 사용한다. 도구 옵션은 `scripts/search.py --help`로 확인하며, 단순 UI 수정에 자료 전체·카탈로그 검증 suite를 실행하지 않는다.
