# React 성능 자료

Vercel 원본 성능 규칙의 로컬 참고 자료다. Luie 적용 범위와 선택 기준은 [SKILL.md](SKILL.md)에 있다.

개별 규칙은 `rules/`, 전체 모음은 `AGENTS.md`에 있다. 현재 병목에 관련된 규칙만 참고하며 Next.js/RSC/server 예시는 Electron renderer에 적용하지 않는다.

이 로컬 복사본에는 원본의 규칙 생성 package가 포함됐다고 가정하지 않는다. Luie 루트의 `pnpm build`는 앱 빌드이므로 규칙 문서 재생성 명령으로 실행하지 않는다. 자료를 수정할 때 관련 예시·참조를 대조하고 원본 license·attribution을 유지한다.
