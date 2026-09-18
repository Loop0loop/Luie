## 저장 로직 개선 — 최우선 작업 (2026-09-08)

### 합의한 범위와 현재 상태

- [x] DB·저장 구조 재조사와 실제 결함 재현을 기록했다. [설계 감사](docs/quality/storage-architecture-review-2026-09-08.md), [기존 DB 감사](docs/quality/performance-audit-2026-09-08/database.md), [재현 소스·관측 결과](docs/quality/storage-architecture-review-2026-09-08/evidence/README.md).
- [x] 아래에 요구사항·위험·테스트 조건·상황 가정·기대 결과·실행 기록 규칙을 설계했다.
- [ ] 제품 저장 로직을 수정하고 정상 동작을 기대하는 회귀 테스트를 통과시킨다. **문서 작성이나 결함 관측 probe의 통과를 구현 완료로 체크하지 않는다.**

사용자 합의: **저장 안전성을 먼저 보장하고, `.luie` 형식을 유지하면서 일반 저장을 변경된 장과 필요한 정보만 갱신하도록 바꾼다.** 초기 생성·다른 이름으로 저장·복구에는 전체 파일 생성 경로를 유지한다. main DB는 최신 작업본이고 검색 cache DB와 다르므로 삭제 가능한 cache로 취급하지 않는다.

스냅샷은 과거 상태 보존, 일반 저장은 현재 상태 반영이다. 증분 저장 도입을 이유로 스냅샷 생성·보관 정책을 임의 변경하거나 기존 이력을 삭제하지 않는다. 큰 삭제 직전 본문 보존은 아래 정책 결정 항목에서 별도로 다룬다.

### ISTQB 관점과 테스트 근거

위험에 따라 우선순위를 정하고, 요구사항 → 테스트 조건 → 케이스 → 실행 결과 → 결함을 연결한다. 동등 분할·경계값·결정 테이블·상태 전이와 기존 결함에 대한 오류 추정을 적용한다. 이는 이 프로젝트의 테스트 설계이며 ISTQB 인증이나 전체 무결성 보장을 의미하지 않는다. 근거: [ISTQB CTFL v4.0.1](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf), §1.4.1/1.4.4, §4.2, §5.2.

| 요구 ID | 요구사항과 실패 영향 | 발생 가능성 평가 근거 | 우선순위 | 연결 테스트 |
|---|---|---|---|---|
| SAVE-R1 | 최신 본문과 chapterId를 보존한다. 실패 시 원고 유실/다른 장 오염 | pending·전환·재열기의 분리 재현 있음 | P1 | T01~T04, T09, T13 |
| SAVE-R2 | DB/package 쓰기는 각 transaction 내 전부 성공 또는 전부 rollback, 실패를 성공으로 표시하지 않는다 | 공유 연결 transaction 혼입·단건 partial commit 재현, 오류 전파 경로 확인 | P1 | T05~T08, T10, T13 |
| SAVE-R3 | 저장 성공한 지원 형식을 같은 reader로 다시 읽을 수 있다 | 5MiB+1 entry 저장 성공/읽기 실패 재현 | P1 | T11~T12, T18 |
| SAVE-R4 | 변경 범위 전체를 반영한 revision만 완료 처리하고 다른 원본을 보존한다 | 전체 revision ACK와 부분 scope의 불일치 위험, 외부 파일은 동시 변경 가능 | P1 | T08~T10, T14~T16 |
| SAVE-R5 | 스냅샷 정책을 몰래 바꾸지 않고 보존 대상 본문·종류를 복원한다 | 중복 저장, MANUAL type 누락, focus/복원 차이 등 소스 확인 | P1 | T17~T19 |
| SAVE-R6 | DB 손실·crash·외부 파일 오류에서 남은 정상 원본으로 복구한다 | checkpoint 후 DB 손실 복원 확인, 일부 오류/OS는 미검증 | P1 | T07~T10, T18~T20 |
| SAVE-R7 | 작은 변경의 작업량을 줄이고 지원 OS에서 저장 계약을 유지한다 | macOS writer 분리 벤치 있음; Windows/Linux 실기 미실시 | P2, 안전성은 P1 | T15~T16, T20~T21 |

