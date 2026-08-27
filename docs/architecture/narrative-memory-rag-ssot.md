# Narrative Memory · RAG SSOT

> 상태: **현재 구현과 의사결정의 단일 기준 문서**  
> 기준일: 2026-08-27  
> Luie 기준 커밋: `001b21fa` + 현재 working tree  
> 비교 대상: `webnovel-writer` `2041aba`  
> 실행 계획: [narrative-memory-rag-plan.md](../plans/narrative-memory-rag-plan.md)  
> 평가 데이터 기준: [narrative-rag-benchmark-ssot.md](./narrative-rag-benchmark-ssot.md)

이 문서는 Luie의 장편소설 memory/RAG/utility-process 실제 구현, `webnovel-writer`와의 차이, BGE-M3 선택과 실측 결과를 고정한다. 평가 목적·taxonomy·narrative schema·규모/장르 gate는 별도 benchmark SSOT를 따른다. 다른 문서와 충돌하면 **현재 코드 → 이 문서(제품 아키텍처) / benchmark SSOT(평가 데이터) → 실행 계획 → 과거 계획** 순으로 판단한다.

## 제품 요구사항과 불변조건

1. 원문은 TXT, EPUB, DB 또는 허가된 API로 확보한다. 유료 플랫폼 크롤링은 지원 경로로 두지 않는다.
2. 저장 가능한 원문은 사용자가 작성했거나, 명시적으로 허가됐거나, 적용 관할에서 퍼블릭 도메인인 작품으로 제한한다.
3. 정본은 원문이다. 임베딩, 요약, 인물, 관계, 사건, 시간 사실은 모두 재생성 가능한 파생 데이터다.
4. 원문은 `작품 → 권/부 → 화 → 장면 → 청크` 구조와 원문 순서를 보존한다. 청크는 정확한 원문, offset, hash, 상위 구조 ID를 가진다.
5. 최소 메타데이터는 `novel/project_id`, 회차, 장면 순서, 등장인물, 시간대, 장소다. 분기 세계관에는 `continuity/worldline_id`가 추가돼야 한다.
6. 임베딩은 의미 후보 검색용이다. 복잡한 인물 관계, 과거·현재·미래, IF 세계선의 진실을 벡터 하나에 맡기지 않는다.
7. 답변의 사실은 원문 evidence에 연결한다. 장문 원문 재현은 권리와 제품 정책의 허용 범위 안에서만 수행한다.
8. 현재 집필 시점 이후의 회차나 다른 세계선은 명시적 요청 없이는 검색·요약·답변에 섞지 않는다.

## 현재 Luie 구현

### 정본 저장과 파생 작업

- 정본 저장은 DB transaction 안에서 원문과 revision을 기록하고 파생 job을 예약한다.
- `MemoryChunk`는 원문 content, content/source hash, start/end offset, 순서를 보존한다.
- 임베딩, 요약, entity, episode, temporal fact는 정본이 아니라 재구축 가능한 projection이다.
- canonical package export/sync 검증 경로가 있어 DB와 내보낸 패키지의 일관성을 검사할 수 있다.

핵심 근거:

- [`memoryProjectionService.ts`](../../src/main/services/features/memory/memoryProjectionService.ts)
- [`projection/chunking.ts`](../../src/main/services/features/memory/projection/chunking.ts)
- [`embeddingProjector.ts`](../../src/main/services/features/memory/embeddingProjector.ts)
- [`persistence/`](../../src/main/services/features/memory/persistence/)

### Memory와 시간축

현재 스키마와 서비스에는 chunk/evidence, entity/mention, relation state, character state, knowledge state, episode/evidence, fact/evidence/invalidation, narrative summary가 존재한다. 다만 다음 항목은 모델이 있다는 사실과 실제 자동 생산이 된다는 사실을 구분해야 한다.

