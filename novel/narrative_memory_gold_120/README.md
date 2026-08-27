# 잔향도시의 세 번째 기록 — Legacy Stress/Noise Fixture

## 개요

- Corpus ID: `luie-korean-narrative-gold-120-v1`
- 언어: ko-KR
- 회차 수: 120
- 등장인물: 60명
- 세계선: 3개 (prime, return, if)
- Gold Query: 150개
- 생성 Seed: `luie-korean-narrative-gold-120-v1`
- Generator Version: 1.1.0

## 용도

이 120화 corpus는 정식 Narrative RAG acceptance gold가 아니다.
반복 문장과 구조 fact의 직접 노출이 많으므로 `legacy_stress_noise_fixture`로만 보존한다.

- 허용: 대용량 ingestion, offset/hash, 재현성, 반복 noise 검색, 성능·메모리 stress regression
- 금지: 제품 정확도 임계값 확정, 장르 지원 주장, human-reviewed gold 주장
- 신규 benchmark: `docs/architecture/narrative-rag-benchmark-ssot.md`의 S(20화 이하)부터 시작

## 권리

- 이 프로젝트를 위해 새로 생성한 원고이다.
- 외부 상업 웹소설 본문을 입력으로 사용하지 않았다.
- ParallelFiction-Ja_En-100k는 이 corpus 생성 입력으로 사용하지 않았다.

## 구조

```
manuscript/         원문 정본 (chapter_001.txt ~ chapter_120.txt)
structure/          구조 파생 데이터 (chapters, scenes, characters, continuities, relations, facts)
gold/               gold query, answer, evidence
reports/            검증 보고서
```

## 재생성

```bash
pnpm run corpus:legacy:generate
```

같은 seed와 generator version은 byte-identical output을 보장한다.

## 검증

```bash
pnpm run corpus:legacy:validate
```

## 상태

- fixtureRole: legacy_stress_noise_fixture
- dataQualityLabel: NOISE
- benchmarkEligibility: false
- humanReviewStatus: unreviewed
- canFinalizeProductThresholds: false
- canReplaceRealWriterBeta: false
