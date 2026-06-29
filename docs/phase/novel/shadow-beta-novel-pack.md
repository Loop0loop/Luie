# Phase 7 Shadow Beta Novel Pack v1

이 문서는 실제 작가 베타 데이터가 들어오기 전, Phase 7 writer task benchmark와 feedback loop를 리허설하기 위한 합성 장편 데이터셋 설계를 고정한다.

이 데이터는 **실제 beta 데이터가 아니다**. 제품 threshold finalization 근거로 쓰면 안 된다.

판정:

```text
Phase 7 rehearsal dataset으로는 적합하다.
실제 beta threshold 대체용으로는 사용할 수 없다.
목표는 가짜 소설 데이터가 아니라 가짜 작가 작업실 데이터다.
```

## 목적

목표는 좋은 소설 샘플을 만드는 것이 아니다.

목표는 웹소설 작가가 실제 작업 중 겪는 아래 문제를 Luie가 처리하는지 검증하는 것이다.

- 설정 확인
- 인물 관계 확인
- 떡밥 회수 여부 확인
- 회차 기준 지식 상태 확인
- 초안/정사 충돌 확인
- 폐기 설정 차단
- 수정 후 evidence link 복구
- 근거 없는 확정 답변 방지
- 작가가 애매하게 던지는 raw 질문 해석
- 작가의 보류/확정/폐기 의사결정 흐름 추적

## 적합성 범위

| 용도 | 판정 |
| --- | --- |
| Phase 7 writer workflow rehearsal | 가능 |
| Memory Engine 기능 검증 | 가능 |
| 실제 작가 사고흐름 완전 재현 | 불가 |
| 실제 beta threshold 대체 | 불가 |
| 제품 readiness 판정 | 불가 |

## 판정 규칙

Shadow beta novel pack은 Phase 7 완료 판정에 사용할 수 없다.

모든 manifest는 아래 값을 가져야 한다.

```json
{
  "datasetKind": "shadow_beta",
  "realBetaConfirmed": false,
  "canFinalizeThresholds": false
}
```

허용 run label:

```text
shadow-beta:modern_fantasy:run-001
shadow-beta:romance_fantasy:run-001
shadow-beta:murim:run-001
shadow-beta:occult_mystery:run-001
```

실제 Phase 7 threshold finalization은 실제 작가 데이터가 들어온 뒤에만 허용한다.

```text
real-beta:{writerHash}:{projectHash}:{runId}
```

## 디렉터리 구조

각 장르는 동일한 구조를 가진다.

```text
novel/{genre}/
  manuscript/
    {genre}_001.txt
    {genre}_002.txt
    {genre}_003.txt
    {genre}_004.txt
    {genre}_005.txt
  writer_room/
    canon_bible.md
    character_sheet.md
    relationship_sheet.md
    timeline.md
    foreshadowing_ledger.md
    draft_notes.md
    discarded_settings.md
    revision_log.md
    session_logs/
      session_001_planning.md
      session_002_after_chapter_002.md
      session_003_revision_after_chapter_004.md
    author_decision_log.md
    uncertainty_log.md
  eval/
    writer_questions.jsonl
    author_questions_raw.jsonl
    gold_answers.jsonl
    gold_evidence.jsonl
    feedback_seed.jsonl
    rejected_answer_cases.jsonl
    benchmark_manifest.json
    dataset_quality_report.json
```

## 장르 범위

1차 shadow beta는 4개 장르를 만든다.

| Genre | 목적 |
| --- | --- |
| `modern_fantasy` | 직업/시스템 규칙, 미래 정보 누수, 표절/권리 리스크 |
| `romance_fantasy` | 신분/가문/계약 조건, 문서 조작, 감정선과 정치 동맹 구분 |
| `murim` | 문파 서열, 무공 단계, 전생 지식 누수, 배신자 오판 |
| `occult_mystery` | 초자연 규칙, 현실 공범, 사건 시간표, 확정/추정 구분 |

## 생성 원칙