- episode LLM 추출은 `LUIE_ENABLE_LLM_EPISODE_EXTRACTION=1`일 때만 동작한다.
- temporal fact LLM 추출은 `LUIE_ENABLE_LLM_TEMPORAL_FACT_EXTRACTION=1`일 때만 동작한다.
- narrative summary hierarchy도 별도 환경 플래그가 필요하다.
- entity 추출은 운영 자동 worker보다 수동 처리 스크립트에 의존하는 구간이 있다.
- `MemoryEpisodeParticipant`, `MemoryStateChangeCandidate`의 지속적 runtime 생산과 fact invalidation 자동 생성은 완결되지 않았다.
- `event-causality` intent가 요청하는 source와 실제 temporal executor가 소비하는 source가 완전히 정렬되지 않았다.
- `continuity/worldline_id`가 없어 과거 회상, 미래 예고, IF 세계선, 회귀 전후를 독립 truth set으로 보장하지 못한다.

핵심 근거:

- [`episode/`](../../src/main/services/features/memory/episode/)
- [`temporal/`](../../src/main/services/features/memory/temporal/)
- [`query/internal/plan.ts`](../../src/main/services/features/memory/query/internal/plan.ts)
- [`query/internal/temporal.ts`](../../src/main/services/features/memory/query/internal/temporal.ts)

### 검색과 RAG

- lexical + vector 검색과 intent/temporal routing이 존재한다.
- raw chunk evidence를 RAG Layer 3에 제공하므로 원문 인용의 기반은 있다.
- 그러나 선택 회차 경계가 narrative-memory 일부에만 전달되고, 전체 chapter summary와 raw chunk 후보에는 일관되게 강제되지 않는다. 현재 상태에서는 미래 회차 누출 가능성이 남는다.
- live graph expansion과 live reranker는 없다. 일부 검색 최적화는 benchmark 경로에만 있다.
- 따라서 **임베딩 단독 검색 결과를 사실로 취급하지 않고 lexical, metadata filter, graph/temporal filter, evidence 검증을 결합**해야 한다.

핵심 근거:

- [`rag/contextAssembler.ts`](../../src/main/services/features/rag/contextAssembler.ts)
- [`rag/internal/`](../../src/main/services/features/rag/internal/)
- [`memory/query/`](../../src/main/services/features/memory/query/)

### Utility process와 BGE-M3

- renderer는 Node/Electron에 직접 접근하지 않고 preload IPC를 거쳐 main/utility 경계를 사용한다.
- 로컬 임베딩은 생성 모델과 분리된 `llama-server` sidecar다.
- 모델은 `gpustack/bge-m3-GGUF/bge-m3-Q4_K_M.gguf`, 1024차원, 437,778,496 bytes로 고정돼 있다.
- 모델 파일은 build 시 staging하고 git에는 넣지 않는다.
- 현재 utility 기본값은 CPU, 4 threads, context 8192, **mean pooling**이다.
- BAAI 원본 pooling 설정은 **CLS=true, mean=false**다. 2026-08-27 실측에서도 CLS가 전체적으로 우세해 mean은 유지 근거가 부족하다.
- 현재 sidecar는 physical batch를 명시하지 않는다. 기본 인자에서 1,000자 영문은 성공했지만 한글과 일본어는 HTTP 500이 재현됐다. `--ubatch-size 2048`에서는 세 언어 모두 성공했다.

핵심 근거:

- [`utility/llm/embeddingModelConstants.ts`](../../src/main/utility/llm/embeddingModelConstants.ts)
- [`utility/llm/sidecarSupervisor.ts`](../../src/main/utility/llm/sidecarSupervisor.ts)
- [`services/features/llm/embeddingModelConstants.ts`](../../src/main/services/features/llm/embeddingModelConstants.ts)
- [`stage-embedding-model.mjs`](../../scripts/stage-embedding-model.mjs)

## `webnovel-writer`와의 정밀 차이

