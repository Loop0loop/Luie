# Implementation Plan

## Phase 1: Investigation & Analysis
- [x] 1. Explorer를 스폰하여 AnalysisSection의 레이아웃 구조, 제거해야 할 6개 패널 (`충돌 큐`, `검토할 에피소드`, `검토할 사실`, `검토할 엔티티`, `검토할 별칭`, `메모리 평가` 패널) 관련 파일들 및 API 호출 훅을 파악한다.
- [x] 2. `analysisStore` 혹은 기존 UI 스토어 상태 관리 파일의 위치를 찾는다.
- [x] 3. SPA fixView / floatingView 2가지 뷰 모드를 지원하기 위한 전역 상태 스토어 확장 설계를 검토한다.
- [x] 4. React Portal로 최상위 레이어 마운트할 대상 엘리먼트(예: `#root` 혹은 `body`) 및 드래그, 애니메이션 적용 방안(Framer Motion 등 프로젝트 내 설치된 라이브러리 사용 여부 확인)을 탐색한다.

## Phase 2: Design (PROJECT.md)
- [x] 1. AnalysisSection 및 관련 6개 패널 파일들을 제거하고 `서사 요약` 패널만 유지하는 설계 작성.
- [x] 2. `fixView`와 `floatingView` 뷰 모드 전환 및 미니 대화창 마운트(React Portal), 마우스 헤더 드래그 기능 설계.
- [x] 3. 리퀴드 스타일 UI 적용 방식(블러, 둥근 모서리, 애니메이션) 설계.
- [x] 4. PROJECT.md 생성하여 Architecture, Milestones, Interface Contracts, Code Layout을 정리.

## Phase 3: E2E Test Suite & Test Setup
- [x] 1. E2E Testing Track을 설계하여 Tiers 1-4에 부합하는 테스트 계획(TEST_INFRA.md, TEST_READY.md)을 구성.

## Phase 4: Implementation
- [x] 1. 패널 삭제 및 API 훅 연동 제거.
- [x] 2. 뷰 모드 전환 상태 관리 및 React Portal을 통한 미니 대화창 구현.
- [x] 3. 드래그 기능 및 리퀴드 UI 스타일링, 애니메이션 적용.

## Phase 5: Verification & Auditing
- [x] 1. 빌드 및 타입체크 수행.
- [x] 2. Reviewer를 통해 코드 수정 결과물의 품질과 버그 여부를 독립적으로 교차 검증.
- [x] 3. Forensic Auditor를 통해 비정상적인 우회나 치팅이 없는지 확인.
