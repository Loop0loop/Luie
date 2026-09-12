# Main 변경 검증

변경한 영역의 항목만 적용한다.

- IPC: 입력 schema, handler 등록, preload/shared 응답 일치, 실패 전파.
- 저장: project/chapter 소유권, 트랜잭션 rollback, revision·파생 작업, 패키지 저장 실패와 복구.
- lifecycle: readiness·deferred 순서, flush 성공 전 종료 방지, 취소 후 서비스 재개.
- 보안: 외부 경로·payload 검증, 비밀·본문 로그 노출 방지, renderer capability 제한.
- utility: main bridge·sidecar manager·main-only Electron API 역의존 방지.
- 검증: 관련 `tests/main/`·계약 검사, TypeScript 변경의 typecheck. 실제 DB·mock 검증 범위를 구분한다.