P1/P2는 작업 우선순위다. 재현 가능성이 높다는 평가를 실제 사용자 장애 빈도 통계로 표현하지 않는다. 데이터 손실 위험은 속도 개선보다 먼저 검사한다.

### 실행 순서와 완료 조건

#### 1단계 — 최신 원고와 저장 성공의 의미 고정

- [ ] STOR-01: 기존 테스트의 구 Prisma mock/목록 DTO 본문 기대를 현재 계약에 맞추고 실제 DB·파일 검사를 준비한다. 정상 기대값으로 현재 결함을 재현하는 실패 검사를 먼저 남긴다.
- [ ] STOR-02: main pending의 처리 세대만 완료한다. A 저장 중 B 도착 시 B를 남긴다. raw editor flush와 이전 chapterId도 수동 저장의 종단 범위에 포함한다.
- [ ] STOR-03: 공유 연결의 `BEGIN`~`COMMIT` 사이 비동기 양보를 제거하고, 저장 실패를 flush/manual save까지 전달한다.
- [ ] STOR-04: 명시적 `.luie` 재열기가 미반영 DB 변경을 timestamp만으로 덮지 않도록 한다. 외부 변경과 로컬 변경이 충돌하면 양쪽을 보존한다.
- [ ] STOR-05: reader/writer의 entry·전체 파일 크기 계약을 맞춘다. 실패 시 이전 정상 파일을 보존한다.

완료 조건: T01~T05, T07~T09, T11~T13 통과. 마지막 입력/대상 장 보존, 실패의 성공 오인 없음, DB/파일 재열기로 실제 내용 확인. T06의 새 batch transaction과 T10의 package/ACK crash 경계는 2단계에서 완료한다. 테스트 환경 문제로 실행하지 못한 케이스는 통과로 세지 않는다.

#### 2단계 — `.luie` 형식을 유지한 안전한 부분 갱신

- [ ] STOR-06: 변경 entry·삭제 entry·meta·container info를 하나의 동기 SQLite transaction으로 반영한다. 기존 세계관 단건 쓰기도 같은 계약으로 묶는다.
- [ ] STOR-07: 기존 export queue에 변경 scope/세대를 연결한다. 변경 범위가 온전히 설명되는 경우만 부분 갱신하고, 반영한 revision만 ACK한다.
- [ ] STOR-08: 원본 DB와 package 각각 일관된 read snapshot을 사용한다. full export/단건 writer/import/attach가 같은 파일의 저장 순서를 따르게 한다.
- [ ] STOR-09: hot journal 복구·package commit 후 ACK 전 crash·재시작 revision gap을 처리한다. 외부 base 불일치나 package에만 있는 entry는 자동 full overwrite하지 않는다.
- [ ] STOR-10: 기존 형식의 읽기/복원 호환성과 생성·삭제·이름/순서 변경을 검증한다. 미지원 scope의 전체 checkpoint는 원본이 지원 payload에 보존된 경우만 사용한다.

완료 조건: T06~T16, T18, T20 통과. full/부분 저장 후 동일한 프로젝트 의미를 복원한다. 반영하지 않은 domain을 clean으로 표시하지 않는다. 큰 파일 전체를 매 저장 해시/복사하는 것으로 작업량만 다른 곳에 옮기지 않았는지 T21에서 측정한다.

#### 3단계 — 스냅샷·이력·파생 작업 비용 정리

- [ ] STOR-11: 아래 스냅샷 정책 미정 항목을 확정하고 기존 동작 검사와 목표 정책 검사를 분리한다.
- [ ] STOR-12: snapshot 본문·MANUAL/AUTO type·chapter 연결·복원 범위를 round-trip으로 보존한다. metadata-only index는 reader 변경과 함께 다룬다.
- [ ] STOR-13: ChapterRevision 새 append의 필요/보관 정책, snapshot 중복·외부 artifact의 역할을 정한 뒤 줄인다. 기존 이력은 일괄 삭제하지 않는다.
- [ ] STOR-14: 단건 FTS 갱신, 파생 작업 generation, 불변 chunk 보존을 적용한다. 남은 큰 작업의 process 이전은 실제 비용을 본 뒤 수행한다.

