---
name: commit
description: "사용자가 Git 커밋을 요청했을 때 지정한 변경을 Conventional Commits 형식으로 커밋한다."
---

# 커밋

사용자의 커밋 요청은 그 범위의 staging·commit 권한이다. 같은 권한을 다시 묻지 않는다. 구현·파일 저장만 요청받은 경우에는 커밋 권한으로 해석하지 않는다.

`git status`, 대상 diff와 staged diff, 최근 메시지를 확인한다. 기존 staged 변경과 이번 작업을 구분하고, 요청된 파일만 명시적으로 stage한다. 섞인 hunk 때문에 요청 밖 변경을 함께 커밋해야 한다면 범위를 먼저 해결한다.

형식은 `<type>(<scope>): <description>`이며 scope는 필요할 때 쓴다. type은 동작 기준으로 feat/fix/refactor/docs/test/chore/perf/style에서 선택한다. 단순히 새 파일이라는 이유로 feat를 쓰지 않는다. 메시지는 한국어 프로젝트 관례를 따르고 고정된 외부인의 co-author를 추가하지 않는다.

커밋 전 관련 검증 상태와 비밀 포함 여부를 확인한다. 무관한 변경을 분리하되 같은 작업을 파일 개수만으로 쪼개지 않는다. 완료 후 commit hash와 요약을 보고한다. push·amend·이력 재작성은 별도 요청 범위를 따른다.