| 영역      | Luie                                      | `webnovel-writer`                                     | 결정                                          |
| --------- | ----------------------------------------- | ----------------------------------------------------- | --------------------------------------------- |
| 정본      | DB transaction, revision, derived jobs    | commit accepted/rejected + projection log/status      | Luie 유지, projection health 개념만 재구현    |
| 원문 보존 | raw chunk + hash + offset                 | scene summary를 vector text로 우선 사용하는 경로 존재 | Luie 방식 유지                                |
| 검색      | lexical + vector + temporal intent        | vector + BM25 + graph expansion + reranker            | graph expansion/reranker 아이디어만 독자 구현 |
| 관계      | relation/character/knowledge state 스키마 | graph retrieval이 실검색에 더 직접 연결               | Luie graph 조회를 live retrieval에 연결       |
| 시간 경계 | 일부 temporal filter, 전역 강제 미완성    | `from_chapter` 무시 및 semantic/episodic 미래 누출    | 양쪽 모두 보완 필요                           |
| 다국어    | BGE-M3 기반, deterministic 한국어 중심    | router/BM25가 중국어 중심                             | 한·영·일 tokenizer/router 검증 필요           |
| 운영 상태 | revision/job/canonical sync               | projection status/log/replay가 명시적                 | 기존 job/revision 위에 상태를 노출            |
| 모델      | 로컬 BGE-M3 GGUF                          | hosted Qwen/Jina 기본값                               | local-first 유지, 서버는 선택형 강화          |
| 라이선스  | Luie 정책                                 | GPL-3.0                                               | 코드를 복사하지 않고 개념만 clean-room 재구현 |

`webnovel-writer`의 강점은 commit 이후 projection 성공/실패를 명시적으로 다루는 운영 모델, graph expansion, reranker다. 약점은 중국어 중심 router/tokenizer, 회차 범위 누출, scene summary 중심 semantic text, JSON scratchpad, hosted model 의존이다. Luie를 교체하지 않는다.

## 채택 아키텍처

```text
TXT / EPUB / DB / permitted API
  → canonical source + revision
  → episode / scene segmentation
  → paragraph-aware raw chunks + offsets + hashes
  → derived-job queue
      ├─ BGE-M3 dense embedding
      ├─ lexical index
      ├─ entity + alias + mentions
      ├─ relation / state / knowledge facts
      ├─ episode + event causality
      └─ hierarchical summaries

query
  → language + intent + selected chapter + worldline scope
  → lexical ∪ dense ∪ graph ∪ temporal candidates
  → optional reranker
  → exact raw evidence verification
  → answer with source pointers
```

상용 서버 강화는 **재랭킹 또는 재임베딩 가능한 별도 index**로만 추가한다. 서버 장애나 구독 해지 시에도 로컬 lexical + BGE-M3 + 정본 DB가 계속 동작해야 한다.

## BGE-M3 2026-08-27 실측

### 고정 조건

| 항목                | 값                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| 플랫폼              | macOS arm64                                                                                    |
| 모델                | `bge-m3-Q4_K_M.gguf`                                                                           |
| 모델 SHA-256        | `6d39681b26c61279ac1f82db35a04a05009e94c415b51c858ff571489a82fc06`                             |
| llama.cpp           | build `b5620`                                                                                  |
| runtime ZIP SHA-256 | `aaaddc5f4a7ecf66ccb7501ed3a1980223c5bb72c17c9c2ffc3d8cdaff44699c`                             |
| 실행                | CPU, 4 threads, context 8192, GPU layers 0                                                     |
| 출력                | 1024 dimensions                                                                                |
| benchmark           | 480자 chunk, 한·영·일 자연어 질의                                                              |
| 현대 연재 스크립트  | [`benchmark-bge-m3-modern-webserial.mjs`](../../scripts/benchmark-bge-m3-modern-webserial.mjs) |
| 고전 호환 스크립트  | [`benchmark-bge-m3-public-domain.mjs`](../../scripts/benchmark-bge-m3-public-domain.mjs)       |

이 benchmark는 모델 간 대규모 순위를 확정하는 시험이 아니라 Luie runtime 호환성과 한·영·일 기본 검색 가능성을 확인하는 smoke benchmark다. 인물 50명·100화 전체의 관계 정확도를 대표하지 않는다.

### 현대 웹 연재 결과 — 1차 기준

