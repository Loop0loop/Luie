# Narrative Memory · RAG 실행 계획 SSOT

> 상태: **실행 중**  
> 기준일: 2026-08-27  
> 아키텍처 기준: [narrative-memory-rag-ssot.md](../architecture/narrative-memory-rag-ssot.md)  
> 평가 기준: [narrative-rag-benchmark-ssot.md](../architecture/narrative-rag-benchmark-ssot.md)  
> 쉬운 실행 가이드: [narrative-rag-benchmark-workflow.md](../guides/narrative-rag-benchmark-workflow.md)

## 목표

한 작품의 긴 서사에서 인물·사실·관계·시간·인과·지식·복선·충돌·세계선을 Luie가 얼마나 정확히 회수하고 근거 있게 추론하는지 측정 가능한 local-first memory/RAG를 만든다.

완료의 의미는 “임베딩이 된다”거나 “120화 원고를 생성했다”가 아니다. Retrieval benchmark는 evidence 후보 회수 성능을, RAG reasoning benchmark는 oracle/end-to-end 추론 성능을 별도로 보고해야 한다. 데이터 규모는 S(20화 이하) → M → ML → L → XL 순으로 앞 단계 통과 후에만 확장한다. 세부 기준은 [Narrative RAG Benchmark SSOT](../architecture/narrative-rag-benchmark-ssot.md)를 따른다.

## 현재 상태

| 작업                                         | 상태 | 증거                                                          |
| -------------------------------------------- | ---- | ------------------------------------------------------------- |
| Luie와 `webnovel-writer` 구조·실행 흐름 비교 | 완료 | 양쪽 knowledge graph와 architecture tour, SSOT 비교표         |
| BGE-M3 Q4_K_M 다운로드·SHA 검증              | 완료 | 437,778,496 bytes, SHA-256 `6d3968…fc06`                      |
| llama.cpp b5620 다운로드·SHA 검증            | 완료 | ZIP SHA-256 `aaaddc…99c`                                      |
| 한·영·일 공개 장편 코퍼스 확보               | 완료 | 《무정》 126장, _Monte Cristo_ 117장, 《吾輩は猫である》 전편 |
| CLS/mean 실제 검색 benchmark                 | 완료 | 1024차원, 약 0.5~0.56GiB RSS, SSOT 실측표                     |
| 현대 CC 웹 연작 한·영·일 대응 benchmark      | 완료 | SCP 항밈학과 5편, 세 언어 R@5 100%, RSS 약 544MiB             |
| 1,000자 한·일 physical-batch 실패 재현       | 완료 | 기본 인자 HTTP 500, `--ubatch-size 2048` 성공                 |
| 제품 runtime 수정                            | 대기 | 아래 P0-1                                                     |
| 장편·복수 세계선 acceptance suite            | 대기 | 아래 P0-4, P1                                                 |

## 실행 순서

### P0-1. BGE runtime을 실제 입력 범위에 맞춘다

대상:

- `src/main/utility/llm/embeddingModelConstants.ts`
- `src/main/utility/llm/sidecarSupervisor.ts`
- 중복 상수인 `src/main/services/features/llm/embeddingModelConstants.ts`
- sidecar spawn-argument tests

작업:

1. pooling을 `mean`에서 `cls`로 변경한다.
2. `--ubatch-size 2048`을 추가한다.
3. embedding signature에 모델 ID, quantization, pooling, dimension을 포함해 기존 mean vector를 stale 처리한다.
4. 기존 derived-job 흐름으로 재임베딩한다. DB 원문을 삭제하거나 전체 DB를 초기화하지 않는다.
5. 한·영·일 1,000자 입력과 1024차원 응답을 자동 test로 고정한다.

합격 기준:

- 세 언어 1,000자 입력의 HTTP 500이 0건이다.
- CLS vector가 1024차원이고 유한값이다.
- 모델 교체 후 mean vector가 검색에 혼용되지 않는다.
- 활성 embedding sidecar RSS가 동일 장비에서 700MiB 이하이고, idle 60초 후 종료된다.

