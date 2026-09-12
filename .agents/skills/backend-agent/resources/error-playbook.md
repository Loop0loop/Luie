# Main 검사 실패 대응

- native module 오류: Node/Electron ABI와 실행 명령을 확인한다. 기존 rebuild 흐름을 사용하고 in-memory/mock 결과를 실제 DB 검증으로 보고하지 않는다.
- migration 오류: main/cache DB와 migration 경로를 대조한다. 임시 복사본에서 재현하며 실사용 DB를 rollback·삭제·stamp해서 통과시키지 않는다.
- IPC 오류: shared schema → registrar → handler → preload 응답을 따라 원래 오류가 바뀌는 지점을 확인한다.
- 저장 실패: 실패한 단계와 재시도·복구 상태를 확인하고, 이미 반영된 쓰기를 무조건 재시도하지 않는다.
- 테스트 실패: 기대 계약과 실제 구현을 대조한다. assertion이 실패한다는 이유만으로 기대값을 새 결과에 맞추지 않는다.
- 도구·외부 API 실패: 가능한 로컬 검증을 계속한다. 재시도는 오류와 중복 부작용을 고려하고, 한도·인증 변경이 필요하면 해당 작업의 제약을 보고한다.
