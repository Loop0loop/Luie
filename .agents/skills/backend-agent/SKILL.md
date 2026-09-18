---
name: backend-agent
description: "Luie의 Electron main IPC, 저장·복구, Drizzle/SQLite 또는 utility process 동작을 구현·수정할 때 사용한다."
---

# Luie main 구현

저장소 `AGENTS.md`와 `src/main/AGENTS.md`를 따른다. renderer 증상이어도 실제 원인이 main에 있으면 호출 경계를 따라 해결한다.

`handler/` → `domains/` → 기존 `services/`·`manager/`·`database/` 구현을 확인한다. 새 계층을 기본으로 만들지 않는다. IPC를 바꾸면 shared 계약·스키마·등록·preload를 함께 맞춘다.

원고 저장의 접수/완료 의미, 트랜잭션·revision, 패키지 export, 종료 flush·복구 경로를 보존한다. utility process의 main 역의존을 막고, 파일·IPC 입력을 검증한다. 실사용 DB 변경·Supabase 배포는 구현 요청에서 자동 추론하지 않는다.

필요할 때만 참고한다:

- 여러 계층을 함께 바꾸는 작업: [execution-protocol](resources/execution-protocol.md)
- 저장·보안·경계 검증: [checklist](resources/checklist.md)
- native ABI·DB·테스트 실패: [error-playbook](resources/error-playbook.md)
- 구조·명령 위치: [tech-stack](resources/tech-stack.md)