### P0-2. 회차·장면·시간 경계를 모든 retrieval layer에 강제한다

작업:

1. query scope를 `project_id`, selected chapter/order, scene range, continuity로 하나의 계약으로 만든다.
2. Layer 1 summary, Layer 2 structured memory, Layer 3 raw chunk에 같은 상한을 적용한다.
3. 회상은 사건 발생 시점과 서술 시점을 둘 다 기록한다.
4. 미래 예고는 현재 사실과 분리하고, 확정/추정/폐기 상태를 둔다.

합격 기준:

- N화 시점 질의에 N+1 이후 evidence가 0건이다.
- 명시적으로 “미래 포함”을 요청할 때만 상한을 해제한다.
- 답변의 모든 사실이 허용 범위 안의 exact source offset/hash로 역추적된다.

### P0-3. projection 자동화와 운영 상태를 완결한다

작업:

1. entity, episode, temporal fact 생산을 저장 후 derived worker 흐름에 연결한다.
2. `MemoryEpisodeParticipant`, `MemoryStateChangeCandidate`, fact invalidation의 실제 producer를 연결한다.
3. revision별 projection 상태를 `pending/running/succeeded/failed/stale`로 노출한다.
4. 실패한 projection만 재생하고 정본 저장은 되돌리지 않는다.
5. 환경 플래그가 꺼진 경우 UI/진단 보고서에서 “비활성”으로 명시한다.

합격 기준:

- chapter save 한 번으로 chunk, embedding, entity, episode, temporal projection이 관찰 가능한 상태 전이를 거친다.
- worker 재시작 후 중복 row 없이 재개된다.
- source hash 변경 시 관련 projection만 stale/rebuild 된다.

### P0-4. Narrative benchmark 계약과 S 단계 corpus를 만든다

신규 원고를 생성하기 전에 [Narrative RAG Benchmark SSOT](../architecture/narrative-rag-benchmark-ssot.md)의 평가 계약과 schema를 구현한다. 기존 `luie-korean-narrative-gold-120-v1`은 정식 acceptance가 아니라 legacy stress/noise fixture다.

실행 순서:

1. Retrieval과 RAG reasoning case/schema/scorer를 분리한다.
2. 10개 narrative taxonomy와 전역 future/worldline guard를 타입으로 고정한다.
3. event, causal edge, relationship transition, character knowledge, foreshadowing schema를 작성한다.
4. `GOOD/BAD/AMBIGUOUS/NOISE` 데이터 자격과 human review 기록 형식을 만든다.
5. 1작품·20화 이하·10~15명인 S 단계 blueprint를 먼저 검수한다.
6. 구조 → chapter plan → manuscript 순서로 생성하고 구조 라벨을 원문에 직접 노출하지 않는다.
7. dense-only/lexical/hybrid/full retrieval, oracle reasoning, end-to-end RAG를 각각 실행한다.
8. S 단계 통과 후에만 다음 장르 또는 M 단계로 확장한다.

합격 기준:

- 모든 source/evidence offset/hash와 graph 참조가 유효하다.
- scored case는 사람 검수된 `GOOD`만 포함한다.
- Retrieval과 reasoning 결과가 별도 보고서로 생성된다.
- 미래 회차 및 금지 세계선 누출은 0건이다.
- taxonomy별 실패 원인이 기록된다.
- 정확도 임계값은 S 실측과 사람 검수 전에는 provisional 상태를 유지한다.

규모 단계는 S(≤20화) → M(≤40화) → ML(≤60화) → L(≤100화) → XL(≥120화)다. 로맨스·판타지·현대물·추리·회귀·무협·SF·스릴러는 같은 scorer를 사용하며, 각 장르가 S 단계를 통과한 뒤에만 해당 장르를 확대한다.

### P1-1. `continuity/worldline`을 정식 데이터 축으로 추가한다

작업:

- chapter/scene/event/fact/relation state에 continuity ID를 연결한다.
- 공통 과거에서 분기된 세계선은 parent continuity와 divergence point를 가진다.
- 병합은 자동 추론하지 않고 명시적 사건으로만 허용한다.
- 동일 인물의 세계선별 상태를 독립 저장한다.