- 기존 상업 웹소설, 공개 플랫폼 인기작, `novel/face` 원문을 복제하지 않는다.
- 특정 작가의 문체, 인물명, 고유 시스템명, 사건 배열, 대사, 장면 구성을 모방하지 않는다.
- 장르 관습은 참고하되 고유명사와 핵심 장치는 새로 만든다.
- 원고 파일은 독자용 원고처럼 자연스럽게 쓴다.
- 검증용 메타 정보는 원고 안에 노골적으로 넣지 않는다.
- 정답, 폐기 설정, 회차별 지식 상태, 피드백 seed는 `writer_room/` 또는 `eval/`에 분리한다.
- 각 작품에는 정사 설정, 초안 설정, 폐기 설정, 모호한 암시, 회차별 정보 제한이 모두 있어야 한다.
- 각 작품에는 작가의 계획, 수정 불안, 보류 결정, 애매한 질문 흔적이 있어야 한다.
- 질문은 시험지처럼 정돈된 질문만 만들지 않는다. clean/writer-like/messy 변형을 함께 둔다.

## 1차 분량

| 단계 | 분량 | 목적 |
| --- | ---: | --- |
| 1차 | 장르당 5화 | pipeline smoke, taxonomy coverage 확인 |
| 2차 | 장르당 15화 | Phase 7 rehearsal 확대 |
| 3차 | 1개 장르 100화 dummy | 장편 stress 및 chunk scale 확인 |

이번 문서의 생성 대상은 1차 5화다.

## 파일별 역할

### manuscript

독자용 원고만 둔다.

원고는 자연스러운 웹소설 회차처럼 작성한다.

금지:

- `정사:`
- `폐기 설정:`
- `eval evidence:`
- `이 장면은 테스트용`

### canon_bible.md

정사 설정만 적는다.

필수 항목:

- 세계관 규칙
- 핵심 장치의 한계
- 확정된 사건
- 아직 확정되지 않은 암시
- 회차별 공개 제한

### character_sheet.md

인물별 본명, 별칭, 직함, 소속, 알고 있는 정보, 모르는 정보를 적는다.

필수 항목:

- 본명
- 별칭
- 직함 변화
- 회차별 지식 상태
- 다른 인물과의 관계

### relationship_sheet.md

관계 방향을 명시한다.

예:

- A는 B를 의심한다.
- B는 A의 비밀을 모른다.
- C는 D를 보호하지만, D는 이를 협박으로 오해한다.

관계 변화는 회차별로 기록한다.

### timeline.md

회차별 사건과 지식 공개 상태를 기록한다.

각 회차는 아래 형식을 따른다.

```md
## 3화

- 공개된 사실:
- 아직 비공개:
- 독자만 아는 정보:
- 인물별 지식 상태:
- 다음 회차로 넘긴 떡밥:
```

### foreshadowing_ledger.md

떡밥을 추적한다.

필수 상태:

- `seeded`
- `reinforced`
- `resolved`
- `discarded`
- `ambiguous`

### draft_notes.md

초기 구상과 변경 전 아이디어를 기록한다.

초안은 정사가 아니다.

### discarded_settings.md

폐기 설정을 기록한다.

Luie는 이 파일의 내용을 정사 답변에 섞으면 안 된다.

### revision_log.md

작가가 원고를 수정한 흔적을 기록한다.

필수 항목:

- 수정 대상 회차
- 수정 전 설정
- 수정 후 정사
- 영향받는 evidence
- 재연결 또는 backlog 필요 여부

### session_logs/

작가가 특정 집필 시점에 어떤 생각을 했는지 기록한다.

필수 세션:

- `session_001_planning.md`: 1화 작성 전 기획
- `session_002_after_chapter_002.md`: 2화 작성 후 설정 과밀/혼란
- `session_003_revision_after_chapter_004.md`: 4화 작성 후 수정 공포와 폐기 설정 정리

세션 로그는 정리된 설정집이 아니라 작가의 작업 메모처럼 쓴다.

포함해야 할 것:

- 아직 확정하지 않은 설정
- 나중에 회수할 수도 있는 떡밥
- 작가가 스스로 헷갈리는 지점
- 폐기했지만 원고 잔재가 남은 설정
- Luie에게 물어볼 법한 자연어 질문

### author_decision_log.md