완료 조건: T17~T21의 확정된 정책과 복구 조건 통과. 미정 정책을 임의 기대값으로 채워 통과 처리하지 않는다.

### 명시적인 상황 가정과 테스트 데이터

| 가정 ID | 가정·fixture | 가정이 바뀌면 추가할 검사 |
|---|---|---|
| A1 | 앱 한 인스턴스, 프로젝트 2개와 각 장 2개 이상. A/B는 다른 본문 세대이며 id를 명시한다 | 다중 process/utility writer는 T10/T14/T20에서 별도 경합. process-local lock만으로 외부 배타성을 가정하지 않음 |
| A2 | main/cache DB·userData·`.luie`·mirror·snapshot을 임시 경로로 격리. 사용자 데이터/설정 사용 금지 | OS packaged 검사는 동일하게 userData까지 격리. native ABI가 안 맞으면 실행불가로 기록 |
| A3 | 동시성 순서는 deferred barrier로, debounce/gate는 제어 가능한 clock으로 만든다 | 임의 sleep으로 우연히 통과시키지 않음. 실제 DB transaction·파일 I/O는 mock으로 대체하지 않음 |
| A4 | 기존 sqlite-v2 파일, detached project, missing/corrupt file, 외부 변경 파일, 미지 entry를 각각 준비 | 같은 projectId라도 다른 복사본/기기 revision을 무조건 대소 비교하지 않음 |
| A5 | 빈 문자열·한글·ASCII·이모지·줄바꿈과 크기 경계. 파일 상한 단위는 UTF-8 bytes | 삭제 정책의 '글자' 단위는 별도 정의. UTF-16 length와 사용자 인식 글자를 혼동하지 않음 |
| A6 | 정상 DB commit과 portable package 반영은 다른 상태. 임시 filesystem의 성공을 정전 내구성으로 보지 않음 | SQL 예외 주입, 자식 process 강제 종료, 실제 OS/전원 손실은 서로 다른 시험/증거로 기록 |

### 테스트 조건과 케이스 설계

아래는 **정상 목표 동작을 판정하는 설계**다. 초기 상태는 전제 A1~A6를 따르고, 각 변형은 별도 실행 결과를 남긴다. 저장 완료는 API 응답만 확인하지 않고 재열기한 본문·metadata·revision·남은 pending을 검사한다.

