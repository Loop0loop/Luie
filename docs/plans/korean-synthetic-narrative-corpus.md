# 한국어 장편 Narrative Memory Synthetic Corpus — Legacy Fixture

> 상태: **정식 acceptance에서 제외 / legacy stress·noise fixture**  
> 기준일: 2026-08-27  
> 상위 기준: [Narrative RAG Benchmark SSOT](../architecture/narrative-rag-benchmark-ssot.md)  
> 관련 실행 계획: [Narrative Memory · RAG 실행 계획](./narrative-memory-rag-plan.md)

> [!IMPORTANT]
> 이 문서의 120화·60명·150 query 명세는 현재 신규 데이터 생성 목표가 아니다. 아래 내용은 `luie-korean-narrative-gold-120-v1`이 어떻게 만들어졌는지 보존하는 역사적 명세다. 이 corpus는 반복 문장과 직접 fact 노출이 많아 `legacy_stress_noise_fixture`로만 사용한다. 구조 validator 통과는 narrative benchmark 품질 통과를 뜻하지 않는다.

## 현재 지위

- 정식 Narrative RAG acceptance: **사용 금지**
- 제품 정확도 threshold 확정: **사용 금지**
- 장르 지원 근거: **사용 금지**
- 허용 용도: 대용량 ingestion, offset/hash, 재현성, 반복 noise 검색, 성능·메모리 stress regression
- 기본 데이터 품질: `NOISE` 또는 사람 미분류
- 신규 원고 생성: **중지**

새 corpus는 20화 이하 S 단계부터 시작하며, Retrieval benchmark와 RAG reasoning benchmark를 분리한다. 규모와 장르 확장 조건은 새 benchmark SSOT만 따른다.

## 역사적 목적

Luie가 직접 통제할 수 있는 한국어 장편 웹소설 정본과 구조화된 gold를 만든다. 외부 상업 웹소설이나 팬 번역을 복제하지 않고, 회차·시간·관계·지식 상태·세계선 경계를 자동 검증할 수 있는 재현 가능한 corpus를 제공한다.

이 corpus는 실제 작가 beta를 대체하지 않는다. 현재는 synthetic acceptance에서도 제외하며 legacy stress/noise 회귀 테스트에만 사용한다. 제품 정확도 임계값이나 장르 지원 근거로 사용할 수 없다.

## 고정 식별자

- corpus ID: `luie-korean-narrative-gold-120-v1`
- 작품명: `잔향도시의 세 번째 기록`
- 생성 seed: `luie-korean-narrative-gold-120-v1`
- 언어: `ko-KR`
- dataset kind: `legacy_stress_noise_fixture`
- 정본 회차 수: 120
- 목표 회차 길이: 공백 포함 4,500~6,500자
- 등장인물 수: 60
- continuity 수: 3
- gold query 수: 120개 이상

## 권리와 사용 경계

1. 원고, 인물, 설정, 사건, 질문, 정답은 이 프로젝트를 위해 새로 생성한다.
2. 외부 웹소설 본문, 번역문, 인물명, 고유 설정, 장면 배열을 입력이나 템플릿으로 사용하지 않는다.
3. 장르 관습과 일반적인 한국어 문법만 사용한다.
4. corpus에는 생성 방식, seed, 생성기 버전, 파일 hash를 보존한다.
5. `ParallelFiction-Ja_En-100k`는 이 corpus 생성 입력으로 사용하지 않는다.
6. 사람 검수 전 manifest는 `humanReviewStatus=unreviewed`, `canFinalizeProductThresholds=false`를 유지한다.
7. 실제 작가 beta provenance와 합치지 않는다.

## 이야기 구조

### 핵심 전제