합격 기준:

- 회귀 전 사망 인물과 회귀 후 생존 인물이 같은 시점 질의에 섞이지 않는다.
- IF 세계선 A의 연애 관계가 본편 세계선에 누출되지 않는다.

### P1-2. graph expansion을 live retrieval에 연결한다

작업:

- entity alias → mention → episode → relation/state → evidence를 제한 깊이로 확장한다.
- vector top-k에 없는 관계 evidence도 graph seed로 후보에 포함한다.
- 확장 결과마다 경로와 source evidence를 남긴다.

합격 기준:

- 2-hop/3-hop 관계 질의의 Recall@10이 dense-only baseline보다 유의미하게 높다.
- 잘못 병합된 동명이인이 graph expansion으로 증폭되지 않는다.

### P1-3. 한·영·일 lexical/router 품질을 맞춘다

작업:

- 영어 단어 경계, 한국어 조사/띄어쓰기, 일본어 무공백 텍스트를 각각 검증한다.
- 특정 장르나 중국어 규칙에 묶인 router를 도입하지 않는다.
- 고유명사, alias, 한자/가나/로마자 표기의 deterministic exact boost를 둔다.

합격 기준:

- 세 언어 모두 exact-name query가 lexical 후보에서 누락되지 않는다.
- 언어별 acceptance score 격차가 10%p 이하다.

### P2. 선택형 서버 구독 강화

로컬 BGE-M3와 lexical index는 항상 남긴다. 월정액 tier는 다음 둘 중 검증된 기능만 제공한다.

1. local 후보 20~50개를 고성능 cross-encoder/LLM으로 rerank.
2. 별도 server embedding index를 생성하되 local index와 signature/namespace를 분리.

서버에는 최소한의 chunk와 metadata만 보내고, 사용자가 cloud 처리를 켠 프로젝트에만 적용한다. 저장·동기화가 필요하면 암호화, 삭제, 보존기간, 지역, 비용 상한을 별도 backend SSOT에서 결정한다.

합격 기준:

- 서버 장애·구독 해지·오프라인에서 local retrieval이 즉시 동작한다.
- 서버 강화가 gold Recall/MRR 또는 answer accuracy를 사전 정의된 문턱 이상 개선한다.
- 다른 embedding 공간의 vector를 같은 index에서 비교하지 않는다.

## 공통 검증 게이트

| 게이트       | 필수 조건                                                                 |
| ------------ | ------------------------------------------------------------------------- |
| 권리         | source URL, 권리 근거, 판본/revision, hash가 없는 외부 원문은 ingest 금지 |
| 정본         | raw source와 revision은 projection 실패로 손실되지 않음                   |
| 검색         | lexical/dense/graph/temporal 각 단계의 후보와 탈락 사유 추적 가능         |
| 시간         | selected chapter와 continuity가 모든 layer에 강제됨                       |
| 근거         | 답변 사실이 source ID + offsets + hash로 역추적 가능                      |
| 자원         | active/idle RSS, cold start, batch latency를 release마다 기록             |
| 마이그레이션 | model/pooling/dimension 변경 시 stale 감지와 점진 재임베딩                |
| 다국어       | 같은 acceptance schema로 한·영·일 모두 통과                               |

## 의도적으로 하지 않는 것

- 유료 웹소설 플랫폼 크롤러
- 장르마다 별도 memory 시스템
- BGE-M3 vector만으로 관계·시간 truth를 판정하는 기능
- `webnovel-writer` GPL 코드 복사
- 서버 전용 구조로 local-first 제거
- 벤치마크가 개선되지 않은 추상화, 신규 DB, 신규 queue 도입

## 다음 작업

다음 구현 단위는 **P0-1 하나**다. CLS + physical batch + signature migration + 최소 regression test를 먼저 끝내고, 그 결과를 이 문서의 현재 상태와 architecture SSOT 실측표에 반영한다. 다른 단계는 P0-1이 통과하기 전 병렬 구현하지 않는다.