| ID / 기법·수준 | 테스트 조건·상황 가정 | 동작·실패 주입 | 기대 결과 / 판정 근거 |
|---|---|---|---|
| T01 / 상태 전이·DOM+integration | A1/A3, editor raw buffer만 B이고 전달 debounce 전 | 입력 즉시 Ctrl/Cmd+S; 일반/분할 editor 각각 | 현재 editor B가 올바른 장의 DB와 package에 반영. raw buffer가 남았는데 저장 완료 표시 금지 |
| T02 / 상태 전이·DOM+integration | A1/A3, A장 미저장 입력, B장 기존 본문 | A→B 전환, unmount, 다른 프로젝트 전환 | A 입력은 A로 저장, B는 불변. 이전 chapterId 인자가 호출 끝까지 유지 |
| T03 / 상태 전이·service | A1/A3, pending A 저장이 시작됨 | DB update 대기 지점에 동일 장의 B enqueue 후 A 완료 | B pending 보존·후속 저장, A 완료 이벤트가 B 저장 완료를 뜻하지 않음 |
| T04 / 동등 분할·integration | A1/A5, 같은 본문 / 다른 본문 / 본문은 같고 제목만 변경 | 각각 저장, 반복 저장 | 같은 내용은 불필요한 본문 write 없음. 제목 변경은 필요한 metadata만 반영. 서로 다른 장/프로젝트는 독립 |
| T05 / 오류 추정·native DB | A2/A3, 기존 A, 새 B 저장 중 공유 연결 | chapter transaction 오류 주입과 unrelated domain write를 제어한 순서로 실행 | chapter는 전부 rollback. 다른 작업이 성공으로 반환됐다면 chapter 실패에 함께 취소되지 않음. transaction 안 async 양보 없음 |
| T06 / 오류 추정·native DB+FS | A2, 기존 정상 package | batch 첫 entry/중간 entry/meta/info 각각 실패; COMMIT 실패는 가능한 주입 경계를 별도 기록 | 한 transaction의 내용·meta·info가 모두 이전 상태 또는 모두 새 상태. 실패 시 ACK 없음. 파일을 새 연결로 읽어 확인 |
| T07 / 결정 테이블·handler integration | A2, DB B write 실패; 옛 A package export 자체는 가능 | performSave→flush→manual save 실경로 실행 | 수동 저장 실패 전달, B pending/복구 가능한 자료 보존. 옛 파일 export 성공으로 전체 성공 처리 금지 |
| T08 / 상태 전이·DB+FS | A2/A3, B는 DB commit 완료, 파일은 A | package write 오류/권한 오류/잠금 후 재시도 | DB B 유지, exportedRevision 미진행, 실패 표시. 재시도 성공 후 같은 B 반영. 실제 ENOSPC와 mock 오류는 구분 |
| T09 / 결정 테이블·DB+FS | A2/A4, revision gap 있고 DB B/package A | 명시적 같은 파일 열기. recent project 선택은 별도 변형. timestamp 과거/같음/미래도 실행 | DB B 보존. 외부 divergence면 양쪽 보존. 이전 파일로 덮고 clean 처리 금지 |
| T10 / 상태 전이·자식 process+FS | A2/A6, DB commit 전/후, package commit 전/후, ACK 전/후 경계 | child process 종료 후 새 process 재열기; timeout 뒤 기존 writer가 아직 살아 있는 변형 | 마지막 성공 commit 보존, 미완료는 pending/재조정. package commit 후 ACK 전 crash는 안전한 재적용. 늦은 writer가 새 상태를 덮지 않음 |
| T11 / 경계값·writer/reader | A5, entry 상한 L=5×1024×1024 bytes(현행값) | L−1/L/L+1 payload를 full/부분 경로로 저장 후 읽기. 한글·이모지로도 정확한 byte 경계 구성 | 허용 범위는 write/read 왕복 일치. 초과는 기존 정상 상태 보존하며 명시 실패. 프로젝트/FS/IPC의 더 작은 입력 제한은 경계별로 별도 기록 |
| T12 / 경계값·native FS | A5, package 상한 K=256×1024×1024 bytes(현행값) | controlled fixture로 K−1/K/K+1 파일을 검사하고, 기존 파일은 한도 안/수정 후 한도 밖인 쓰기 실행 | 교체 전에 최종 크기 검증, 읽을 수 없는 성공 파일 생성 금지. SQLite 페이지 정렬로 정상 파일에서 도달 불가능한 exact size는 validator fixture와 실제 파일시험을 구분 |
| T13 / 상태 전이·lifecycle integration | A1/A3, 입력/DB 저장/package 저장 중 | 창 닫기, 종료, 종료 취소, renderer crash | 전달 가능한 최신 입력 flush, 실패 시 정상 저장 종료로 오인하지 않음. 종료 취소 후 queue 재개. renderer-only 미전달 자료의 한계를 별도 기록 |
| T14 / 결정 테이블·DB+FS | A1/A3, chapter patch 수집 중 world/memory/snapshot revision 증가 | 알려진 scope와 관측하지 못한 writer 변경을 각각 끼워 넣기 | 범위가 완전할 때만 전체 revision ACK. 미관측 변경은 보존 가능한 전체 checkpoint로 전환; 누락 상태 clean 금지 |
| T15 / 동등 분할·DB+FS | A4, 기존 chapter 수정 / 생성 / 삭제 / 제목 / 순서 변경 / world 변경 | 각 mutation 후 full 또는 지원되는 부분 저장, 실제 import | 본문·meta 목록·삭제 entry 일치. full/부분 경로의 복원 의미가 같음. 무관한 문서는 불변 |
| T16 / 결정 테이블·FS | A4, 외부 copy 교체/동일 id 다른 base/미지 entry/package-only 변경 | 저장·attach·import·Save As와 경합 | 양쪽 원본 보존 또는 명시 충돌. unknown scope라는 이유로 미지 entry를 제거하는 full overwrite 금지 |
| T17 / 경계값·gate unit+service | A3/A5, 일반 자동 snapshot과 아래 정책 결정값 | 현재 60초 gate의 59,999/60,000/60,001ms, 본문 길이 0/1, 동일/변경 hash, 생성 실패 후 재시도 | 현재 동작을 먼저 기록하고 확정한 목표와 비교. 증분 저장 때문에 생성 횟수/본문 세대가 달라지지 않음. 삭제 전 보존은 미정 정책 확정 후 별도 변형 |
| T18 / 동등 분할·DB loss+FS | A4/A5, 구 full-index package, MANUAL/AUTO snapshot과 원고 B | checkpoint 완료→임시 DB 삭제→실제 importer→본문/스냅샷 복원 | export 계약에 포함된 본문·type·장 연결 보존. index를 metadata-only로 바꿔 빈 본문이 되는 회귀 금지. 포함되지 않은 이력이 복구됐다고 주장하지 않음 |
| T19 / 경계값·복구/보관 integration | A3/A4, DB chapter A와 artifact focus B, 빈 DB+기존 backup, 수동/자동 이력 | artifact 복원·orphan cleanup·정책 cap N−1/N/N+1·시간 bucket 전/정각/후 실행 | preview와 실제 복원 대상이 계약대로 일치. DB 인덱스 부재만으로 유일한 backup 삭제 금지. MANUAL 보관은 확정 정책에 따름 |
| T20 / 오류 추정·OS packaged | A2/A4/A6, macOS/Windows/Linux의 실제 packaged native runtime | hot journal 뒤 읽기, 읽기 전용 파일, replace 실패, 잠금, 한글 경로, suspend/resume | 복구 가능한 journal을 corrupt로 오인하지 않음. 원본 보존·실패 전달·재시도. 실제 OS/arch/FS별 결과를 남기고 미실시는 미실시로 표시 |
| T21 / 성능·실제 writer+앱 | A1/A2, 50/250/1,000장×64KiB, snapshot 0/20/50, 1장 1byte 수정 | 동일 fixture의 before/after, no-op, 연속 입력, snapshot 동반 저장 | 무관한 entry/body 재삽입 없음, scope fallback 사유 기록. SQL 수·논리 bytes·wall p50/p95·main long task·메모리 측정. 반복 수/전원/장치 명시, 합성 수치를 OS 공통 보장으로 확대 금지 |