작가가 설정을 확정, 폐기, 보류한 이유를 기록한다.

필수 상태:

- `confirmed`
- `discarded`
- `deferred`
- `changed`

예:

```md
## decision-004

- stage: after_chapter_004
- topic: 남주 회귀자 설정
- decision: discarded
- reason: 기록 조작 사건 생존자로 바꾸는 편이 문서고 플롯과 맞음
- affectedFiles:
  - manuscript/romance_fantasy_003.txt
  - writer_room/discarded_settings.md
```

### uncertainty_log.md

아직 정하지 않은 설정과 작가가 일부러 남긴 모호함을 기록한다.

Luie는 이 내용을 확정 사실처럼 답하면 안 된다.

예:

```md
## uncertainty-002

- topic: 청운문 몰락 원인
- currentStatus: 내부 배신 암시만 있음
- notYetConfirmed: 배신자 이름, 외부 세력 개입 여부
- safeAnswer: 5화 기준 확정되지 않았다.
```

## Eval 파일 계약

### writer_questions.jsonl

각 장르마다 최소 50개 질문을 만든다.

분포:

| Task Type | Count |
| --- | ---: |
| `setting_check` | 10 |
| `relationship_check` | 10 |
| `foreshadowing_status` | 10 |
| `chapter_knowledge_state` | 10 |
| `draft_canon_conflict` | 10 |

질문 문체 분포:

| Question Form | Count | 목적 |
| --- | ---: | --- |
| `clean` | 20 | 자동 채점 안정성 |
| `writer_like` | 20 | 실제 작가 질의 재현 |
| `messy` | 10 | 근거 없는 확정 답변 방지 |

필드:

```json
{
  "id": "modern_fantasy.chapter_knowledge_state.003",
  "genre": "modern_fantasy",
  "taskType": "chapter_knowledge_state",
  "questionClean": "3화 시점에서 윤태오는 미래 반응률 메모 앱의 존재를 알고 있나?",
  "questionWriterLike": "태오 얘 3화쯤엔 앱 모르는 상태였지?",
  "questionMessy": "태오가 앱 눈치챈 거 몇 화였더라? 3화에서 말해도 되나?",
  "allowedUntilChapter": 3,
  "sourceType": "manuscript",
  "falseConfidenceTrap": "5화 이후 정보를 당겨 말하면 안 된다.",
  "notes": "현재 회차 기준 지식 상태 확인"
}
```

### author_questions_raw.jsonl

실제 작가처럼 애매하게 던지는 질문을 둔다.

`writer_questions.jsonl`이 채점용 질문이라면, `author_questions_raw.jsonl`은 입력 품질이 낮은 작가 질문을 재현한다.

각 장르마다 최소 30개를 만든다.

필드:

```json
{
  "id": "modern_fantasy.raw.014",
  "stage": "after_chapter_003",
  "rawQuestion": "도윤 표절범으로 박아도 되나? 아니면 아직 의심만?",
  "hiddenIntent": "확정/추정 구분",
  "mappedTaskType": "setting_check",
  "expectedEngineBehavior": "표절은 확정이 아니라 리스크 신호라고 답해야 한다.",
  "expectedEvidenceIds": ["modern_fantasy.setting_check.004"]
}
```

### gold_answers.jsonl

질문별 기대 답변을 둔다.

필드:

```json
{
  "id": "modern_fantasy.chapter_knowledge_state.003",
  "expectedAnswer": "아니다. 3화 시점에서 윤태오는 앱의 존재를 모른다.",
  "answerStatus": "supported",
  "mustMention": ["3화 시점", "윤태오는 모른다"],
  "mustNotMention": ["5화에서 알게 된다", "앱이 원고를 대신 쓴다"]
}
```

### gold_evidence.jsonl

답변을 지지하는 원문 quote를 둔다.

필드:

```json
{
  "id": "modern_fantasy.chapter_knowledge_state.003",
  "goldEvidence": [
    {
      "chapter": 3,
      "file": "manuscript/modern_fantasy_003.txt",
      "quote": "윤태오는 은재가 휴대폰을 숨기는 이유를 아직 몰랐다."
    }
  ],
  "mustNotUseAfterChapter": 3
}
```