2015년부터 연재된 qntm의 SCP 《Antimemetics Division》 첫 완결부 5편을 영어 원문, 한국어 공식 번역, 일본어 공식 번역으로 맞췄다. 기억 소거, 동일 인물의 상태 변화, 연속 사건이 중심인 현대 SF·판타지·호러 웹 연작이다. 각 언어에서 동일 사건을 묻는 5개 질의로 올바른 회차의 첫 청크 순위를 측정했다.

| 언어   | 본문 문자 | 청크 | CLS R@1 | CLS R@5 | CLS MRR |
| ------ | --------: | ---: | ------: | ------: | ------: |
| 영어   |    95,756 |  225 |     60% |    100% |   0.740 |
| 한국어 |    51,514 |  121 |     40% |    100% |   0.617 |
| 일본어 |    44,084 |  105 |     40% |    100% |   0.633 |

- 세 언어 모두 올바른 회차가 top 5 안에는 들어왔다.
- R@1은 40~60%에 불과했다. 서로 인과적으로 이어진 후반 회차는 adjacent episode를 1위로 혼동했다.
- 따라서 BGE-M3는 **후보 생성기로는 유효하지만 최종 사실 판정기로는 부족**하다. 회차/시간 metadata, entity graph, reranker가 필요하다.
- benchmark 직후 RSS는 약 544MiB였다.

### 고전 장편 호환성 결과 — 2차 기준

다음 수치는 pooling과 장문·고유명사 호환성 비교용이다. 현대 웹소설 제품 정확도의 근거로 사용하지 않는다.

| 언어   | CLS R@1 | CLS R@5 | CLS MRR | mean R@1 | mean R@5 | mean MRR |
| ------ | ------: | ------: | ------: | -------: | -------: | -------: |
| 영어   |   16.7% |   16.7% |   0.236 |    16.7% |    16.7% |    0.236 |
| 한국어 |   33.3% |   66.7% |   0.484 |    33.3% |    50.0% |    0.448 |
| 일본어 |   50.0% |   83.3% |   0.644 |    50.0% |    83.3% |    0.617 |

- CLS 총 실행시간 36.3초, mean 35.9초로 차이는 미미했다.
- benchmark 직후 RSS는 CLS 약 548MiB, mean 약 559MiB였다. 상시 4~6GiB가 아니라 **활성 sidecar 약 0.5~0.6GiB** 수준이며 idle shutdown 대상이다.
- 고전 영어 점수는 이 작은 heuristic set에서도 낮았다. 번역체·고어까지 dense-only 검색에 맡기면 안 된다는 증거다.
- CLS가 한국어 Recall@5와 한·일 MRR에서 우세하고 공식 설정과 일치하므로 목표값은 CLS다.
- 1,000자 한·일 입력은 기본 physical batch에서 실패했다. `--ubatch-size 2048` 적용 시 영·한·일 모두 1024차원 응답에 성공했다.

## 검증 코퍼스와 권리

### 현대 웹 연재 — 1차 기준