### 부분 갱신/파일 열기 결정 테이블

위에서 먼저 해당되는 규칙을 적용한다. 이 표의 '전체'는 원본이 DB의 지원 payload에 모두 보존되고 외부 파일 충돌이 없는 경우에만 허용한다.

| 규칙 | 조건 | 선택/금지 동작 | 검증 |
|---|---|---|---|
| D1 | target identity/base 불일치 또는 package-only/미지 entry 보존 불확실 | 양쪽 보존·충돌/복구. 자동 full overwrite 금지 | T09/T16 |
| D2 | 파일 열기 요청이고 pending/local revision gap 존재 | 최신 로컬 자료 보호·동일 writer 아래 재조정. timestamp만으로 import 금지 | T01/T03/T09 |
| D3 | hot journal 또는 진행 중 writer 존재 | recovery/기존 작업 settle 후 읽기·쓰기. timeout만으로 새 writer 시작 금지 | T10/T20 |
| D4 | 정상 최초 생성/새 target이며 보존해야 할 기존 파일 없음 | 전체 생성 | T15/T18 |
| D5 | base 일치, 범위 완전, 지원 mutation, 변경 있음 | 변경 집합+meta+info 단일 transaction | T06/T14/T15 |
| D6 | base 일치, 미지원/불완전 scope 또는 재시작 gap, 원본은 DB에 보존됨 | 일관된 전체 checkpoint | T10/T14/T15 |
| D7 | base와 완료 revision 일치, 변경 없음 | 불필요한 write 생략. 수동 저장은 실제 완료 상태 확인 | T04/T21 |