### feedback_seed.jsonl

각 장르마다 최소 10개 feedback seed를 만든다.

분포:

- `answer_wrong`: 6개
- `evidence_helpful`: 4개

`answer_wrong`에는 repeated rejected answer guard 검증을 위해 같은 질문/같은 오답 반복 케이스를 최소 2개 포함한다.

### rejected_answer_cases.jsonl

반복 차단해야 하는 오답을 둔다.

필드:

```json
{
  "id": "modern_fantasy.rejected.001",
  "questionId": "modern_fantasy.draft_canon_conflict.004",
  "question": "앱이 자동으로 원고를 써주나?",
  "rejectedAnswer": "앱은 원고를 자동으로 완성해준다.",
  "reason": "폐기 설정을 정사로 답변함",
  "expectedSafetyLabel": "blocked_p0",
  "expectedReason": "repeated_rejected_answer"
}
```

### benchmark_manifest.json

필수 필드:

```json
{
  "datasetKind": "shadow_beta",
  "realBetaConfirmed": false,
  "labelPrefix": "shadow-beta:modern_fantasy:",
  "canFinalizeThresholds": false,
  "purpose": "Phase 7 rehearsal only",
  "generatedAt": "2026-06-29",
  "generatorNotes": [],
  "copyrightPolicy": {
    "source": "synthetic",
    "copiesExistingCommercialText": false,
    "usesNovelFaceTextVerbatim": false,
    "notes": "Genre conventions only; all names, settings, and prose are newly generated."
  },
  "taxonomyCoverage": {
    "setting_check": 10,
    "relationship_check": 10,
    "foreshadowing_status": 10,
    "chapter_knowledge_state": 10,
    "draft_canon_conflict": 10
  },
  "authorFlowCoverage": {
    "sessionLogs": 3,
    "rawAuthorQuestions": 30,
    "decisionLogRequired": true,
    "uncertaintyLogRequired": true
  }
}
```

### dataset_quality_report.json

생성 후 데이터셋 자체를 검사한 결과를 둔다.

필수 gate:

```json
{
  "genre": "modern_fantasy",
  "passed": true,
  "checks": {
    "manifestDisallowsFinalization": true,
    "manuscriptHasNoMetaMarkers": true,
    "goldEvidenceQuotesExist": true,
    "goldAnswersSupportedByEvidence": true,
    "discardedSettingsNotInCanon": true,
    "questionFormsCovered": true,
    "rawQuestionsLookWriterLike": true,
    "chapterKnowledgeTrapsExist": true,
    "revisionLogAffectsEvidence": true,
    "rejectedAnswersBlockable": true
  }
}
```

## 장르별 설계

### modern_fantasy

주인공:

- 원고 품질 분석가 서은재

핵심 장치:

- 미래 반응률이 보이는 메모 앱

정사:

- 앱은 원고의 미래 반응률과 리스크 신호를 보여준다.
- 앱은 원고를 대신 쓰지 않는다.
- 미래 반응률은 구매 전환율과 다르다.
- 표절 의혹은 초반에는 확정이 아니라 리스크 신호다.

폐기 설정:

- 앱이 자동 집필한다.
- 도윤이 표절범으로 확정된다.
- 은재가 이미 모든 미래 매출을 정확히 안다.

필수 질문:

- 미래 반응률과 실제 구매 전환율 구분
- 표절 확정 여부
- 신인 작가를 살리는 개입의 근거
- 앱 기능의 한계

### romance_fantasy

주인공:

- 몰락한 기록관 가문의 딸 아멜리아

핵심 장치:

- 황궁 문서고와 90일 약혼 계약

정사:

- 약혼은 사랑이 아니라 문서 폐기 명령 유예를 위한 계약이다.
- 아멜리아는 황녀가 아니다.
- 문서 보관권 조작자는 초반에 확정되지 않는다.
- 남주는 회귀자가 아니라 기록 조작 사건의 생존자다.

폐기 설정:

- 아멜리아가 숨겨진 황녀다.
- 남주가 회귀자다.
- 약혼은 첫눈에 반한 연애 감정 때문이다.