| 언어   | 작품                            | 범위/출처                                                                               | 권리 판단                      |
| ------ | ------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------ |
| 영어   | qntm, 《Antimemetics Division》 | [영어 원문 허브](https://scp-wiki.wikidot.com/antimemetics-division-hub), 첫 완결부 5편 | 페이지별 CC BY-SA 3.0          |
| 한국어 | 《항밈학과 같은 건 없다》       | [한국어 공식 번역 허브](https://scpko.wikidot.com/antimemetics-division-hub), 대응 5편  | 원저자·역자 표시, CC BY-SA 3.0 |
| 일본어 | 《反ミーム部門は存在しない》    | [일본어 공식 번역 허브](https://scp-jp.wikidot.com/antimemetics-division-hub), 대응 5편 | 원저자·역자 표시, CC BY-SA 3.0 |

세 판본은 동일한 현대 연작을 서로 다른 언어로 비교할 수 있다는 장점이 있다. 다만 5편 smoke set이므로 장편 narrative acceptance를 대표하지 않는다. 신규 acceptance는 benchmark SSOT의 S(20화 이하)부터 단계적으로 구축한다. 기존 120화 synthetic corpus는 반복·대용량 stress/noise fixture로만 사용한다.

### 고전 장편 — runtime 호환성 보조

| 언어   | 작품                                         | 범위/출처                                                                   | 권리 판단                                                                        |
| ------ | -------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 영어   | Alexandre Dumas, _The Count of Monte Cristo_ | [Project Gutenberg #1184](https://www.gutenberg.org/ebooks/1184), 117장     | 해당 판본 페이지가 미국 퍼블릭 도메인으로 표시. 미국 밖 사용은 현지 법 확인 필요 |
| 한국어 | 이광수, 《무정》                             | [한국어 위키문헌](https://ko.wikisource.org/wiki/%EB%AC%B4%EC%A0%95), 126장 | 저자 1950년 사망. 2013년 연장 시행 전 기존 50년 보호기간이 이미 만료된 저작물    |
| 일본어 | 夏目漱石, 《吾輩は猫である》                 | [青空文庫 No.789](https://www.aozora.gr.jp/cards/000148/card789.html), 전편 | 저자 1916년 사망, 아오조라 문고 권리소멸 공개본                                  |

권리 기준 근거:

- [한국저작권위원회: 1962년 사망 저작자의 보호기간은 2012-12-31 종료](https://www.copyright.or.kr/business/counsel/auto-advice-service/practice/detail.do?categorySeq=0&categoryType=&counselSeq=3192&parCategorySeq=)
- [Project Gutenberg Permission How-to](https://www.gutenberg.org/policy/permission)
- [青空文庫 파일 이용 안내](https://www.aozora.gr.jp/guide/aozora_hayawakari6.pdf)

원문과 모델은 git에 넣지 않는다. 현대 연작은 gitignored `tests/.tmp/bge-modern-webserial/`, 고전 호환 corpus는 `tests/.tmp/bge-public-domain-corpus/`, 모델은 `resources/models/`에 있다. 현대 연작 JSON은 source URL, 저자/역자 attribution 안내, CC BY-SA 3.0 표시를 함께 보존한다. 고전 corpus 재현성은 URL, 판본 식별자, SHA-256으로 확보한다. 2026-08-27 내려받은 영어 TXT SHA-256은 `64f8d5cfa51fcecb904abf7312d395d512a71817e7359b91288beb50517c3836`, 일본어 ZIP은 `6545750b89ee2c57f215a65079eeab56ee7c997373b7b86e5b00ae74fe69208f`다.

## 확정 결정

1. 로컬 기본 임베딩은 BGE-M3 Q4_K_M을 유지한다.
2. pooling 목표값은 CLS다. 코드 변경은 regression test와 함께 수행한다.
3. physical batch 2048을 P0 후보로 검증·적용한다.
4. raw source/evidence가 정본이며, embedding/summary/graph는 projection이다.
5. 장편 정확도는 dense-only가 아니라 lexical + dense + graph + temporal + rerank 조합으로 달성한다.
6. 서버 구독은 선택형 고성능 reranker/embedding tier로 제공할 수 있지만 local-first fallback을 제거하지 않는다.
7. Retrieval benchmark와 RAG reasoning benchmark를 분리하고 reasoning은 oracle/end-to-end를 모두 실행한다.
8. 신규 synthetic corpus는 S(20화 이하)부터 gate를 통과한 뒤에만 확장한다.
9. 기존 120화 corpus는 정식 gold가 아니라 legacy stress/noise fixture다.
10. `webnovel-writer` 코드는 GPL-3.0이므로 복사하지 않는다.

## 아직 사실로 주장하면 안 되는 것

- 현재 Luie가 100화·50명·복수 세계선의 관계를 무손실로 자동 추적한다.
- BGE-M3 하나만으로 관계, 인과, 시간 상태를 정확히 복원한다.
- scene 단위 ingestion과 `worldline_id`가 이미 구현됐다.
- episode/entity/temporal projection이 기본 설정에서 항상 자동 실행된다.
- 현재 RAG가 선택 회차 이후 원문을 모든 layer에서 차단한다.

이 항목들은 실행 계획의 acceptance gate를 통과한 뒤에만 문서 상태를 변경한다.
