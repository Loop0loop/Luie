Phase 0 - Gate 확장
check-core-complexity.mjs (line 6)에 uiStore, worldBuildingStore, GoogleDocsLayout, useSettingsManager, windowManager, database/index, chapterService를 추가하고 처음엔 advisory로 돌립니다.
Phase 1 - Shared 경계 정리
shared/contracts, shared/ui, shared/hooks처럼 역할을 분리합니다. 먼저 import path 호환을 유지한 채 폴더 의미부터 바로잡는 게 맞습니다.
Phase 2 - Renderer store 분해
uiStore.ts (line 499)를 layout regions / panel sizing / docs/editor mode / transient focus로 나누고, worldBuildingStore.ts (line 213)는 graph data와 view state를 분리합니다.
Phase 3 - Layout / hook 분해
GoogleDocsLayout.tsx (line 74), useSettingsManager.ts (line 33), BinderSidebar.tsx (line 1)를 orchestrator + subview로 쪼갭니다.
Phase 4 - Main service 분해
projectService.ts (line 31), syncService.ts (line 1), windowManager.ts (line 1), index.ts (line 1)를 policy/service/transaction/bootstrap 단위로 나눕니다.
Phase 5 - UI token / build cleanup
tailwind.config.js (line 7)에 spacing/radius token을 추가하고, main의 mixed import 경고를 정리합니다.