### 저장 상태 전이와 금지 전이

한 revision의 상태를 `editor에만 있음 → main 접수 → DB commit → package commit → 완료 ACK`로 구분한다. detached project는 DB commit까지만 보장하며 package까지 저장됐다고 표시하지 않는다.

- T01/T02: main 접수 전에도 수동 저장/전환이 raw buffer를 포함하는지 확인한다.
- T03/T14: 진행 중인 r보다 새로운 r+1은 별도 pending이다. r 완료로 r+1 완료를 표시하지 않는다.
- T05~T08: DB 실패는 접수/복구 상태를 남기고, package 실패는 DB commit을 유지한다. `실패 → 정상 완료 ACK`는 금지다.
- T10: `package commit → ACK 전 crash`는 실제 파일 상태를 검사하고 재조정한다. `ACK 먼저 → package 나중`은 금지다.
- T09/T16: 외부 충돌은 원본 보존 상태로 전환한다. `충돌 → 자동 덮어쓰기 완료`는 금지다.
- 유효 전이뿐 아니라 위 금지 전이도 명시적으로 실행해 거부/보존 결과를 검사한다.

### 스냅샷 정책 결정 항목 — 구현 전에 기준을 확정할 것

- [ ] POL-01: '큰 삭제'의 삭제 글자 수 N, 비율 R, 글자 계산 단위, 삭제 전 기준 본문을 정한다. 숫자를 임의로 30자 등으로 확정하지 않는다. 확정 후 N−1/N/N+1, R 바로 아래/같음/위, 전체 삭제·같은 길이 교체·undo/redo를 T17에 추가한다.
- [ ] POL-02: 큰 삭제 보호가 필요하면 **삭제 전 본문**을 어느 시점에 반드시 보존할지, 60초 gate와 독립인지, snapshot 저장 실패 시 원고 변경을 어떻게 처리할지 정한다. 현재 저장 후 snapshot과 동일 기능으로 간주하지 않는다.
- [ ] POL-03: MANUAL/AUTO의 cap·시간 보관·package 포함 범위와 실패 시 재시도 기준을 정한다. 사용자 생성 이력이 자동 cap에서 사라지지 않는 목표를 먼저 명시하고 검증한다.

이 항목이 미정이면 관련 목표 정책 테스트는 `정책 미정` 상태로 둔다. 현재 동작을 확인하는 테스트와 정책 변경 후 정상 기대값을 섞지 않는다. 다른 저장 안전성 수정은 독립적으로 진행할 수 있다.

### 테스트 구현·실행 방법과 기록 규칙

- 기존 Vitest/DOM/native SQLite/FS 도구를 재사용한다. mock은 clock·실패·경합 순서를 제어하는 데 쓰고, transaction/복원 보장은 실제 DB와 파일에서 검사한다.
- 기존 결함 probe는 결함 발생을 assert한다. 정상 회귀검사로 옮길 때 기대값을 **최신 본문 보존·전부 rollback·읽기 가능**으로 바꾸고, 수정 전 실패/수정 후 성공 증거를 남긴다.
- 경로/본문/포맷 검증을 유지하며 테스트 편의를 위해 내구성·IPC guard·기존 정책 검사를 끄지 않는다. native ABI/환경 문제는 별도 실행불가 사유다.
- 실제 저장 변경마다 관련 targeted test와 `pnpm run typecheck`, `pnpm run lint`, `pnpm run qa:core` 및 영향받는 `check:persist-contracts`/IPC/Drizzle/utility 검사를 실행한다. 현재 기존 실패는 별도 기록하고 전체 통과로 표현하지 않는다. 이번 문서 변경에는 런타임 검사 완료를 주장하지 않는다.
- 문서 체크박스는 연결 케이스/실행 결과/잔여 결함이 기록돼야 완료 처리한다. OS 시험을 mock으로 대체해 완료 처리하지 않는다.

실행마다 다음 항목을 남긴다. 최종 결과를 덮어쓰지 않고 실패·재시도 이력도 유지한다.

