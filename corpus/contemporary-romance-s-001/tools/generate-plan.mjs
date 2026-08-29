// Plan-stage truth generator for contemporary-romance-s-001.
// Produces structured truth (world/characters/.../timeline) and chapter/scene plan
// from the approved blueprint revision. Evidence/query/gold are NOT produced here
// (SSOT 4.1 ordering: evidence alignment and queries come only after manuscript).
//
// Revision fields use canonicalRevision semantics: sha256 over the record with its
// own `revision` field removed, matching src/shared/utils/canonicalRevision.ts.

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const NARRATIVE_DIR = resolve(HERE, "..", "narrative");

const CONTINUITY = "prime";

function sha256Utf8(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

// Mirror of src/shared/utils/canonicalRevision.ts canonicalize()
function canonicalize(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("finite numbers only");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    const record = value;
    const entries = Object.keys(record)
      .filter((k) => record[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalize(record[k])}`);
    return `{${entries.join(",")}}`;
  }
  throw new Error(`unsupported: ${typeof value}`);
}

function withRevision(record) {
  const { revision, ...rest } = record;
  return { ...rest, revision: sha256Utf8(canonicalize(rest)) };
}

// ---------------------------------------------------------------------------
// Chapter <-> event <-> time assignment (present-time linear, continuity=prime)
// ---------------------------------------------------------------------------
// [chapterNumber, chapterId, title, eventId, eventTime, cliffhanger]
const SPINE = [
  [1, "chapter-01", "블라인드 심사", "event-blind-selection", "day-001-afternoon",
    "심사를 통과한 제안서의 담당 매니저 이름이 한유건이었다."],
  [2, "chapter-02", "역할표", "event-boundary-agreement", "day-003-morning",
    "두 사람은 공동 확인 규칙에 서명했지만 서린은 계약서에서 눈을 떼지 못했다."],
  [3, "chapter-03", "첫 수리", "event-first-repair", "day-008-afternoon",
    "주민의 선풍기가 다시 돌아가는 동안 서린은 유건의 손이 빨라진 것을 봤다."],
  [4, "chapter-04", "쓰지 않기로 한 사연", "event-consent-choice", "day-012-morning",
    "홍보 제안을 함께 거절한 밤, 둘은 처음으로 같은 편에 섰다."],
  [5, "chapter-05", "행사장의 요구", "event-sponsor-pressure", "day-015-afternoon",
    "태수의 방을 나서는 유건의 어깨가 무거웠지만 서린은 그 방 안을 보지 못했다."],
  [6, "chapter-06", "부하 계측", "event-power-warning", "day-019-morning",
    "나리가 계측기를 내려놓으며 오늘 전기 작업은 전부 멈추라고 말했다."],
  [7, "chapter-07", "단독 공지", "event-unilateral-notice", "day-019-evening",
    "전체 중단 문자가 발송된 시각, 서린의 전화는 세 번 모두 꺼져 있었다."],
  [8, "chapter-08", "이름 없는 시안", "event-replacement-draft", "day-020-morning",
    "대체 행사 시안 어디에도 서린의 이름은 없었다."],
  [9, "chapter-09", "회의장", "event-public-rupture", "day-022-afternoon",
    "서린은 유건이 프로그램을 팔아넘겼다고 회의에서 단정했다."],
  [10, "chapter-10", "기록", "event-record-review", "day-026-afternoon",
    "전력 로그와 미정의 기록, 재단 회의록이 서로 다른 이야기를 하고 있었다."],
  [11, "chapter-11", "떠난 이유", "event-past-meaning", "day-028-evening",
    "서린이 대학 시절 떠난 진짜 이유를 말했고 유건은 자신이 틀리게 알고 있었음을 깨달았다."],
  [12, "chapter-12", "책임", "event-accountability", "day-030-morning",
    "유건은 안전을 변명으로 쓰지 않고 단독 공지의 책임을 먼저 인정했다."],
  [13, "chapter-13", "정정", "event-mutual-correction", "day-032-afternoon",
    "서린은 공개 단정을 정정했지만 절차 위반 문제는 접지 않았다."],
  [14, "chapter-14", "축소 재개", "event-safe-reopen", "day-040-morning",
    "비전기 품목부터 프로그램이 다시 열렸고 주민 운영 인수 조건이 확정됐다."],
  [15, "chapter-15", "정산", "event-contract-close", "day-044-afternoon",
    "평가와 대금 정산이 끝나자 둘은 더 이상 발주자와 계약자가 아니었다."],
  [16, "chapter-16", "남는 사람", "event-mutual-choice", "day-046-evening", null],
];

const chapterOfEvent = new Map(SPINE.map(([num, , , eventId]) => [eventId, num]));
const timeOfEvent = new Map(SPINE.map(([, , , eventId, time]) => [eventId, time]));

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------
const world = withRevision({
  worldId: "world-dasi-room",
  name: "다시쓰는 방",
  rules: [
    { ruleId: "rule-safe-bench", statement: "전기 제품은 안전 점검을 통과한 작업대에서만 다룬다." },
    { ruleId: "rule-consent-promo", statement: "참여자의 물건과 사연은 홍보에 쓰기 전에 별도 동의를 받는다." },
    { ruleId: "rule-role-split", statement: "정서린은 프로그램 설계와 수리 교육을, 한유건은 예산·공간·주민 조정을 책임진다." },
    { ruleId: "rule-cobyline", statement: "두 공동 책임자의 이름과 역할은 모든 외부 문서에 병기한다." },
    { ruleId: "rule-joint-notice", statement: "긴급 안전 조치는 누구나 시작할 수 있지만 후속 공지와 재개안은 공동 확인한다." },
    { ruleId: "rule-romance-after-contract", statement: "로맨스의 최종 선택은 재단의 계약 평가와 대금 정산이 끝난 뒤 이뤄진다." },
  ],
});

// ---------------------------------------------------------------------------
// Continuities
// ---------------------------------------------------------------------------
const continuities = [
  { continuityId: "prime", label: "본편", parentContinuityId: null, divergenceChapter: null },
];

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------
const characters = [
  { characterId: "char-jeong-seorin", canonicalName: "정서린",
    aliases: [{ aliasId: "alias-seorin-designer", value: "수리 설계 담당", validFromChapter: 1, validToChapter: null, continuityId: CONTINUITY }],
    introducedChapter: 1 },
  { characterId: "char-han-yugeon", canonicalName: "한유건",
    aliases: [{ aliasId: "alias-yugeon-manager", value: "프로그램 매니저", validFromChapter: 1, validToChapter: null, continuityId: CONTINUITY }],
    introducedChapter: 1 },
  { characterId: "char-choi-nari", canonicalName: "최나리",
    aliases: [{ aliasId: "alias-nari-inspector", value: "전기 안전 기술자", validFromChapter: 6, validToChapter: null, continuityId: CONTINUITY }],
    introducedChapter: 3 },
  { characterId: "char-oh-mijeong", canonicalName: "오미정",
    aliases: [{ aliasId: "alias-mijeong-committee", value: "입주자 운영위원", validFromChapter: 4, validToChapter: null, continuityId: CONTINUITY }],
    introducedChapter: 4 },
  { characterId: "char-im-taesu", canonicalName: "임태수",
    aliases: [{ aliasId: "alias-taesu-team-lead", value: "사업운영팀장", validFromChapter: 5, validToChapter: null, continuityId: CONTINUITY }],
    introducedChapter: 5 },
].map(withRevision);

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------
const goals = [
  { goalId: "goal-seorin-complete", characterId: "char-jeong-seorin",
    description: "다시쓰는 방을 안전하게 완주해 첫 장기 공공 프로젝트 실적을 만든다.",
    validFromChapter: 1, validToChapter: null, continuityId: CONTINUITY },
  { goalId: "goal-seorin-autonomy", characterId: "char-jeong-seorin",
    description: "자신의 선택권을 지키는 것과 모든 도움을 거부하는 것은 다르다는 점을 배운다.",
    validFromChapter: 1, validToChapter: null, continuityId: CONTINUITY },
  { goalId: "goal-yugeon-noincident", characterId: "char-han-yugeon",
    description: "6주 시험 운영을 사고 없이 끝내 다음 분기 상설 예산을 확보한다.",
    validFromChapter: 1, validToChapter: null, continuityId: CONTINUITY },
  { goalId: "goal-yugeon-not-control", characterId: "char-han-yugeon",
    description: "책임진다는 이유로 타인의 의사결정권을 가져가면 안 된다는 점을 행동으로 익힌다.",
    validFromChapter: 1, validToChapter: null, continuityId: CONTINUITY },
  { goalId: "goal-nari-accuracy", characterId: "char-choi-nari",
    description: "자신의 점검 결과가 홍보 일정에 묻히지 않고 정확히 조치되게 한다.",
    validFromChapter: 6, validToChapter: null, continuityId: CONTINUITY },
  { goalId: "goal-mijeong-sustain", characterId: "char-oh-mijeong",
    description: "프로그램이 일회성 홍보가 아니라 주민이 반복 이용할 안전한 공간이 되게 한다.",
    validFromChapter: 4, validToChapter: null, continuityId: CONTINUITY },
  { goalId: "goal-taesu-quota", characterId: "char-im-taesu",
    description: "후원 약정과 분기 실적을 지키면서 안전 사고를 피한다.",
    validFromChapter: 5, validToChapter: null, continuityId: CONTINUITY },
];

// ---------------------------------------------------------------------------
// Conflicts
// ---------------------------------------------------------------------------
const conflicts = [
  { conflictId: "conflict-credit", participantIds: ["char-jeong-seorin", "char-han-yugeon"],
    description: "마감 압박에서 누가 결과물을 바꿀 수 있는가.", introducedChapter: 1, resolvedChapter: 13, continuityId: CONTINUITY },
  { conflictId: "conflict-safety", participantIds: ["char-jeong-seorin", "char-han-yugeon", "char-choi-nari"],
    description: "즉시 중단이 필요한 안전 위험과 공동 공지 절차의 충돌.", introducedChapter: 6, resolvedChapter: 14, continuityId: CONTINUITY },
  { conflictId: "conflict-sponsor", participantIds: ["char-han-yugeon", "char-im-taesu"],
    description: "상설 가능성을 지키려는 프로그램과 단기 홍보 성과의 충돌.", introducedChapter: 5, resolvedChapter: 14, continuityId: CONTINUITY },
  { conflictId: "conflict-trust", participantIds: ["char-jeong-seorin", "char-han-yugeon"],
    description: "상대가 다시 같은 선택을 할 것이라는 예상.", introducedChapter: 2, resolvedChapter: 16, continuityId: CONTINUITY },
];

// ---------------------------------------------------------------------------
// Planned evidence registry.
// Schemas require evidenceIds.min(1) on propositions/relationshipStates/causalEdges
// and on non-unknown knowledge states. Evidence ROWS (with offsets/hash) are only
// created after the manuscript (SSOT 4.1, step 10). At plan stage we therefore
// declare the *planned* evidence affordance IDs each truth will be grounded in.
// The plan-stage harness relaxes "unknown evidence" cross-checks; step 10 must
// materialize an evidence row for each planned ID in the named scene.
// Naming: evidence-<chapterId>-<slug>. planEvidence(chapterId, slug) records the
// intended anchor scene so the affordance plan is auditable.
// ---------------------------------------------------------------------------
const plannedEvidence = new Map();
function planEvidence(chapterId, slug, note) {
  const evidenceId = `evidence-${chapterId}-${slug}`;
  if (!plannedEvidence.has(evidenceId)) {
    plannedEvidence.set(evidenceId, {
      evidenceId,
      plannedChapterId: chapterId,
      plannedSceneId: `scene-${chapterId}-01`,
      continuityId: CONTINUITY,
      affordanceNote: note,
    });
  }
  return evidenceId;
}

// ---------------------------------------------------------------------------
// Propositions. evidenceIds = planned affordance IDs (bound to real rows at step 10).
// validFromChapter reflects when the proposition becomes true in-world.
// ---------------------------------------------------------------------------
const propositions = [
  // EVIDENCE RULE: a proposition that carries a scored question should be grounded in
  // more than one chapter, so answering it requires combining chapters instead of
  // copying one sentence. Chapter distance is deliberate: prop-process-breach and
  // prop-past-exit-reason span ~10 chapters (SSOT 4.4 long_range).
  { propositionId: "prop-past-edit",
    statement: "유건은 대학 프로젝트 제출 직전 서린의 동의 없이 핵심 설명과 발표자 표기를 수정했다.",
    canonicalStatus: "confirmed", continuityId: CONTINUITY, validFromChapter: 1, validToChapter: null,
    evidenceIds: [
      planEvidence("chapter-02", "past-edit-mention", "역할표 작성 중 과거 수정 언급"),
      planEvidence("chapter-11", "past-edit-detail", "서린이 당시 수정 범위를 구체적으로 말함"),
    ] },
  { propositionId: "prop-past-exit-reason",
    statement: "서린이 팀을 떠난 결정적 이유는 취업 제안이 아니라 반복될 수 있는 일방 수정이었다.",
    canonicalStatus: "confirmed", continuityId: CONTINUITY, validFromChapter: 1, validToChapter: null,
    evidenceIds: [
      planEvidence("chapter-02", "exit-reason-hint", "공동 확인 규칙을 먼저 요구하는 행동"),
      planEvidence("chapter-11", "exit-reason-told", "서린이 떠난 진짜 이유를 직접 말함"),
    ] },
  { propositionId: "prop-power-risk",
    statement: "수리 작업대의 기존 배선은 동시 사용 시 안전 기준을 넘는다.",
    canonicalStatus: "confirmed", continuityId: CONTINUITY, validFromChapter: 6, validToChapter: null,
    evidenceIds: [
      planEvidence("chapter-06", "load-measure", "나리의 부하 계측 기록"),
      planEvidence("chapter-10", "power-log-detail", "전력 로그의 초과 구간"),
    ] },
  { propositionId: "prop-halt-cause",
    statement: "시험 운영의 즉시 중단 원인은 실제 전력 위험이다.",
    canonicalStatus: "confirmed", continuityId: CONTINUITY, validFromChapter: 7, validToChapter: null,
    evidenceIds: [
      planEvidence("chapter-06", "halt-trigger", "중단을 요구한 계측 경고"),
      planEvidence("chapter-07", "halt-notice-text", "중단 공지에 적힌 사유"),
      planEvidence("chapter-10", "power-log", "전력 로그로 중단 원인 확인"),
    ] },
  { propositionId: "prop-sponsor-plan",
    statement: "후원사는 중단 기간에 완제품 증정 행사로 홍보를 대체하려 한다.",
    canonicalStatus: "confirmed", continuityId: CONTINUITY, validFromChapter: 5, validToChapter: null,
    evidenceIds: [
      planEvidence("chapter-05", "sponsor-demand", "태수의 완제품 증정 전환 요구"),
      planEvidence("chapter-10", "sponsor-record", "재단 회의록의 홍보 대체 논의"),
    ] },
  { propositionId: "prop-permanent-replacement-status",
    statement: "운영 중단 시점에 서린의 설계를 삭제하는 영구 대체안은 승인되지 않았다.",
    canonicalStatus: "confirmed", continuityId: CONTINUITY, validFromChapter: 5, validToChapter: null,
    evidenceIds: [
      planEvidence("chapter-05", "refusal-action", "유건이 영구 대체안을 거절하는 행동"),
      planEvidence("chapter-08", "draft-without-name", "이름이 빠진 대체 시안 자체"),
      planEvidence("chapter-10", "meeting-record", "재단 회의록의 미승인 상태"),
    ] },
  { propositionId: "prop-process-breach",
    statement: "안전 중단 자체는 필요했지만 유건이 서린과 후속 공지를 확인하지 않은 것은 합의 위반이다.",
    canonicalStatus: "confirmed", continuityId: CONTINUITY, validFromChapter: 7, validToChapter: null,
    evidenceIds: [
      planEvidence("chapter-02", "role-table", "역할표의 공동 확인 규칙"),
      planEvidence("chapter-07", "solo-notice", "단독 발송된 전체 중단 공지"),
      planEvidence("chapter-12", "breach-admission", "절차 위반을 먼저 인정하는 발화"),
    ] },
  { propositionId: "prop-seorin-overclaim",
    statement: "서린은 전체 기록을 확인하기 전에 유건이 프로그램을 팔아넘겼다고 공개 회의에서 단정했다.",
    canonicalStatus: "confirmed", continuityId: CONTINUITY, validFromChapter: 9, validToChapter: null,
    evidenceIds: [
      planEvidence("chapter-09", "public-claim", "회의에서의 공개 단정 발화"),
      planEvidence("chapter-13", "claim-correction", "공개 단정을 정정하는 발화"),
    ] },
  { propositionId: "prop-reopen-condition",
    statement: "축소 재개는 전력 제한, 비전기 품목 우선, 공동 서명 공지를 조건으로 안전하다.",
    canonicalStatus: "confirmed", continuityId: CONTINUITY, validFromChapter: 14, validToChapter: null,
    evidenceIds: [
      planEvidence("chapter-14", "reopen-terms", "축소 재개 조건과 공동 서명 공지"),
      planEvidence("chapter-15", "reopen-terms-settled", "정산 자리에서 확인되는 재개 조건 이행"),
    ] },
];

// ---------------------------------------------------------------------------
// Events (16, causal spine preserved from blueprint §8)
// ---------------------------------------------------------------------------
const eventDefs = [
  ["event-blind-selection", ["char-jeong-seorin", "char-han-yugeon"], [], ["event-boundary-agreement"],
    "서린의 제안이 블라인드 심사를 통과하고 담당자가 유건임이 드러난다."],
  ["event-boundary-agreement", ["char-jeong-seorin", "char-han-yugeon"], ["event-blind-selection"], ["event-first-repair"],
    "과거 일을 짧게 확인한 뒤 공동 확인 규칙과 역할표를 작성한다."],
  ["event-first-repair", ["char-jeong-seorin", "char-han-yugeon", "char-choi-nari"], ["event-boundary-agreement"], ["event-consent-choice"],
    "첫 시험에서 두 사람이 서로 다른 전문성을 결합해 주민 물건을 안전하게 수리한다."],
  ["event-consent-choice", ["char-jeong-seorin", "char-han-yugeon", "char-oh-mijeong"], ["event-first-repair"], ["event-sponsor-pressure"],
    "후원 홍보에 주민 사연을 쓰자는 요청을 둘이 함께 거절하고 대안을 만든다."],
  ["event-sponsor-pressure", ["char-han-yugeon", "char-im-taesu"], ["event-consent-choice"], ["event-unilateral-notice", "event-replacement-draft"],
    "태수가 완제품 증정 전환을 요구하고 유건은 서린의 설계를 삭제하는 영구 대체안을 거절한다."],
  ["event-power-warning", ["char-choi-nari", "char-han-yugeon"], ["event-first-repair"], ["event-unilateral-notice"],
    "나리가 전력 부하 이상을 기록하고 즉시 전기 작업 중단을 요청한다."],
  ["event-unilateral-notice", ["char-han-yugeon"], ["event-power-warning", "event-sponsor-pressure"], ["event-public-rupture"],
    "서린과 연락이 닿지 않는 짧은 시간 동안 유건이 전체 프로그램 중단 공지를 단독 발송한다."],
  ["event-replacement-draft", ["char-im-taesu", "char-jeong-seorin"], ["event-sponsor-pressure"], ["event-public-rupture"],
    "태수의 지시로 서린 이름이 없는 후원사 대체 행사 시안이 먼저 공유된다."],
  ["event-public-rupture", ["char-jeong-seorin", "char-han-yugeon", "char-oh-mijeong", "char-im-taesu"], ["event-unilateral-notice", "event-replacement-draft"], ["event-record-review"],
    "서린이 운영회의에서 유건이 프로그램을 넘겼다고 단정하고 협업 중단을 선언한다."],
  ["event-record-review", ["char-jeong-seorin", "char-choi-nari", "char-oh-mijeong"], ["event-public-rupture"], ["event-past-meaning", "event-accountability"],
    "전력 로그, 미정의 현장 기록, 재단 회의 기록을 각각 확인한다."],
  ["event-past-meaning", ["char-jeong-seorin", "char-han-yugeon"], ["event-record-review"], ["event-accountability"],
    "서린은 과거에 떠난 이유를 직접 말하고 유건은 자신이 잘못 알고 있었음을 인정한다."],
  ["event-accountability", ["char-han-yugeon"], ["event-record-review", "event-past-meaning"], ["event-mutual-correction"],
    "유건이 단독 공지 책임을 인정하며 대외 문서 정정과 권한표 변경을 먼저 실행한다."],
  ["event-mutual-correction", ["char-jeong-seorin", "char-han-yugeon"], ["event-accountability"], ["event-safe-reopen"],
    "서린도 공개 단정을 정정하되 절차 위반 문제는 철회하지 않고 축소 재개안을 공동 제안한다."],
  ["event-safe-reopen", ["char-jeong-seorin", "char-han-yugeon", "char-choi-nari", "char-oh-mijeong"], ["event-mutual-correction"], ["event-contract-close"],
    "비전기 품목 중심으로 프로그램이 재개되고 주민 운영 인수 조건이 확정된다."],
  ["event-contract-close", ["char-jeong-seorin", "char-han-yugeon", "char-im-taesu"], ["event-safe-reopen"], ["event-mutual-choice"],
    "평가와 대금 정산 후 둘이 더 이상 발주자·계약자 관계가 아님을 확인한다."],
  ["event-mutual-choice", ["char-jeong-seorin", "char-han-yugeon"], ["event-contract-close"], [],
    "유건이 거절 가능한 구체적 만남을 제안하고 서린이 자신의 조건을 말한 뒤 수락한다."],
];

const events = eventDefs.map(([eventId, participantIds, pre, eff, description]) =>
  withRevision({
    eventId, continuityId: CONTINUITY,
    eventTime: timeOfEvent.get(eventId),
    firstNarratedChapter: chapterOfEvent.get(eventId),
    participantIds, preconditionEventIds: pre, effectEventIds: eff,
    description, canonicalStatus: "confirmed",
  }),
);

// ---------------------------------------------------------------------------
// Causal edges (blueprint §8 "필수 인과").
// evidenceIds intentionally EMPTY at plan stage (bound at step 10).
// ---------------------------------------------------------------------------
const causalDefs = [
  ["causal-warning-to-notice", "event-power-warning", "event-unilateral-notice", "direct"],
  ["causal-notice-to-rupture", "event-unilateral-notice", "event-public-rupture", "direct"],
  ["causal-draft-to-rupture", "event-replacement-draft", "event-public-rupture", "contributing"],
  ["causal-pressure-to-draft", "event-sponsor-pressure", "event-replacement-draft", "direct"],
  ["causal-rupture-to-review", "event-public-rupture", "event-record-review", "direct"],
  ["causal-review-to-pastmeaning", "event-record-review", "event-past-meaning", "enabling"],
  ["causal-pastmeaning-to-account", "event-past-meaning", "event-accountability", "contributing"],
  ["causal-review-to-account", "event-record-review", "event-accountability", "enabling"],
  ["causal-account-to-correction", "event-accountability", "event-mutual-correction", "direct"],
  ["causal-correction-to-reopen", "event-mutual-correction", "event-safe-reopen", "direct"],
  ["causal-reopen-to-close", "event-safe-reopen", "event-contract-close", "enabling"],
  ["causal-close-to-choice", "event-contract-close", "event-mutual-choice", "enabling"],
  ["causal-selection-to-agreement", "event-blind-selection", "event-boundary-agreement", "direct"],
  ["causal-agreement-to-repair", "event-boundary-agreement", "event-first-repair", "enabling"],
  ["causal-repair-to-consent", "event-first-repair", "event-consent-choice", "contributing"],
  ["causal-consent-to-pressure", "event-consent-choice", "event-sponsor-pressure", "enabling"],
];
const causalEdges = causalDefs.map(([causalEdgeId, causeEventId, effectEventId, strength]) => {
  const effChapterId = `chapter-${String(chapterOfEvent.get(effectEventId)).padStart(2, "0")}`;
  return {
    causalEdgeId, causeEventId, effectEventId, continuityId: CONTINUITY, strength,
    evidenceIds: [planEvidence(effChapterId, `cause-${causeEventId.replace(/^event-/, "")}`,
      `${causeEventId} → ${effectEventId} 인과 근거`)],
  };
});

// ---------------------------------------------------------------------------
// Relationship states (interval-partitioned per directed dimension).
// evidenceIds intentionally EMPTY at plan stage (bound at step 10).
// ---------------------------------------------------------------------------
const relStateDefs = [
  // Seorin -> Yugeon : trust
  ["rel-seorin-yugeon-trust-01", "char-jeong-seorin", "char-han-yugeon", "trust", 0.1, "능력은 인정하나 결정권 불신", 1, 8],
  ["rel-seorin-yugeon-trust-02", "char-jeong-seorin", "char-han-yugeon", "trust", -0.6, "단독 공지 후 불신", 9, 11],
  ["rel-seorin-yugeon-trust-03", "char-jeong-seorin", "char-han-yugeon", "trust", 0.4, "조건 명확한 실무 신뢰", 12, null],
  // Yugeon -> Seorin : trust
  ["rel-yugeon-seorin-trust-01", "char-han-yugeon", "char-jeong-seorin", "trust", 0.0, "떠날 가능성 경계", 1, 8],
  ["rel-yugeon-seorin-trust-02", "char-han-yugeon", "char-jeong-seorin", "trust", -0.3, "공개 반박 후 방어적", 9, 10],
  ["rel-yugeon-seorin-trust-03", "char-han-yugeon", "char-jeong-seorin", "trust", 0.5, "반대와 철수를 구분하는 신뢰", 11, null],
  // Seorin <-> Yugeon : official_status (use source=seorin as canonical direction)
  ["rel-official-01", "char-jeong-seorin", "char-han-yugeon", "official_status", 0.6, "6주 공동 책임자", 2, 8],
  ["rel-official-02", "char-jeong-seorin", "char-han-yugeon", "official_status", -0.2, "협업 일시 중단", 9, 13],
  ["rel-official-03", "char-jeong-seorin", "char-han-yugeon", "official_status", 0.5, "권한표 둔 공동 책임자", 14, 15],
  ["rel-official-04", "char-jeong-seorin", "char-han-yugeon", "official_status", 0.0, "계약 종료, 대등 관계", 16, null],
  // Seorin -> Yugeon : affection (romantic interest)
  ["rel-seorin-yugeon-aff-01", "char-jeong-seorin", "char-han-yugeon", "affection", 0.0, "없음", 1, 3],
  ["rel-seorin-yugeon-aff-02", "char-jeong-seorin", "char-han-yugeon", "affection", 0.3, "호감 발생", 4, 8],
  ["rel-seorin-yugeon-aff-03", "char-jeong-seorin", "char-han-yugeon", "affection", -0.1, "신뢰 파손으로 부정", 9, 15],
  ["rel-seorin-yugeon-aff-04", "char-jeong-seorin", "char-han-yugeon", "affection", 0.6, "명시적 관심 표현", 16, null],
  // Yugeon -> Seorin : affection
  ["rel-yugeon-seorin-aff-01", "char-han-yugeon", "char-jeong-seorin", "affection", 0.2, "미해결 호감", 1, 6],
  ["rel-yugeon-seorin-aff-02", "char-han-yugeon", "char-jeong-seorin", "affection", 0.1, "보호 명목의 통제로 왜곡", 7, 11],
  // ch12 accountability ends the "protective control" distortion, but the contract
  // is still open, so the feeling stays unspoken until ch16 (contract-close rule).
  // This interval must exist: without it chapters 12-15 would have NO defined
  // affection state for this direction and a ch13 relationship_state query would
  // have no gold answer.
  ["rel-yugeon-seorin-aff-03", "char-han-yugeon", "char-jeong-seorin", "affection", 0.3, "통제를 내려놓았으나 계약 중 표현 보류", 12, 15],
  ["rel-yugeon-seorin-aff-04", "char-han-yugeon", "char-jeong-seorin", "affection", 0.6, "거절 가능성을 보장한 제안", 16, null],
  // Seorin <-> Nari : mentorship(=professional friendship proxy). source=seorin
  ["rel-seorin-nari-01", "char-jeong-seorin", "char-choi-nari", "mentorship", 0.7, "높은 신뢰의 협업", 3, 9],
  ["rel-seorin-nari-02", "char-jeong-seorin", "char-choi-nari", "mentorship", 0.4, "즉시 편들지 않아 긴장", 10, 12],
  ["rel-seorin-nari-03", "char-jeong-seorin", "char-choi-nari", "mentorship", 0.8, "사실과 편들기를 구분하는 우정", 13, null],
];
const relationshipStates = relStateDefs.map(
  ([relationshipStateId, sourceCharacterId, targetCharacterId, dimension, value, label, validFromChapter, validToChapter]) => {
    const chapterId = `chapter-${String(validFromChapter).padStart(2, "0")}`;
    return {
      relationshipStateId, sourceCharacterId, targetCharacterId, dimension, value, label,
      validFromChapter, validToChapter, continuityId: CONTINUITY,
      evidenceIds: [planEvidence(chapterId, `rel-${relationshipStateId.replace(/^rel-/, "")}`,
        `${relationshipStateId} 관계 상태 근거`)],
    };
  },
);

// ---------------------------------------------------------------------------
// Relationship transitions. after.validFromChapter must equal transition chapter.
// trigger event firstNarratedChapter must be <= transition chapter.
// ---------------------------------------------------------------------------
const transitionDefs = [
  // seorin->yugeon trust: 0.1 -> -0.6 at ch9 (public-rupture)
  ["transition-seorin-trust-collapse", "rel-seorin-yugeon-trust-01", "rel-seorin-yugeon-trust-02",
    ["event-public-rupture"], 9],
  // seorin->yugeon trust: -0.6 -> 0.4 at ch12 (accountability)
  ["transition-seorin-trust-recover", "rel-seorin-yugeon-trust-02", "rel-seorin-yugeon-trust-03",
    ["event-accountability", "event-past-meaning"], 12],
  // yugeon->seorin trust: 0.0 -> -0.3 at ch9
  ["transition-yugeon-trust-drop", "rel-yugeon-seorin-trust-01", "rel-yugeon-seorin-trust-02",
    ["event-public-rupture"], 9],
  // yugeon->seorin trust: -0.3 -> 0.5 at ch11 (past-meaning)
  ["transition-yugeon-trust-recover", "rel-yugeon-seorin-trust-02", "rel-yugeon-seorin-trust-03",
    ["event-past-meaning"], 11],
  // official: 0.6 -> -0.2 at ch9
  ["transition-official-suspend", "rel-official-01", "rel-official-02",
    ["event-public-rupture"], 9],
  // official: -0.2 -> 0.5 at ch14 (safe-reopen)
  ["transition-official-resume", "rel-official-02", "rel-official-03",
    ["event-mutual-correction", "event-safe-reopen"], 14],
  // official: 0.5 -> 0.0 at ch16 (contract-close)
  ["transition-official-close", "rel-official-03", "rel-official-04",
    ["event-contract-close"], 16],
  // seorin->yugeon affection: 0.0 -> 0.3 at ch4 (consent-choice)
  ["transition-seorin-aff-rise", "rel-seorin-yugeon-aff-01", "rel-seorin-yugeon-aff-02",
    ["event-consent-choice"], 4],
  // seorin->yugeon affection: 0.3 -> -0.1 at ch9
  ["transition-seorin-aff-suppress", "rel-seorin-yugeon-aff-02", "rel-seorin-yugeon-aff-03",
    ["event-public-rupture"], 9],
  // seorin->yugeon affection: -0.1 -> 0.6 at ch16 (mutual-choice)
  ["transition-seorin-aff-open", "rel-seorin-yugeon-aff-03", "rel-seorin-yugeon-aff-04",
    ["event-mutual-choice"], 16],
  // yugeon->seorin affection: 0.2 -> 0.1 at ch7 (unilateral-notice: control distortion)
  ["transition-yugeon-aff-distort", "rel-yugeon-seorin-aff-01", "rel-yugeon-seorin-aff-02",
    ["event-unilateral-notice"], 7],
  // yugeon->seorin affection: 0.1 -> 0.3 at ch12 (accountability drops the
  // protective-control framing while the contract is still running)
  ["transition-yugeon-aff-undistort", "rel-yugeon-seorin-aff-02", "rel-yugeon-seorin-aff-03",
    ["event-accountability"], 12],
  // yugeon->seorin affection: 0.3 -> 0.6 at ch16
  ["transition-yugeon-aff-open", "rel-yugeon-seorin-aff-03", "rel-yugeon-seorin-aff-04",
    ["event-mutual-choice"], 16],
  // seorin<->nari mentorship: 0.7 -> 0.4 at ch10 (record-review: nari won't take sides)
  ["transition-nari-tension", "rel-seorin-nari-01", "rel-seorin-nari-02",
    ["event-record-review"], 10],
  // seorin<->nari mentorship: 0.4 -> 0.8 at ch13 (mutual-correction)
  ["transition-nari-restore", "rel-seorin-nari-02", "rel-seorin-nari-03",
    ["event-mutual-correction"], 13],
];
const relationshipTransitions = transitionDefs.map(
  ([transitionId, beforeStateId, afterStateId, triggerEventIds, validFromChapter]) =>
    withRevision({ transitionId, beforeStateId, afterStateId, triggerEventIds, validFromChapter, continuityId: CONTINUITY }),
);

// ---------------------------------------------------------------------------
// Knowledge states. state!=unknown requires acquiredByEventId (and evidence at
// full-validate time). validFromChapter >= acquisition event firstNarratedChapter.
// evidenceIds intentionally EMPTY at plan stage (bound at step 10) for non-unknown
// states -> plan harness relaxes the "evidence required" rule; full validator will
// require it after manuscript.
// ---------------------------------------------------------------------------
const knowledgeDefs = [
  // COVERAGE RULE: for every declared (character, proposition) pair the states must
  // cover [proposition.validFromChapter .. last chapter] with NO gap. A missing
  // interval means a character_knowledge query at that chapter has no gold answer.
  // Pre-story baselines (a belief held before chapter 1) are anchored to the
  // chapter-1 event, following the existing yugeon/exit-reason precedent.
  // Optional 9th element declares EXTRA evidence affordances so an answer needs
  // more than one chapter (SSOT 4.4 multi_evidence / long_range).
  //
  // Seorin on halt-cause: misinformed (ch7 sees notice, no cause) -> known (ch10 record-review)
  ["knowledge-seorin-halt-misinformed", "char-jeong-seorin", "prop-halt-cause", "misinformed", 0.6, "event-unilateral-notice", 7, 9,
    [[9, "halt-wrong-premise", "잘못된 전제로 회의에서 원인을 단정"]]],
  ["knowledge-seorin-halt-known", "char-jeong-seorin", "prop-halt-cause", "known", 0.9, "event-record-review", 10, null,
    [[13, "halt-justified-conceded", "중단 자체는 정당했다고 인정하는 발화"]]],
  // Yugeon on halt-cause: he issued the halt, so he knows the real cause from ch7.
  // Contrast with seorin's misinformed state over the same chapters (knowledge asymmetry).
  ["knowledge-yugeon-halt-known", "char-han-yugeon", "prop-halt-cause", "known", 1.0, "event-unilateral-notice", 7, null,
    [[12, "halt-cause-restated", "책임 인정 자리에서 중단 사유를 다시 진술"]]],
  // Seorin on permanent-replacement-status: misinformed (ch8) -> known (ch10)
  // Seorin on permanent-replacement-status: the proposition exists from ch5 (sponsor
  // pressure) but she only meets the question at ch8, so ch5-7 is an explicit unknown.
  ["knowledge-seorin-replace-unknown", "char-jeong-seorin", "prop-permanent-replacement-status", "unknown", 0.0, null, 5, 7],
  ["knowledge-seorin-replace-misinformed", "char-jeong-seorin", "prop-permanent-replacement-status", "misinformed", 0.7, "event-replacement-draft", 8, 9],
  ["knowledge-seorin-replace-known", "char-jeong-seorin", "prop-permanent-replacement-status", "known", 0.9, "event-record-review", 10, null],
  // Yugeon on permanent-replacement-status: he refused it at ch5, so he knows it was
  // never approved while seorin misreads the ch8 draft.
  ["knowledge-yugeon-replace-known", "char-han-yugeon", "prop-permanent-replacement-status", "known", 0.9, "event-sponsor-pressure", 5, null],
  // Seorin on power-risk: unknown -> known at ch10 (record-review, power logs)
  ["knowledge-seorin-powerrisk-unknown", "char-jeong-seorin", "prop-power-risk", "unknown", 0.0, null, 1, 9],
  ["knowledge-seorin-powerrisk-known", "char-jeong-seorin", "prop-power-risk", "known", 0.9, "event-record-review", 10, null],
  // Yugeon on past-exit-reason: misinformed (believes job offer) -> known at ch11 (past-meaning)
  ["knowledge-yugeon-exit-misinformed", "char-han-yugeon", "prop-past-exit-reason", "misinformed", 0.7, "event-blind-selection", 1, 10,
    [[4, "exit-reason-wrong-belief", "취업 제안 때문이었다고 말하는 발화"]]],
  ["knowledge-yugeon-exit-known", "char-han-yugeon", "prop-past-exit-reason", "known", 0.9, "event-past-meaning", 11, null,
    [[12, "exit-reason-acted-on", "반복 패턴을 전제로 책임을 인정하는 발화"]]],
  // Seorin on past-exit-reason: it is her own reason, held from before ch1.
  ["knowledge-seorin-exit-known", "char-jeong-seorin", "prop-past-exit-reason", "known", 1.0, "event-blind-selection", 1, null,
    [[2, "exit-reason-condition", "역할표에 공동 확인 조건을 요구하는 이유"]]],
  // Yugeon on power-risk: known from ch6 (power-warning)
  ["knowledge-yugeon-powerrisk-known", "char-han-yugeon", "prop-power-risk", "known", 0.9, "event-power-warning", 6, null],
  // Nari on power-risk: known from ch6
  ["knowledge-nari-powerrisk-known", "char-choi-nari", "prop-power-risk", "known", 1.0, "event-power-warning", 6, null],
  // Seorin on process-breach: unknown (ch7-8, she has not connected the notice to the
  // role table) -> suspected (ch9) -> known (ch12 accountability)
  ["knowledge-seorin-breach-unknown", "char-jeong-seorin", "prop-process-breach", "unknown", 0.0, null, 7, 8],
  ["knowledge-seorin-breach-suspected", "char-jeong-seorin", "prop-process-breach", "suspected", 0.6, "event-public-rupture", 9, 11,
    [[11, "breach-still-asked", "과거 이야기 중에도 절차 문제를 다시 묻는 발화"]]],
  ["knowledge-seorin-breach-known", "char-jeong-seorin", "prop-process-breach", "known", 0.9, "event-accountability", 12, null,
    [[13, "breach-kept-after-correction", "공개 단정은 정정하면서도 절차 문제는 접지 않음"]]],
  // Yugeon on process-breach: ch7-11 he believes the emergency justified skipping joint
  // confirmation, so he does NOT recognize the breach. This is the core evaluation
  // contract: the halt was right AND the follow-up procedure was wrong.
  ["knowledge-yugeon-breach-misinformed", "char-han-yugeon", "prop-process-breach", "misinformed", 0.6, "event-unilateral-notice", 7, 11,
    [[9, "breach-self-justify", "긴급성으로 단독 공지를 정당화하는 반박"]]],
  ["knowledge-yugeon-breach-known", "char-han-yugeon", "prop-process-breach", "known", 0.9, "event-accountability", 12, null,
    [[14, "breach-fixed-by-cosign", "재개 공지를 공동 서명으로 처리하는 행동"]]],
  // Seorin on sponsor-plan: unknown -> known at ch10
  ["knowledge-seorin-sponsor-unknown", "char-jeong-seorin", "prop-sponsor-plan", "unknown", 0.0, null, 1, 9],
  ["knowledge-seorin-sponsor-known", "char-jeong-seorin", "prop-sponsor-plan", "known", 0.8, "event-record-review", 10, null],
  // Yugeon on sponsor-plan: he heard the demand directly at ch5.
  ["knowledge-yugeon-sponsor-known", "char-han-yugeon", "prop-sponsor-plan", "known", 1.0, "event-sponsor-pressure", 5, null],
];
const knowledgeStates = knowledgeDefs.map(
  ([knowledgeStateId, characterId, propositionId, state, confidence, acquiredByEventId, validFromChapter, validToChapter, extraEvidence]) => {
    // unknown states carry no evidence (schema allows empty; nothing is observed yet).
    // non-unknown states declare a planned affordance ID at the acquisition chapter,
    // plus any extra affordance so the answer is not a single-sentence lookup.
    const evidenceIds =
      state === "unknown"
        ? []
        : [
            planEvidence(`chapter-${String(validFromChapter).padStart(2, "0")}`,
              `know-${knowledgeStateId.replace(/^knowledge-/, "")}`,
              `${knowledgeStateId} 지식 취득 근거`),
            ...(extraEvidence ?? []).map(([chapterNumber, slug, note]) =>
              planEvidence(`chapter-${String(chapterNumber).padStart(2, "0")}`, slug, note)),
          ];
    return withRevision({
      knowledgeStateId, characterId, propositionId, state, confidence,
      acquiredByEventId, validFromChapter, validToChapter, continuityId: CONTINUITY, evidenceIds,
    });
  },
);

// ---------------------------------------------------------------------------
// Timeline (present-time; one entry per event; narrativeChapter must match the
// chapter that lists the event; eventTime must match the event).
// ---------------------------------------------------------------------------
const timeline = SPINE.map(([num, , , eventId, eventTime]) => ({
  timelineEntryId: `timeline-${eventId.replace(/^event-/, "")}`,
  eventId, continuityId: CONTINUITY, eventTime, narrativeChapter: num, mode: "present",
}));

// ---------------------------------------------------------------------------
// Chapter plans (one focal event per chapter for the S pack).
// sourceId points at the future manuscript source; bound now, file created at step 9.
// ---------------------------------------------------------------------------
const chapters = SPINE.map(([chapterNumber, chapterId, title, eventId, , cliffhanger]) => ({
  chapterId, chapterNumber, title, continuityId: CONTINUITY,
  eventIds: [eventId], cliffhanger,
  sourceId: `source-${chapterId}`,
}));

// ---------------------------------------------------------------------------
// Scenes (each chapter = 2 scenes; scene event set is subset of chapter events;
// participants subset of the focal event participants).
// ---------------------------------------------------------------------------
const eventParticipants = new Map(eventDefs.map(([eventId, participantIds]) => [eventId, participantIds]));
const scenes = [];
for (const [chapterNumber, chapterId, , eventId] of SPINE) {
  const parts = eventParticipants.get(eventId);
  scenes.push({
    sceneId: `scene-${chapterId}-01`, chapterId, sceneOrder: 1, continuityId: CONTINUITY,
    eventIds: [eventId], participantIds: parts, locationId: "location-empty-shop",
  });
  // second scene: reaction beat, same event, narrower participant set (first participant)
  scenes.push({
    sceneId: `scene-${chapterId}-02`, chapterId, sceneOrder: 2, continuityId: CONTINUITY,
    eventIds: [eventId], participantIds: [parts[0]], locationId: "location-empty-shop",
  });
}

// ---------------------------------------------------------------------------
// Write files
// ---------------------------------------------------------------------------
mkdirSync(NARRATIVE_DIR, { recursive: true });

function writeJson(name, value) {
  writeFileSync(resolve(NARRATIVE_DIR, name), JSON.stringify(value, null, 2) + "\n", "utf8");
}
function writeJsonl(name, rows) {
  writeFileSync(resolve(NARRATIVE_DIR, name), rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
}

writeJson("world.json", world);
writeJson("continuities.json", continuities);
writeJsonl("characters.jsonl", characters);
writeJsonl("goals.jsonl", goals);
writeJsonl("conflicts.jsonl", conflicts);
writeJsonl("propositions.jsonl", propositions);
writeJsonl("events.jsonl", events);
writeJsonl("causal_edges.jsonl", causalEdges);
writeJsonl("relations.jsonl", relationshipStates);
writeJsonl("relationship_transitions.jsonl", relationshipTransitions);
writeJsonl("knowledge_states.jsonl", knowledgeStates);
writeJsonl("timeline.jsonl", timeline);
writeJsonl("chapter_plans.jsonl", chapters);
writeJsonl("scenes.jsonl", scenes);
// Planned evidence affordance registry (NOT evidence rows; those come at step 10).
writeJsonl("planned_evidence.jsonl", [...plannedEvidence.values()]);

console.log(JSON.stringify({
  world: 1, continuities: continuities.length, characters: characters.length,
  goals: goals.length, conflicts: conflicts.length, propositions: propositions.length,
  events: events.length, causalEdges: causalEdges.length,
  relationshipStates: relationshipStates.length, relationshipTransitions: relationshipTransitions.length,
  knowledgeStates: knowledgeStates.length, timeline: timeline.length,
  chapters: chapters.length, scenes: scenes.length,
  plannedEvidence: plannedEvidence.size,
}, null, 2));
