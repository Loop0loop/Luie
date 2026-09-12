# 여러 renderer 계층을 바꿀 때

현재 화면과 인접 패턴에서 component → hook/store → preload 흐름을 확인한다. project/chapter 전환·pending 작업·persist 소비자를 함께 본다.

기존 UI·토큰·Zustand action을 활용해 요청된 동작을 구현한다. 구조가 필요한 경우 기존 feature 안에서 역할을 나눈다. 기술 선택이나 참조 문서 수를 형식적으로 늘리지 않는다.

변경한 상호작용·오류/저장 상태·키보드 흐름을 검증한다. 시각 변경은 관련 테마·창/패널 크기로 확인한다. 관련 테스트·정책 검사 통과 후 새 근거 없이 전체 검증을 반복하지 않는다.