```text
실행 ID / 날짜:
요구 ID / TODO ID / 테스트 ID / 변형 / 연결 결함:
commit + 작업 트리 상태 / 실행 명령:
OS·arch·filesystem / Electron·Node·SQLite / native ABI:
fixture·seed·본문 UTF-8 bytes / main·cache·userData·package 격리 경로:
가정 A* / 정책 버전 POL-* / 초기 본문·revision·exportedRevision:
행동 순서 / barrier·clock / 실패 주입 위치 / mock·실제 I/O 범위:
기대 결과 / 실제 본문·meta·revision·pending·복원 결과:
상태: 통과 | 실패 | 환경상 실행불가 | 정책 미정 | 미실시
로그·JSON·DB/파일 증빙 경로 / 잔여 위험 / 다음 조치:
```

### 기존 감사 실행 기록 — 새 정상 회귀검사 통과와 구별

| 기록 | 실제 가정·범위 | 관측 결과 | 근거·다음 처리 |
|---|---|---|---|
| AUD-01 / T09 | macOS Node, 실제 DB·FS·서비스, export 예약만 보류 | DB B(7/5)가 explicit reopen 후 A(9/9)로 되돌아감: 결함 재현 | [관측 JSON](docs/quality/storage-architecture-review-2026-09-08/evidence/stale-open-observation.json). 정상 기대 B로 회귀검사 전환 |
| AUD-02 / T06 | 실제 단건 writer+SQLite, meta/info 실패 trigger | reject인데 앞선 본문 또는 meta가 이미 commit: 결함 재현 | [원자성 JSON](docs/quality/storage-architecture-review-2026-09-08/evidence/package-atomicity-results.json). 전체 rollback 기대 추가 |
| AUD-03 / T11 | 실제 full/단건 writer, ASCII 5MiB+1 chapter | 쓰기 성공 후 같은 reader 거부: 결함 재현 | [크기 JSON](docs/quality/storage-architecture-review-2026-09-08/evidence/package-size-limit-results.json). write/read 경계 일치 기대 추가 |
| AUD-04 / T18 | checkpoint 완료 후 임시 main DB 삭제, 현행 getChapter API로 본문 조회 | 원고·snapshot 본문 복원 통과. type/모든 domain/미checkpoint 상태까지 증명하지 않음 | [복구 JSON](docs/quality/storage-architecture-review-2026-09-08/evidence/db-loss-results.json). 보존 필드 범위 확장 |
| AUD-05 / T21 | macOS arm64 Node, 1,000장×64KiB+snapshot20, 실제 writer 3회, collector 제외 | full median80.91ms / 기존 단건2.97ms. 단건 원자성 결함 있어 개선 완료 아님 | [비용 JSON](docs/quality/storage-architecture-review-2026-09-08/evidence/package-cost-results.json). 수정 후 같은 조건 비교 |
| AUD-06 / STOR-01 | 기존 DB-loss의 목록 DTO assertion, snapshot package suite의 구 Prisma mock | 현재 계약과 맞지 않는 테스트 실패 확인 | [설계 감사의 검증 기록](docs/quality/storage-architecture-review-2026-09-08.md). 제품 결함과 fixture 결함 구분하여 정비 |

현재 이 표는 앞선 감사 결과를 연결한 기록이다. **이번 TODO 작성에서 제품 코드 변경·신규 런타임 테스트 실행·세 OS 내구성 검증을 완료한 것은 아니다.**

---

## 파생 작업 안정화

- [x] 삭제된 챕터를 가리키는 `rebuild_embedding` 작업을 종료 처리한다. chunk가 없는 작업은 `skipped`로 전환해 `embeddingQueued: 1`, `embeddingProcessed: 0` 반복을 막는다.
- [x] `sqlite-vec`을 main/utility 번들에서 외부화해 플랫폼별 확장 바이너리가 정상 로드되도록 한다. 개발 번들에서 확장 모듈이 외부 import로 유지되는 것을 확인했다.

## ox-alpha 분석 의견 (읽기 전용 조사 기반)