기록감응사 한세연은 재난 이후의 명월시에서 사람과 사물에 남은 `잔향 기록`을 읽는다. 잔향은 사실의 복사본이 아니라 관측자의 기억과 세계선에 종속된 흔적이다. 세연과 조사팀은 도시 중앙의 `백야 관측소` 붕괴 원인을 추적하면서, 같은 인물의 생존·사망·동맹·연애·비밀 인지 상태가 세계선마다 달라지는 사건을 겪는다.

### continuity

| ID | 회차 | 의미 |
| --- | ---: | --- |
| `prime` | 1~60 | 최초 진행 세계선 |
| `return` | 61~90, 106~120 | 60화 사건 뒤 18화 시점에서 분기한 회귀 세계선 |
| `if` | 91~105 | 40화의 선택이 반대였던 제한적 IF 관측 세계선 |

- `return`의 parent는 `prime`, divergence chapter는 18이다.
- `if`의 parent는 `prime`, divergence chapter는 40이다.
- 세계선 병합은 자동 사실로 취급하지 않는다.
- 106화 이후는 `return`이며, `if`에서 얻은 정보는 명시적 전달 사건이 있을 때만 `return` 인물 지식이 된다.

### 시간 표현

각 scene은 다음 두 시간을 분리한다.

- `narrativeChapter`: 독자가 장면을 읽는 회차
- `eventTime`: 세계 안에서 사건이 발생한 상대 시점

장면 종류는 `present`, `flashback`, `forecast`, `recording`, `if_observation` 중 하나다. 예고와 추정은 현재 사실로 승격하지 않는다.

## 등장인물과 관계

- 핵심 인물 12명, 조연 48명으로 총 60명을 생성한다.
- 모든 인물은 안정적인 `characterId`, 본명, 1개 이상의 alias, 소속, 역할을 가진다.
- 동명이인 2쌍과 동일 인물의 직함 변화 4건 이상을 포함한다.
- 관계 type은 30개 이상을 사용한다.
- relation state는 `continuityId`, `validFromChapter`, `validToChapter`, `status`, `evidenceIds`를 가진다.
- 연애 감정, 공식 연인, 정치 동맹은 서로 다른 관계로 저장한다.
- 가족, 사제, 적대, 비밀동맹, 채무, 감시, 기억조작 의심을 포함한다.

## 디렉터리

```text
novel/narrative_memory_gold_120/
  README.md
  corpus_manifest.json
  rights.json
  manuscript/
    chapter_001.txt ... chapter_120.txt
  structure/
    chapters.jsonl
    scenes.jsonl
    characters.jsonl
    continuities.json
    relations.jsonl
    facts.jsonl
  gold/
    queries.jsonl
    answers.jsonl
    evidence.jsonl
  reports/
    validation-report.json
```

`manuscript/`가 원문 정본이다. `structure/`, `gold/`, `reports/`는 모두 생성기로 재구축 가능한 파생 데이터다.

## 핵심 schema

### chapters.jsonl

```json
{
  "chapterId": "chapter-001",
  "chapterNumber": 1,
  "title": "첫 번째 제목",
  "continuityId": "prime",
  "relativePath": "manuscript/chapter_001.txt",
  "charCount": 5000,
  "sha256": "...",
  "sceneIds": ["scene-001-01"]
}
```

### scenes.jsonl

```json
{
  "sceneId": "scene-001-01",
  "chapterId": "chapter-001",
  "sceneOrder": 1,
  "continuityId": "prime",
  "mode": "present",
  "eventTime": "prime-day-001-morning",
  "locationId": "location-archive",
  "participantIds": ["char-001"],
  "startOffset": 0,
  "endOffset": 500,
  "sha256": "..."
}
```

offset은 UTF-16 code unit이 아니라 UTF-8로 읽은 JavaScript 문자열의 code-point 기준으로 생성·검증한다. 소비자가 다른 offset 체계를 사용할 수 있으므로 evidence에는 exact quote와 chapter hash를 함께 둔다.

### facts.jsonl

