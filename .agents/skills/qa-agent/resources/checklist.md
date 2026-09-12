# 영역별 검토

대상과 관련된 항목을 선택한다. 이 목록 자체는 모든 검사의 실행 요구가 아니다.

| 영역 | 확인할 계약 |
| --- | --- |
| IPC·보안 | schema/소유권 검증, 최소 preload capability, CSP, 파일 경로·URL 신뢰 경계, 비밀 노출 |
| 저장·복구 | autosave 접수와 내구성 완료, flush·export 실패, rollback, 종료 취소, 오래된 결과 |
| 상태·UI | project/chapter 전환, 이벤트 정리, 좁은 store 구독, persist migration |
| 접근성 | keyboard/focus·label, 색상 외 상태 표시, 실제 테마 대비, reduced-motion |
| 성능 | 실제 병목·데이터 크기·환경, 입력 hot path, DB/utility/renderer 비용 구분 |
| 테스트 | 재현 입력·정상/실패 경로, mock과 실제 실행의 차이, 테스트 데이터·네트워크 격리 |
| 빌드·의존성 | package/lock 일치, 기존 정책 게이트, native ABI·packaged schema |

성능 목표는 프로젝트의 해당 benchmark·품질 기준을 확인한다. 웹 서버·모바일 기준이나 임의 coverage/파일 길이/응답 시간 수치를 Luie의 합격선으로 도입하지 않는다.