필수 질문:

- 계약 조건 확인
- 신분/가문 관계
- 문서 보관권 조작 여부
- 감정선과 정치적 동맹 구분

### murim

주인공:

- 실패한 문파 개혁가가 말단 제자로 환생한 류진

핵심 장치:

- 낡은 수련법 수정과 약한 사제 훈련

정사:

- 류진의 전생 지식은 독자만 알고 주변 인물은 모른다.
- 백린은 배신자가 아니다.
- 청운문 몰락 원인은 초반에는 암시만 있다.
- 낡은 수련법의 결함은 회차별로 순차 공개된다.

폐기 설정:

- 백린이 배신자다.
- 류진이 3화에서 전생을 공개한다.
- 창고의 비급이 최강 무공이다.

필수 질문:

- 무공 단계
- 문파 서열
- 전생 지식 누수 여부
- 배신자 확정/암시 구분

### occult_mystery

주인공:

- 미제전담팀 기록보조관 한서윤

핵심 장치:

- 폐백화점 13층과 실종 사건

정사:

- 13층은 상시 존재하지 않고 특정 조건에서만 나타난다.
- 모든 사건이 초자연 때문은 아니다.
- 현실 공범은 초반에 확정되지 않는다.
- 초자연 규칙과 현실 범행이 동시에 작동한다.

폐기 설정:

- 거울을 보면 무조건 죽는다.
- 모든 실종은 귀신 하나의 소행이다.
- 13층은 실제 건축 도면에 존재한다.

필수 질문:

- 초자연 규칙 확인
- 현실 공범 여부
- 실종 시간표
- 목격 진술 모순
- 확정/추정 구분

## 생성 순서

1. 장르별 `canon_bible.md` 생성
2. `character_sheet.md`, `relationship_sheet.md`, `timeline.md` 생성
3. `foreshadowing_ledger.md` 생성
4. `draft_notes.md`, `discarded_settings.md`, `revision_log.md` 생성
5. `session_logs/`, `author_decision_log.md`, `uncertainty_log.md` 생성
6. writer room 문서를 기준으로 5화 원고 생성
7. 원고에서 gold evidence quote 추출
8. taxonomy별 writer question 50개 생성
9. raw author question 30개 생성
10. `gold_answers.jsonl`, `gold_evidence.jsonl` 생성
11. `feedback_seed.jsonl`, `rejected_answer_cases.jsonl` 생성
12. `benchmark_manifest.json` 생성
13. `dataset_quality_report.json` 생성
14. shadow beta label로 benchmark 실행
15. threshold finalization guard가 실패하는지 확인

## 완료 기준

1차 shadow beta novel pack은 아래 조건을 만족하면 완료다.

- 4개 장르 폴더가 모두 존재한다.
- 장르별 5개 원고 파일이 있다.
- 장르별 writer room 최상위 문서 10개와 `session_logs/` 문서 3개가 있다.
- 장르별 eval 파일 8개가 있다.
- 장르별 writer question이 최소 50개다.
- 장르별 raw author question이 최소 30개다.
- 장르별 feedback seed가 최소 10개다.
- 장르별 dataset quality report가 모든 필수 gate를 통과한다.
- 각 manifest가 `datasetKind=shadow_beta`, `realBetaConfirmed=false`, `canFinalizeThresholds=false`를 가진다.
- threshold finalization을 시도하면 real beta provenance 부족으로 실패한다.

## 이 데이터로 하면 안 되는 것

- Phase 7을 완료로 표시
- 제품 threshold 확정
- 실제 작가 beta sample 수에 포함
- 상업 웹소설 원문과 유사한 문장 생성
- `novel/face` 원문을 그대로 eval evidence로 저장

## 다음 단계

- 이 문서 기준으로 `novel/{genre}` 데이터셋을 생성한다.
- 생성 후 manifest, jsonl schema, evidence quote, quality gate를 검사하는 작은 script test를 추가한다.
- shadow beta run label로 writer benchmark를 실행한다.
- finalization guard가 `unconfirmed_real_beta_data` 또는 real beta provenance 부족으로 실패하는지 확인한다.