### 버그 우선 3종 (사용자 체감 손상)
1. 원고 DnD 미동작 — 드래그 source의 data.type과 드롭 핸들러 기대 type 불일치 의심 (`DraggableItem` vs `EditorDropZones`). 재현 경로 필요.
2. research ↔ 에디터 툴바 겹침 — 툴바 z-40(`GoogleDocsEditorColumn:68`)이라 뷰 전환 시 겹침. canvas 모드처럼 뷰 타입별 조건부 렌더(hide) 필요.
3. research 링크 클릭 무반응 — `useSmartLinkClickHandler`가 밑줄 mark + 이름 퍼지 매칭 실패 시 조용히 false 반환. store 미로딩/이름 불일치 케이스 로깅 추가 후 원인 특정.

### 스크리브너
- 직각(스퀘어) 스타일 동의 — docs와 시각 구분 + 도구 메타포에 맞음.
- 인스펙터 애니메이션 끊김 — 코드에 애니메이션은 있으나 패널 mount/unmount 순간 레이아웃 점프 의심. docs sidebar 패턴과 동일 튜닝.
- 등장인물→원고 복귀 시 툴바 깜빡/우측 붙음 — sharedEditor remount(key) + editor=null 구간 때문. 인스턴스 캐시 또는 툴바 유지 렌더링.
- React hooks order 경고(EntityDetailView) — 정작 본체는 hooks-safe(모든 훅이 early return 이전). Wiki/Event/Faction DetailView 부모의 조건부 렌더링이 발원지 의심.

### UX 방향
- 스크리브너: 개념(binder-본문-inspector, DnD 편성)은 차용, 세부 UI/UX는 Luie 디자인 시스템으로 재해석. 기존 툴의 불편을 고치는 게 이 레이아웃의 존재 이유.
- 1화면 1컴포넌트 아니오 — MainLayout은 이미 panels[]+DnD로 복수 패널 지원. 스크리브너 확장 시 "inspector 안에 서브탭"이 "inspector를 panels로 통합"보다 현실적.

### 실행 순서 제안
1. 버그 3종 → 2. 소형 스타일 일괄(스냅샷/휴지통/스크랩 rounded·색상, diff 요약, scrivener 직각) → 3. 구조 작업(좌측 menuBar, windowBar 제거, sidebar 상승) → 4. 인스펙터 애니메이션·hooks 경고·툴바 깜빡임

### 작업 공통 주의
- workspace 수정 시 반드시 **GoogleDocsLayout에만 영향**이 가는지 확인할 것. 레이아웃은 4개(default/docs/scrivener/editor)이고 관리 주체는 workspace다.
- 완료: A4 페이지 세로 overflow 수정(GoogleDocsEditorColumn shrink-0), docs 스냅샷 diff 패널 덮어쓰기 전환 + 좌측 중앙 돌아가기 토글.
- 완료: docs 레이아웃 우측 패널 min/max 조율 — research(420/780)/AI(480/900)/버전기록-snapshot(380/860) docs 전용 config 신설(layoutSizing.ts). **`collapsible` 제거** → 드래그로 min 아래로 내려가 collapse(0px) 되는 것 방지, X 닫기로만 닫힘. 최초엔 `onResize`→`closeRightPanel` sync를 시도했으나 드래그 도중 패널 unmount가 `setPointerCapture`/`toFixed(undefined)` 크래시를 유발해서 제거. 다른 3개 레이아웃 editor.panel/scrivener/canvas에는 영향 없음.


  1. 현대 로맨스 S에서 사용할 최소 gold 계약 보강
  2. chapter/scene/event/evidence 정합성 검증
  3. relationship/knowledge 전용 invalid 테스트
  4. review 충돌 및 stage-target 검증
  5. 4.2 디렉터리 구조 생성
  6. 원고가 아닌 현대 로맨스 blueprint 작성
  7. blueprint 사람 검수
  8. 통과한 구조에서 chapter/scene plan 작성 [현재 단계]
  9. 그다음에만 20화 이하 원고 생성
  10. evidence alignment와 query/gold 작성
  11. manuscript/query 사람 검수
  12. Retrieval → Oracle → End-to-end 평가