```json
{
  "factId": "fact-001-01",
  "factType": "knowledge_state",
  "subjectId": "char-001",
  "predicate": "knows",
  "objectId": "secret-observatory-key",
  "continuityId": "prime",
  "status": "confirmed",
  "validFromChapter": 1,
  "validToChapter": null,
  "evidenceIds": ["evidence-001"]
}
```

### queries.jsonl

```json
{
  "queryId": "query-001",
  "taskType": "worldline_isolation",
  "question": "return 세계선 70화 시점에 윤해준은 살아 있는가?",
  "continuityId": "return",
  "allowedUntilChapter": 70,
  "includeFuture": false,
  "expectedFactIds": ["fact-070-01"],
  "forbiddenEvidenceAfterChapter": 70,
  "forbiddenContinuityIds": ["prime", "if"]
}
```

### evidence.jsonl

```json
{
  "evidenceId": "evidence-001",
  "queryId": "query-001",
  "chapterId": "chapter-070",
  "sceneId": "scene-070-03",
  "continuityId": "return",
  "quote": "정확한 원문 인용",
  "startOffset": 1200,
  "endOffset": 1210,
  "chapterSha256": "..."
}
```

## gold taxonomy

최소 120개 query가 아래 유형을 균등하게 포함한다.

1. `fact_recall`
2. `relationship_state`
3. `knowledge_state`
4. `event_causality`
5. `temporal_order`
6. `worldline_isolation`
7. `future_leakage_guard`
8. `alias_disambiguation`
9. `forecast_status`
10. `draft_canon_conflict`

각 query는 허용 회차, continuity, expected fact, exact evidence, 금지 미래/세계선을 가진다.

## 생성 전략

1. seed 기반 PRNG로 선택 순서를 고정한다.
2. 인물·세계선·사건·관계 blueprint를 먼저 생성한다.
3. blueprint에서 120화 × 8개 scene을 생성한다.
4. 각 scene에 구조 fact를 직접 표현하는 고유한 자연어 문장을 최소 1개 포함한다.
5. 감각 묘사·행동·대화·내적 판단을 조합해 목표 분량을 채운다.
6. 생성된 원고에서 quote와 offset을 다시 추출해 evidence를 만든다.
7. 원고 hash가 바뀌면 validator가 파생 데이터 불일치를 실패시킨다.
8. 같은 seed와 generator version은 byte-identical output을 만들어야 한다.

템플릿 반복이 retrieval을 과도하게 쉽게 만들 수 있으므로 생성기는 문단 변형과 distractor를 포함한다. 다만 자동 생성 v1은 사람 검수 전까지 `bootstrap` 품질로 표시한다.

## 자동 검증

- 회차 파일 120개 및 1~120 연속 번호
- 회차당 4,500~6,500자
- 인물 60명, continuity 3개, 관계 type 30개 이상
- scene offset/hash와 원문 일치
- chapter hash와 manifest 일치
- query 120개 이상 및 taxonomy별 최소 10개
- evidence quote와 offset 일치
- evidence chapter가 `allowedUntilChapter`를 초과하지 않음
- evidence continuity가 query scope와 일치
- 금지 continuity가 gold evidence에 포함되지 않음
- 미래 누출 guard query 존재
- 외부 corpus 경로·URL·작품명이 생성 입력에 없음
- 재생성 후 byte-identical hash

## 사람 검수 게이트

자동 검증 통과는 구조적 gold의 일관성만 뜻한다. 다음 항목은 별도 사람 검수 전까지 미완료다.

- 120화 전체의 자연스러운 문체와 장면 중복
- 관계 변화의 개연성
- 질문이 실제 작가 질문처럼 읽히는지
- 정답이 다른 해석을 부당하게 배제하지 않는지
- 특정 상업 작품과 우연히 유사한 고유 표현이 없는지

사람 검수 완료 전 고정값:

```json
{
  "humanReviewStatus": "unreviewed",
  "canFinalizeProductThresholds": false,
  "canReplaceRealWriterBeta": false
}
```
