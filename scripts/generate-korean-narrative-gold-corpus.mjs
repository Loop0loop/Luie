#!/usr/bin/env node
/**
 * generate-korean-narrative-gold-corpus.mjs
 *
 * 한국어 장편 웹소설 synthetic gold corpus 생성기.
 * seed 기반 PRNG로 byte-identical 재생성 보장.
 * 외부 상업 원문을 입력으로 사용하지 않는다.
 *
 * 정본 명세: docs/plans/korean-synthetic-narrative-corpus.md
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// ─── Constants ───────────────────────────────────────────────────────────────

const CORPUS_ID = "luie-korean-narrative-gold-120-v1";
const SEED = "luie-korean-narrative-gold-120-v1";
const TITLE = "잔향도시의 세 번째 기록";
const LANGUAGE = "ko-KR";
const DATASET_KIND = "legacy_stress_noise_fixture";
const TOTAL_CHAPTERS = 120;
const TARGET_MIN_CHARS = 4500;
const TARGET_MAX_CHARS = 6500;
const TOTAL_CHARACTERS = 60;
const CORE_CHARACTERS = 12;
const CONTINUITY_COUNT = 3;
const MIN_RELATION_TYPES = 30;
const MIN_QUERIES = 120;
const TAXONOMY_COUNT = 10;
const MIN_PER_TAXONOMY = 10;
const GENERATOR_VERSION = "1.1.0";

const OUTPUT_ROOT_ARG = process.argv.includes("--output")
  ? process.argv[process.argv.indexOf("--output") + 1]
  : "novel/narrative_memory_gold_120";
const OUTPUT_ROOT = path.resolve(process.cwd(), OUTPUT_ROOT_ARG);

// ─── Deterministic PRNG (Mulberry32) ──────────────────────────────────────────

function createPRNG(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  }
  let state = h >>> 0;
  return function () {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createPRNG(SEED);

function randInt(min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hasFinalConsonant(value) {
  const last = [...String(value).trim()].at(-1);
  if (!last) return false;
  const code = last.codePointAt(0);
  if (code < 0xac00 || code > 0xd7a3) return /[0-9]/.test(last);
  return (code - 0xac00) % 28 !== 0;
}

function attachParticle(value, pair) {
  const [withBatchim, withoutBatchim] = pair.split("/");
  return `${value}${hasFinalConsonant(value) ? withBatchim : withoutBatchim}`;
}

function renderKoreanParticles(value) {
  const replaceParticle = (input, marker, pair) => input.replace(
    new RegExp(`([가-힣A-Za-z0-9_-]+)(['\"]?)${marker}`, "g"),
    (_, word, closingQuote) => {
      const [withBatchim, withoutBatchim] = pair.split("/");
      return `${word}${closingQuote}${hasFinalConsonant(word) ? withBatchim : withoutBatchim}`;
    }
  );
  let rendered = replaceParticle(value, "은\\(는\\)", "은/는");
  rendered = replaceParticle(rendered, "이\\(가\\)", "이/가");
  rendered = replaceParticle(rendered, "을\\(를\\)", "을/를");
  return replaceParticle(rendered, "과\\(와\\)", "과/와");
}

function chaptersForContinuity(continuityId) {
  if (continuityId === "prime") return Array.from({ length: 60 }, (_, index) => index + 1);
  if (continuityId === "if") return Array.from({ length: 15 }, (_, index) => index + 91);
  return [
    ...Array.from({ length: 30 }, (_, index) => index + 61),
    ...Array.from({ length: 15 }, (_, index) => index + 106),
  ];
}

function pickContinuityChapter(continuityId, minimum = 1) {
  const candidates = chaptersForContinuity(continuityId).filter((chapter) => chapter >= minimum);
  return candidates.length > 0 ? pick(candidates) : null;
}

// ─── World Building Data ─────────────────────────────────────────────────────

const CONTINUITIES = [
  { id: "prime", label: "최초 진행 세계선", chapters: [1, 60], parent: null, divergenceChapter: null },
  { id: "return", label: "회귀 세계선", chapters: [[61, 90], [106, 120]], parent: "prime", divergenceChapter: 18 },
  { id: "if", label: "IF 관측 세계선", chapters: [91, 105], parent: "prime", divergenceChapter: 40 },
];

function getContinuityForChapter(ch) {
  if (ch >= 1 && ch <= 60) return "prime";
  if (ch >= 61 && ch <= 90) return "return";
  if (ch >= 91 && ch <= 105) return "if";
  if (ch >= 106 && ch <= 120) return "return";
  return "prime";
}

const SURNAMES = ["한", "윤", "박", "김", "이", "정", "최", "조", "강", "장", "임", "오", "서", "신", "권", "황", "안", "송", "류", "홍", "전", "문", "양", "배", "노", "하", "곽", "성", "차", "주"];
const GIVEN_NAMES = ["세연", "해준", "도윤", "서진", "민재", "지호", "수아", "예린", "하은", "시우", "현우", "다은", "유나", "태현", "소율", "준서", "은서", "채원", "지원", "서윤", "하린", "시윤", "지안", "민서", "서현", "예서", "승현", "주원", "서영", "은채", "소연", "민하", "윤서", "태민", "지환", "현서", "도현", "재민", "유진", "나윤", "소희", "정우", "승민", "한결", "다현", "가은", "리안", "시현", "보겸", "예은", "혜원", "한별", "누리", "이안", "하늘", "솔", "별", "담", "린", "온"];

const ROLES = ["기록감응사", "수석연구원", "잔향분석관", "관측소장", "경비대장", "정보부원", "의료관", "구조대원", "기술장교", "통신관", "시민대표", "상인", "교사", "학생", "기자", "예술가", "경찰관", "사서", "건축가", "정비사", "요리사", "운전사", "음악가", "철학자", "식물학자", "기상관측사", "고고학자", "번역가", "심리상담사", "방송인"];

const ORGS = ["백야관측소", "잔향연구소", "명월시청", "도시재건위원회", "중앙기록관", "동부경비대", "서부의료원", "남부통신국", "북부정비소", "시민자치회", "명월대학", "기억보존회", "관측소비밀실험팀", "도시외곽조사단", "잔향수집부"];

const LOCATIONS = ["중앙기록관", "백야관측소 잔해", "잔향연구소 지하", "명월시 중앙광장", "동부 거주구역", "서부 의료원", "남부 통신탑", "북부 정비 창고", "도시 외곽 경계선", "지하 대피소", "관측소 옥상 폐허", "명월대학 도서관", "시장 거리", "기억의 정원", "잔향 보관실"];

const RELATION_TYPES = [
  "가족_부모자식", "가족_형제자매", "가족_배우자", "사제_스승제자", "동료_같은부서",
  "동료_다른부서", "상하_지휘계통", "적대_개인원한", "적대_조직대립", "비밀동맹",
  "채무_금전", "채무_생명", "감시_공식", "감시_비공식", "기억조작_의심",
  "연애감정_단방향", "연애감정_상호", "공식연인", "정치동맹", "정치대립",
  "보호_의무", "보호_자발", "배신_과거", "신뢰_깊음", "신뢰_표면",
  "정보제공_일방", "정보공유_상호", "경쟁_우호", "경쟁_적대", "의존_심리",
  "의존_물질", "존경_일방", "혐오_일방", "무관심", "오해_지속"
];

const SCENE_MODES = ["present", "flashback", "forecast", "recording", "if_observation"];
const FACT_TYPES = ["knowledge_state", "relationship_change", "location_presence", "event_occurrence", "status_change", "possession", "alias_use", "death", "survival", "secret_reveal"];

const TAXONOMY = [
  "fact_recall",
  "relationship_state",
  "knowledge_state",
  "event_causality",
  "temporal_order",
  "worldline_isolation",
  "future_leakage_guard",
  "alias_disambiguation",
  "forecast_status",
  "draft_canon_conflict",
];

// ─── Korean Prose Generation Fragments ───────────────────────────────────────

const SENSORY_DESCRIPTORS = [
  "차가운 바람이 귓볼을 스쳤다.",
  "오래된 종이 냄새가 코끝을 맴돌았다.",
  "먼지 속에 희미한 빛이 일렁이고 있었다.",
  "발밑의 콘크리트가 미세하게 진동했다.",
  "어딘가에서 금속이 부딪히는 소리가 들렸다.",
  "습기를 머금은 공기가 피부에 달라붙었다.",
  "형광등이 깜빡이며 그림자를 흔들었다.",
  "잔향이 손끝에서 따뜻하게 맥동했다.",
  "희미한 기계음이 배경처럼 깔려 있었다.",
  "유리창 너머로 회색빛 하늘이 내려앉았다.",
  "벽면의 균열 사이로 차가운 공기가 스며들었다.",
  "멀리서 사이렌 소리가 낮게 울렸다.",
  "폐허의 잔해 위에 이끼가 젖어 있었다.",
  "손바닥에 닿은 금속이 서늘하게 느껴졌다.",
  "어둠 속에서 누군가의 숨소리가 들렸다.",
];

const ACTION_FRAGMENTS = [
  "은(는) 기록판을 펼쳐 잔향의 흔적을 추적했다.",
  "은(는) 조심스럽게 문을 열고 안을 살폈다.",
  "은(는) 보고서를 넘기며 눈살을 찌푸렸다.",
  "은(는) 통신기를 집어 들고 주파수를 맞췄다.",
  "은(는) 지도 위에 새로운 표식을 그렸다.",
  "은(는) 계단을 내려가며 손전등을 켰다.",
  "은(는) 상대방의 눈을 똑바로 마주했다.",
  "은(는) 파편을 주워 자세히 관찰했다.",
  "은(는) 기록관의 문서 더미를 뒤적였다.",
  "은(는) 잠시 멈춰 주변의 기척을 살폈다.",
  "은(는) 손가락으로 벽면의 문양을 따라갔다.",
  "은(는) 고개를 돌려 동료에게 신호를 보냈다.",
  "은(는) 주머니에서 열쇠를 꺼내 자물쇠에 넣었다.",
  "은(는) 뒤를 돌아보지 않고 복도를 걸었다.",
  "은(는) 노트에 무언가를 빠르게 적어 내려갔다.",
];

const DIALOGUE_TEMPLATES = [
  '"{name}씨, 이 잔향의 출처를 확인할 수 있습니까?"',
  '"지금 보고 있는 것이 정말 {day}의 기록입니까?"',
  '"관측소가 붕괴된 진짜 이유를 알고 있다면 말해주시오."',
  '"이 세계선에서 {name}은(는) 살아 있습니다."',
  '"그 정보는 아직 확인되지 않았어요."',
  '"위험합니다. 더 이상 접근하면 안 됩니다."',
  '"기록이 변조된 흔적이 있습니다."',
  '"당신이 기억하는 것과 실제 사건은 다릅니다."',
  '"잔향 농도가 비정상적으로 높아지고 있어요."',
  '"협력할 의사가 있다면, 조건을 말씀하십시오."',
  '"이건 개인적인 판단입니다. 공식 입장과는 무관합니다."',
  '"시간이 없습니다. 빨리 결정하십시오."',
  '"그 사람은 이미 돌아올 수 없는 곳에 있습니다."',
  '"다시 한 번 확인하겠습니다. 정말 확실합니까?"',
  '"이 경로는 위험하지만, 다른 선택지가 없습니다."',
];

const INNER_THOUGHT_TEMPLATES = [
  "{name}은(는) 자신도 모르게 주먹을 쥐었다. 이것이 진실이라면, 지금까지의 모든 조사가 무의미해진다.",
  "정말 그럴까. {name}은(는) 고개를 저었다. 아직 단정 짓기엔 이르다.",
  "가슴 한쪽이 서늘해졌다. 만약 그 선택이 달랐다면 지금 이 자리에 서 있을 수 있었을까.",
  "말하지 못한 것이 너무 많았다. {name}은(는) 입술을 깨물었다.",
  "이상했다. 분명히 그때 확인했는데. 기억이 흐려지는 것인가, 아니면 기록이 바뀐 것인가.",
  "한순간의 망설임이 모든 것을 바꿨을 수도 있다는 생각이 뇌리를 스쳤다.",
  "신뢰할 수 있는 사람이 누구인지, 점점 분간이 어려워지고 있었다.",
  "이 도시에서 진실은 언제나 한 겹 아래에 숨어 있다는 것을 깨달았다.",
];

const TRANSITION_PHRASES = [
  "그로부터 며칠 뒤.",
  "같은 시각, 도시 반대편에서는.",
  "해가 지고 어둠이 내려앉았을 무렵.",
  "다음 날 아침, 비가 그치고 나서야.",
  "보고서가 도착한 것은 그로부터 사흘 후였다.",
  "기록관 지하 3층. 접근 제한 구역.",
  "모든 것이 시작된 날로부터 정확히 1년이 지났다.",
  "회귀 이후, 세연은 같은 날을 다시 맞이했다.",
];

const CHAPTER_MILESTONES = new Map([
  [1, "명월시 재난 조사 첫날, 한세연은 백야 관측소 붕괴 기록을 처음 펼쳤다."],
  [18, "훗날 회귀의 기준점이 될 열여덟 번째 날이었지만, 이때의 세연은 아직 그 사실을 몰랐다."],
  [40, "구조 신호를 따를지 기록을 보존할지 결정해야 하는 분기점이 눈앞에 놓였다."],
  [60, "관측소 중심부가 무너지자 세연은 마지막 잔향을 붙잡았고, 시간은 열여덟 번째 날을 향해 접혔다."],
  [61, "세연이 다시 눈을 떴을 때 달력은 열여덟 번째 날을 가리켰다. 기억을 간직한 채 시작된 return 세계선이었다."],
  [91, "기록판은 prime의 마흔 번째 선택이 뒤집힌 if 세계선을 제한 시간 동안 비추기 시작했다."],
  [106, "if 관측이 닫힌 뒤 전달된 기록 조각은 return 세계선의 동료들에게 처음으로 공유됐다."],
  [120, "세연은 세 세계선의 기록을 분리해 봉인하고, 백야 관측소 붕괴의 최종 보고서에 서명했다."],
]);

function getTransitionPhrase(chapterNum, sceneIdx) {
  if (chapterNum === 61 && sceneIdx === 0) return "같은 날이었지만, 이번에는 선택을 바꿀 수 있었다.";
  if (chapterNum === 91 && sceneIdx === 0) return "기록판 너머의 IF 관측은 십오 화 동안만 유지될 예정이었다.";
  if (chapterNum === 106 && sceneIdx === 0) return "세연은 IF에서 본 정보를 동료들에게 직접 전달했다.";
  return TRANSITION_PHRASES[(chapterNum + sceneIdx) % (TRANSITION_PHRASES.length - 1)];
}

// ─── Character Generation ────────────────────────────────────────────────────

function generateCharacters() {
  const characters = [];
  const usedNames = new Set();

  for (let i = 0; i < TOTAL_CHARACTERS; i++) {
    const charId = `char-${String(i + 1).padStart(3, "0")}`;
    let surname, given, fullName;

    // Create 2 pairs of homonyms (chars 50-53)
    if (i === 49 || i === 51) {
      surname = "김";
      given = "서윤";
      fullName = "김서윤";
    } else if (i === 50 || i === 52) {
      surname = "이";
      given = "준서";
      fullName = "이준서";
    } else {
      do {
        surname = SURNAMES[Math.floor(rng() * SURNAMES.length)];
        given = GIVEN_NAMES[Math.floor(rng() * GIVEN_NAMES.length)];
        fullName = surname + given;
      } while (usedNames.has(fullName) && usedNames.size < SURNAMES.length * GIVEN_NAMES.length);
    }
    usedNames.add(fullName + charId); // allow homonyms but track uniquely

    const isCore = i < CORE_CHARACTERS;
    const role = ROLES[i % ROLES.length];
    const org = ORGS[Math.floor(rng() * ORGS.length)];

    // Generate aliases
    const aliases = [fullName];
    if (isCore) {
      aliases.push(`${role} ${surname}${given}`);
      // Title changes for first 4 core characters
      if (i < 4) {
        aliases.push(`전 ${role} ${fullName}`);
        aliases.push(`${ORGS[(i + 3) % ORGS.length]} 소속 ${fullName}`);
      }
    }
    aliases.push(`${surname}${given[0]}${given.length > 1 ? "○" : ""}`); // partial alias

    characters.push({
      characterId: charId,
      name: fullName,
      surname,
      givenName: given,
      aliases,
      role,
      organization: org,
      isCore,
      introducedChapter: isCore ? randInt(1, 20) : randInt(1, 100),
    });
  }

  // Ensure main character
  characters[0].name = "한세연";
  characters[0].surname = "한";
  characters[0].givenName = "세연";
  characters[0].aliases = ["한세연", "기록감응사 한세연", "세연", "기록감응사"];
  characters[0].role = "기록감응사";
  characters[0].organization = "잔향연구소";
  characters[0].introducedChapter = 1;

  characters[1].name = "윤해준";
  characters[1].surname = "윤";
  characters[1].givenName = "해준";
  characters[1].aliases = ["윤해준", "수석연구원 윤해준", "해준", "수석"];
  characters[1].role = "수석연구원";
  characters[1].organization = "백야관측소";
  characters[1].introducedChapter = 1;

  return characters;
}

// ─── Relations Generation ────────────────────────────────────────────────────

function generateRelations(characters) {
  const relations = [];
  const usedTypes = new Set();
  let relId = 0;

  // Ensure all 35 relation types are used
  for (let t = 0; t < RELATION_TYPES.length; t++) {
    const type = RELATION_TYPES[t];
    usedTypes.add(type);
    relId++;
    const c1 = characters[t % CORE_CHARACTERS];
    const c2 = characters[(t + 1) % TOTAL_CHARACTERS];
    const cont = pick(["prime", "return", "if"]);
    const fromCh = pickContinuityChapter(cont);
    const toCh = rng() > 0.5 ? pickContinuityChapter(cont, fromCh + 1) : null;

    relations.push({
      relationId: `rel-${String(relId).padStart(4, "0")}`,
      sourceCharacterId: c1.characterId,
      targetCharacterId: c2.characterId,
      relationType: type,
      continuityId: cont,
      validFromChapter: fromCh,
      validToChapter: toCh,
      status: pick(["active", "dissolved", "suspected", "confirmed"]),
      evidenceIds: [`evidence-${String(relId).padStart(3, "0")}`],
    });
  }

  // Add more relations to reach variety
  for (let extra = 0; extra < 30; extra++) {
    relId++;
    const c1 = characters[randInt(0, TOTAL_CHARACTERS - 1)];
    let c2;
    do {
      c2 = characters[randInt(0, TOTAL_CHARACTERS - 1)];
    } while (c2.characterId === c1.characterId);

    const cont = pick(["prime", "return", "if"]);
    const fromCh = pickContinuityChapter(cont);
    const toCh = rng() > 0.4 ? pickContinuityChapter(cont, fromCh + 1) : null;

    relations.push({
      relationId: `rel-${String(relId).padStart(4, "0")}`,
      sourceCharacterId: c1.characterId,
      targetCharacterId: c2.characterId,
      relationType: pick(RELATION_TYPES),
      continuityId: cont,
      validFromChapter: fromCh,
      validToChapter: toCh,
      status: pick(["active", "dissolved", "suspected", "confirmed"]),
      evidenceIds: [`evidence-${String(relId).padStart(3, "0")}`],
    });
  }

  return relations;
}

// ─── Prose Generation ────────────────────────────────────────────────────────

function buildFactDefinition(characters, chapterNum, sceneIdx) {
  const continuityId = getContinuityForChapter(chapterNum);
  const activeCharacters = characters.filter((character) => character.introducedChapter <= chapterNum);
  const subject = activeCharacters[(chapterNum * 7 + sceneIdx * 3) % activeCharacters.length];
  let object = activeCharacters[(chapterNum * 5 + sceneIdx * 2 + 1) % activeCharacters.length];
  if (object.characterId === subject.characterId) {
    object = activeCharacters[(activeCharacters.indexOf(object) + 1) % activeCharacters.length];
  }

  const factType = FACT_TYPES[((chapterNum - 1) * 3 + sceneIdx) % FACT_TYPES.length];
  const location = LOCATIONS[(chapterNum + sceneIdx) % LOCATIONS.length];
  const relationState = ["동맹", "적대", "불신", "협력", "감시"][
    (chapterNum + sceneIdx) % 5
  ];
  const usableAliases = subject.aliases.filter((candidate) => !candidate.includes("○"));
  const alias = usableAliases[(sceneIdx + 1) % usableAliases.length];
  const definitions = {
    knowledge_state: {
      predicate: "knows",
      objectId: "secret-observatory-key",
      objectLabel: "관측소 열쇠의 존재",
      status: "confirmed",
      statement: `${subject.name}은(는) ${continuityId} 세계선 ${chapterNum}화 시점에 관측소 열쇠의 존재를 알고 있었다.`,
    },
    relationship_change: {
      predicate: "relation_established",
      objectId: object.characterId,
      objectLabel: object.name,
      status: "confirmed",
      statement: `${continuityId} 세계선 ${chapterNum}화에서 ${subject.name}과(와) ${object.name}의 관계는 ${relationState} 상태로 바뀌었다.`,
    },
    location_presence: {
      predicate: "is_at",
      objectId: `location-${location.replace(/\s/g, "-")}`,
      objectLabel: location,
      status: "confirmed",
      statement: `${chapterNum}화 당시 ${subject.name}은(는) ${location}에 있었다.`,
    },
    event_occurrence: {
      predicate: "caused_by",
      objectId: "cause-internal-experiment-failure",
      objectLabel: "내부 실험 실패",
      status: "confirmed",
      statement: `${subject.name}이(가) 확인한 백야 관측소 붕괴의 직접 원인은 내부 실험 실패였다.`,
    },
    status_change: {
      predicate: "status_changed",
      objectId: "status-undercover",
      objectLabel: "비밀 활동 중",
      status: "confirmed",
      statement: `${subject.name}은(는) ${continuityId} 세계선 ${chapterNum}화부터 비밀리에 활동하기 시작했다.`,
    },
    possession: {
      predicate: "possesses",
      objectId: "item-resonance-key",
      objectLabel: "잔향 보관실 열쇠",
      status: "confirmed",
      statement: `${chapterNum}화에서 ${subject.name}은(는) 잔향 보관실 열쇠를 소지하고 있었다.`,
    },
    alias_use: {
      predicate: "known_as",
      objectId: `alias-${subject.characterId}-${sceneIdx + 1}`,
      objectLabel: alias,
      status: "confirmed",
      statement: `${continuityId} 세계선의 기록에서 '${alias}'은(는) ${subject.name}을(를) 가리키는 호칭이었다.`,
    },
    death: {
      predicate: "is_dead",
      objectId: null,
      objectLabel: "사망 보고 미확정",
      status: "suspected",
      statement: `${continuityId} 세계선 ${chapterNum}화에 ${subject.name}이(가) 사망했다는 보고가 접수됐지만, 현장 확인 전이라 확정되지 않았다.`,
    },
    survival: {
      predicate: "is_alive",
      objectId: null,
      objectLabel: "생존",
      status: "confirmed",
      statement: `${continuityId} 세계선 ${chapterNum}화 시점에 ${subject.name}은(는) 살아 있었다.`,
    },
    secret_reveal: {
      predicate: "reveals",
      objectId: "secret-observatory-sabotage",
      objectLabel: "관측소 파괴 공작",
      status: "confirmed",
      statement: `${subject.name}은(는) 관측소 붕괴 전에 파괴 공작이 있었다는 비밀을 공개했다.`,
    },
  };

  const definition = definitions[factType];
  return {
    factId: `fact-${String(chapterNum).padStart(3, "0")}-${String(sceneIdx + 1).padStart(2, "0")}`,
    factType,
    subjectId: subject.characterId,
    subjectLabel: subject.name,
    predicate: definition.predicate,
    objectId: definition.objectId,
    objectLabel: definition.objectLabel,
    continuityId,
    status: definition.status,
    validFromChapter: chapterNum,
    validToChapter: null,
    statement: renderKoreanParticles(definition.statement),
    evidenceIds: [],
  };
}

function generateParagraph(characters, chapterNum, sceneIdx, factSentence) {
  const parts = [];
  const cont = getContinuityForChapter(chapterNum);
  const activeChars = characters.filter((c) => c.introducedChapter <= chapterNum);
  const sceneChars = [];
  for (let i = 0; i < Math.min(4, activeChars.length); i++) {
    sceneChars.push(activeChars[(chapterNum * 7 + sceneIdx * 3 + i) % activeChars.length]);
  }

  parts.push(SENSORY_DESCRIPTORS[(chapterNum * 3 + sceneIdx) % SENSORY_DESCRIPTORS.length], "");

  const actor = sceneChars[0];
  const actionTemplate = ACTION_FRAGMENTS[(chapterNum * 5 + sceneIdx * 2) % ACTION_FRAGMENTS.length];
  parts.push(actor.name + actionTemplate, "");

  if (factSentence) parts.push(factSentence, "");

  const dialogueTemplate = DIALOGUE_TEMPLATES[(chapterNum * 2 + sceneIdx) % DIALOGUE_TEMPLATES.length];
  const dialogueName = sceneChars.length > 1 ? sceneChars[1].name : actor.name;
  parts.push(dialogueTemplate.replace(/\{name\}/g, dialogueName).replace(/\{day\}/g, `${cont}-day-${String(chapterNum).padStart(3, "0")}`), "");

  const thoughtTemplate = INNER_THOUGHT_TEMPLATES[(chapterNum + sceneIdx) % INNER_THOUGHT_TEMPLATES.length];
  parts.push(thoughtTemplate.replace(/\{name\}/g, actor.name), "");

  if (sceneChars.length > 1) {
    const act2 = ACTION_FRAGMENTS[(chapterNum * 3 + sceneIdx + 7) % ACTION_FRAGMENTS.length];
    parts.push(sceneChars[1].name + act2, "");
  }

  if (sceneIdx < 7) parts.push(getTransitionPhrase(chapterNum, sceneIdx), "");
  return renderKoreanParticles(parts.join("\n"));
}

function generateFactSentence(characters, chapterNum, sceneIdx) {
  return buildFactDefinition(characters, chapterNum, sceneIdx).statement;
}

function generateChapterText(characters, chapterNum) {
  const scenesPerChapter = 8;
  const parts = [];
  const title = generateChapterTitle(chapterNum);
  parts.push(`# ${chapterNum}화: ${title}\n\n`);
  const milestone = CHAPTER_MILESTONES.get(chapterNum);
  if (milestone) parts.push(`${milestone}\n\n`);

  for (let s = 0; s < scenesPerChapter; s++) {
    const factSentence = generateFactSentence(characters, chapterNum, s, 0);
    const para = generateParagraph(characters, chapterNum, s, factSentence);
    parts.push(para);
  }

  let text = parts.join("\n");

  // Pad or trim to meet character count requirements
  const currentLen = [...text].length;
  if (currentLen < TARGET_MIN_CHARS) {
    // Add more descriptive padding
    let padding = "";
    let padIdx = 0;
    const activeCharacters = characters.filter((character) => character.introducedChapter <= chapterNum);
    while ([...text].length + [...padding].length < TARGET_MIN_CHARS) {
      const extraActor = activeCharacters[(chapterNum + padIdx) % activeCharacters.length];
      const extraLocation = LOCATIONS[(chapterNum * 3 + padIdx) % LOCATIONS.length];
      const extraTemplates = [
        `\n${extraLocation}에서 ${extraActor.name}은(는) 잠시 멈추어 주변을 둘러보았다. 잔향의 파편이 미세하게 떠다녔고, 과거의 흔적인지 현재가 만든 환영인지 구분하기 어려웠다.\n`,
        `\n${extraLocation}의 기록판 표면에 새로운 문양이 떠올랐다. ${extraActor.name}은(는) 손가락을 가져다 대며 이전에 본 적 없는 형태를 해독하려 했다.\n`,
        `\n${extraLocation} 너머로 종소리가 울렸다. ${extraActor.name}은(는) 재난 이후에도 정확한 시계탑을 확인하고 다음 조사 지점으로 발걸음을 재촉했다.\n`,
        `\n${extraActor.name}은(는) ${extraLocation}의 서류 더미에서 급히 적힌 메모를 발견했다. 내용을 읽어 내려갈수록 표정이 굳어졌다.\n`,
        `\n${extraLocation}에 비가 내리기 시작했다. ${extraActor.name}은(는) 처마 아래에서 수집한 정보를 정리했지만 핵심 조각 하나는 여전히 비어 있었다.\n`,
      ];
      padding += extraTemplates[padIdx % extraTemplates.length];
      padIdx++;
    }
    text += padding;
  }

  text = renderKoreanParticles(text);

  // Trim if too long (cut at paragraph boundary)
  while ([...text].length > TARGET_MAX_CHARS) {
    const lastNewline = text.lastIndexOf("\n\n");
    if (lastNewline > TARGET_MIN_CHARS) {
      text = text.slice(0, lastNewline);
    } else {
      text = [...text].slice(0, TARGET_MAX_CHARS).join("");
      break;
    }
  }

  // Final adjustment: if still under min, add safe filler
  while ([...text].length < TARGET_MIN_CHARS) {
    text += `\n도시의 잔향은 멈추지 않았다. 기록은 계속되어야 했다.`;
  }

  // If over max after padding, trim
  if ([...text].length > TARGET_MAX_CHARS) {
    const codepoints = [...text];
    text = codepoints.slice(0, TARGET_MAX_CHARS).join("");
    // Find last clean break
    const lastBreak = text.lastIndexOf("\n");
    if (lastBreak > TARGET_MIN_CHARS) {
      text = text.slice(0, lastBreak);
    }
  }

  return renderKoreanParticles(text);
}

function generateChapterTitle(chapterNum) {
  const titles = [
    "잔향이 시작되는 곳", "첫 번째 기록", "관측소의 그림자", "흐려진 경계",
    "기억의 파편", "두 번째 선택", "사라진 이름", "밤의 관측자",
    "되돌아온 날", "분기점", "숨겨진 통로", "거울 속 도시",
    "세 번째 증언", "균열의 끝", "접점", "기록자의 의무",
    "잔향 과부하", "지워진 시간", "관측 한계", "회귀의 대가",
    "새벽의 경고", "불완전한 복원", "마지막 선택", "기록 너머",
  ];
  // Deterministic title selection based on chapter number
  const baseIdx = (chapterNum * 7 + 3) % titles.length;
  const suffix = chapterNum > 24 ? ` (${Math.ceil(chapterNum / 24)})` : "";
  return titles[baseIdx] + suffix;
}

// ─── Scenes Generation ───────────────────────────────────────────────────────

function generateScenes(characters, chapterTexts) {
  const scenes = [];
  const scenesPerChapter = 8;

  for (let ch = 1; ch <= TOTAL_CHAPTERS; ch++) {
    const text = chapterTexts[ch - 1];
    const codepoints = [...text];
    const totalLen = codepoints.length;
    const segmentLen = Math.floor(totalLen / scenesPerChapter);
    const cont = getContinuityForChapter(ch);
    const activeChars = characters.filter((c) => c.introducedChapter <= ch);

    for (let s = 0; s < scenesPerChapter; s++) {
      const startOffset = s * segmentLen;
      const endOffset = s === scenesPerChapter - 1 ? totalLen : (s + 1) * segmentLen;
      const sceneText = codepoints.slice(startOffset, endOffset).join("");
      const sceneHash = crypto.createHash("sha256").update(sceneText, "utf8").digest("hex");

      // Determine scene mode
      let mode = "present";
      if (s === 2 && ch > 10) mode = "flashback";
      if (s === 5 && ch > 30 && cont === "prime") mode = "forecast";
      if (cont === "if") mode = s % 3 === 0 ? "if_observation" : "present";
      if (s === 7 && ch > 50) mode = "recording";

      // Participants
      const participantCount = randInt(1, Math.min(4, activeChars.length));
      const participants = [];
      for (let p = 0; p < participantCount; p++) {
        const idx = (ch * 7 + s * 3 + p) % activeChars.length;
        if (!participants.includes(activeChars[idx].characterId)) {
          participants.push(activeChars[idx].characterId);
        }
      }

      const dayNum = Math.ceil(ch / 2);
      const timeOfDay = s < 3 ? "morning" : s < 6 ? "afternoon" : "night";

      scenes.push({
        sceneId: `scene-${String(ch).padStart(3, "0")}-${String(s + 1).padStart(2, "0")}`,
        chapterId: `chapter-${String(ch).padStart(3, "0")}`,
        sceneOrder: s + 1,
        continuityId: cont,
        mode,
        eventTime: `${cont}-day-${String(dayNum).padStart(3, "0")}-${timeOfDay}`,
        locationId: `location-${LOCATIONS[(ch + s) % LOCATIONS.length].replace(/\s/g, "-")}`,
        participantIds: participants,
        startOffset,
        endOffset,
        sha256: sceneHash,
      });
    }
  }

  return scenes;
}

// ─── Facts Generation ────────────────────────────────────────────────────────

function generateFacts(characters, scenes) {
  const facts = [];

  for (let chapterNum = 1; chapterNum <= TOTAL_CHAPTERS; chapterNum++) {
    const chapterId = `chapter-${String(chapterNum).padStart(3, "0")}`;
    const chapterScenes = scenes.filter((scene) => scene.chapterId === chapterId);
    for (let sceneIdx = 0; sceneIdx < Math.min(chapterScenes.length, 3); sceneIdx++) {
      facts.push(buildFactDefinition(characters, chapterNum, sceneIdx));
    }
  }

  return facts;
}

// ─── Queries & Evidence Generation ───────────────────────────────────────────

function generateQueriesAndEvidence(characters, facts, scenes, chapterTexts) {
  const queries = [];
  const evidences = [];
  const usedQuestions = new Set();
  let qId = 0;
  const queriesPerTaxonomy = Math.ceil(MIN_QUERIES / TAXONOMY_COUNT) + 3;
  const factTypesByTask = {
    fact_recall: FACT_TYPES,
    relationship_state: ["relationship_change"],
    knowledge_state: ["knowledge_state", "secret_reveal"],
    event_causality: ["event_occurrence"],
    temporal_order: ["status_change"],
    worldline_isolation: ["death", "survival"],
    future_leakage_guard: ["secret_reveal", "knowledge_state"],
    alias_disambiguation: ["alias_use"],
    forecast_status: ["status_change"],
    draft_canon_conflict: ["relationship_change", "death", "survival"],
  };

  for (let taxonomyIndex = 0; taxonomyIndex < TAXONOMY.length; taxonomyIndex++) {
    const taskType = TAXONOMY[taxonomyIndex];
    const factPool = facts.filter((fact) => factTypesByTask[taskType].includes(fact.factType));

    for (let queryIndex = 0; queryIndex < queriesPerTaxonomy; queryIndex++) {
      qId++;
      const queryId = `query-${String(qId).padStart(3, "0")}`;
      const fact = factPool[(queryIndex * 7 + taxonomyIndex) % factPool.length];
      const chapterNum = fact.validFromChapter;
      const continuityId = fact.continuityId;
      const subject = characters.find((character) => character.characterId === fact.subjectId);
      const object = characters.find((character) => character.characterId === fact.objectId);
      const subjectName = subject?.name ?? fact.subjectLabel;
      const objectName = object?.name ?? fact.objectLabel;
      const forbiddenContinuityIds = CONTINUITIES.map((continuity) => continuity.id)
        .filter((id) => id !== continuityId);
      const difficulty = ["easy", "medium", "hard"][queryIndex % 3];
      let includeFuture = false;
      let question;

      switch (taskType) {
        case "fact_recall":
          question = `${continuityId} 세계선 ${chapterNum}화에서 ${subjectName}과 관련해 확인된 '${fact.objectLabel}' 기록은 무엇인가?`;
          break;
        case "relationship_state":
          question = `${continuityId} 세계선 ${chapterNum}화에서 ${subjectName}과(와) ${objectName}의 관계는 어떻게 바뀌었는가?`;
          break;
        case "knowledge_state":
          question = `${continuityId} 세계선 ${chapterNum}화까지 ${subjectName}은(는) '${fact.objectLabel}'을(를) 알고 있었는가?`;
          break;
        case "event_causality":
          question = `${continuityId} 세계선 ${chapterNum}화에서 확인된 백야 관측소 붕괴의 직접 원인은 무엇인가?`;
          break;
        case "temporal_order":
          question = `${continuityId} 세계선에서 ${subjectName}이(가) '${fact.objectLabel}' 상태가 된 것은 몇 화부터인가?`;
          break;
        case "worldline_isolation":
          question = `${continuityId} 세계선 ${chapterNum}화 시점의 ${subjectName} 생존 상태는 무엇인가?`;
          break;
        case "future_leakage_guard":
          question = `${continuityId} 세계선 ${chapterNum}화까지만 읽었을 때 ${subjectName}의 '${fact.objectLabel}' 정보는 확인 가능한가?`;
          break;
        case "alias_disambiguation":
          question = `${continuityId} 세계선 ${chapterNum}화 기록의 '${fact.objectLabel}' 호칭은 누구를 가리키는가?`;
          break;
        case "forecast_status":
          includeFuture = true;
          question = `${continuityId} 세계선 ${chapterNum}화의 '${subjectName} ${fact.objectLabel}' 기록은 예측인가, 이미 확정된 상태인가?`;
          break;
        case "draft_canon_conflict":
          question = `${continuityId} 세계선 ${chapterNum}화 정본에서 ${subjectName}의 '${fact.objectLabel}' 상태는 무엇이며 다른 세계선 기록과 분리해야 하는가?`;
          break;
        default:
          question = `${continuityId} 세계선 ${chapterNum}화에서 ${subjectName}의 상태를 확인하라.`;
      }

      question = renderKoreanParticles(question);
      if (usedQuestions.has(question)) {
        throw new Error(`Duplicate gold question generated: ${question}`);
      }
      usedQuestions.add(question);

      const chapterText = chapterTexts[chapterNum - 1];
      const statementIndex = chapterText.indexOf(fact.statement);
      if (statementIndex < 0) {
        throw new Error(`Fact statement not found in chapter ${chapterNum}: ${fact.factId}`);
      }
      const startOffset = [...chapterText.slice(0, statementIndex)].length;
      const endOffset = startOffset + [...fact.statement].length;
      const chapterId = `chapter-${String(chapterNum).padStart(3, "0")}`;
      const chapterScenes = scenes.filter((scene) => scene.chapterId === chapterId);
      const matchingScene = chapterScenes.find(
        (scene) => scene.startOffset <= startOffset && scene.endOffset >= endOffset
      ) ?? chapterScenes.find(
        (scene) => scene.startOffset <= startOffset && scene.endOffset > startOffset
      ) ?? chapterScenes[0];
      const evidenceId = `evidence-${String(qId).padStart(3, "0")}`;
      fact.evidenceIds.push(evidenceId);

      evidences.push({
        evidenceId,
        queryId,
        chapterId,
        sceneId: matchingScene.sceneId,
        continuityId,
        quote: fact.statement,
        startOffset,
        endOffset,
        chapterSha256: crypto.createHash("sha256").update(chapterText, "utf8").digest("hex"),
      });

      queries.push({
        queryId,
        taskType,
        difficulty,
        question,
        continuityId,
        allowedUntilChapter: chapterNum,
        includeFuture,
        expectedFactIds: [fact.factId],
        forbiddenEvidenceAfterChapter: chapterNum,
        forbiddenContinuityIds: taskType === "draft_canon_conflict" ? [] : forbiddenContinuityIds,
      });
    }
  }

  return { queries, evidences };
}

// ─── Main Generation Pipeline ────────────────────────────────────────────────

function main() {
  console.log(`[generate] Generating Korean Narrative Gold Corpus: ${TITLE}`);
  console.log(`[generate] Seed: ${SEED}`);
  console.log(`[generate] Output: ${OUTPUT_ROOT}`);

  // Step 1: Generate characters
  console.log("[generate] Step 1/7: Generating characters...");
  const characters = generateCharacters();

  // Step 2: Generate relations
  console.log("[generate] Step 2/7: Generating relations...");
  const relations = generateRelations(characters);

  // Step 3: Generate chapter texts
  console.log("[generate] Step 3/7: Generating 120 chapter manuscripts...");
  const chapterTexts = [];
  for (let ch = 1; ch <= TOTAL_CHAPTERS; ch++) {
    chapterTexts.push(generateChapterText(characters, ch));
  }

  // Step 4: Generate scenes
  console.log("[generate] Step 4/7: Generating scenes...");
  const scenes = generateScenes(characters, chapterTexts);

  // Step 5: Generate facts
  console.log("[generate] Step 5/7: Generating facts...");
  const facts = generateFacts(characters, scenes);

  // Step 6: Generate queries and evidence
  console.log("[generate] Step 6/7: Generating queries and evidence...");
  const { queries, evidences } = generateQueriesAndEvidence(characters, facts, scenes, chapterTexts);

  // Step 7: Write output
  console.log("[generate] Step 7/7: Writing output files...");

  // Create directory structure
  const dirs = [
    OUTPUT_ROOT,
    path.join(OUTPUT_ROOT, "manuscript"),
    path.join(OUTPUT_ROOT, "structure"),
    path.join(OUTPUT_ROOT, "gold"),
    path.join(OUTPUT_ROOT, "reports"),
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write manuscripts
  const chapterMeta = [];
  for (let ch = 1; ch <= TOTAL_CHAPTERS; ch++) {
    const filename = `chapter_${String(ch).padStart(3, "0")}.txt`;
    const filepath = path.join(OUTPUT_ROOT, "manuscript", filename);
    fs.writeFileSync(filepath, chapterTexts[ch - 1], "utf8");

    const hash = crypto.createHash("sha256").update(chapterTexts[ch - 1], "utf8").digest("hex");
    const charCount = [...chapterTexts[ch - 1]].length;
    const chapterScenes = scenes.filter(
      (s) => s.chapterId === `chapter-${String(ch).padStart(3, "0")}`
    );

    chapterMeta.push({
      chapterId: `chapter-${String(ch).padStart(3, "0")}`,
      chapterNumber: ch,
      title: generateChapterTitle(ch),
      continuityId: getContinuityForChapter(ch),
      relativePath: `manuscript/${filename}`,
      charCount,
      sha256: hash,
      sceneIds: chapterScenes.map((s) => s.sceneId),
    });
  }

  // Write structure files
  writeJsonl(path.join(OUTPUT_ROOT, "structure", "chapters.jsonl"), chapterMeta);
  writeJsonl(path.join(OUTPUT_ROOT, "structure", "scenes.jsonl"), scenes);
  writeJsonl(
    path.join(OUTPUT_ROOT, "structure", "characters.jsonl"),
    characters.map((c) => ({
      characterId: c.characterId,
      name: c.name,
      aliases: c.aliases,
      role: c.role,
      organization: c.organization,
      isCore: c.isCore,
      introducedChapter: c.introducedChapter,
    }))
  );
  writeJson(path.join(OUTPUT_ROOT, "structure", "continuities.json"), CONTINUITIES.map((c) => ({
    continuityId: c.id,
    label: c.label,
    parentContinuityId: c.parent,
    divergenceChapter: c.divergenceChapter,
    chapterRanges: c.id === "return" ? [[61, 90], [106, 120]] : c.id === "if" ? [[91, 105]] : [[1, 60]],
  })));
  writeJsonl(path.join(OUTPUT_ROOT, "structure", "relations.jsonl"), relations);
  writeJsonl(path.join(OUTPUT_ROOT, "structure", "facts.jsonl"), facts);

  // Write gold files
  writeJsonl(path.join(OUTPUT_ROOT, "gold", "queries.jsonl"), queries);
  writeJsonl(path.join(OUTPUT_ROOT, "gold", "answers.jsonl"), queries.map((q) => ({
    queryId: q.queryId,
    expectedFactIds: q.expectedFactIds,
    taskType: q.taskType,
  })));
  writeJsonl(path.join(OUTPUT_ROOT, "gold", "evidence.jsonl"), evidences);

  // Write corpus manifest
  const manifest = {
    corpusId: CORPUS_ID,
    title: TITLE,
    seed: SEED,
    language: LANGUAGE,
    datasetKind: DATASET_KIND,
    fixtureRole: "legacy_stress_noise_fixture",
    benchmarkEligibility: false,
    generatorVersion: GENERATOR_VERSION,
    generatedAt: "2026-08-27T00:00:00+09:00",
    totalChapters: TOTAL_CHAPTERS,
    totalCharacters: TOTAL_CHARACTERS,
    totalContinuities: CONTINUITY_COUNT,
    totalRelationTypes: new Set(relations.map((r) => r.relationType)).size,
    totalQueries: queries.length,
    taxonomyCoverage: Object.fromEntries(
      TAXONOMY.map((t) => [t, queries.filter((q) => q.taskType === t).length])
    ),
    chapterCharCountRange: { min: TARGET_MIN_CHARS, max: TARGET_MAX_CHARS },
    humanReviewStatus: "unreviewed",
    canFinalizeProductThresholds: false,
    canReplaceRealWriterBeta: false,
    quality: "noise-heavy",
    dataQualityLabel: "NOISE",
  };
  writeJson(path.join(OUTPUT_ROOT, "corpus_manifest.json"), manifest);

  // Write rights
  const rights = {
    corpusId: CORPUS_ID,
    ownership: "Luie Project",
    generatedBy: "scripts/generate-korean-narrative-gold-corpus.mjs",
    seed: SEED,
    externalSourcesUsed: false,
    parallelFictionUsed: false,
    commercialNovelUsed: false,
    restrictions: [
      "외부 웹소설 본문, 번역문, 인물명, 고유 설정, 장면 배열을 입력이나 템플릿으로 사용하지 않음",
      "장르 관습과 일반적인 한국어 문법만 사용",
      "사람 검수 전 제품 정확도 임계값 확정에 사용하지 않음",
    ],
    humanReviewStatus: "unreviewed",
    canFinalizeProductThresholds: false,
  };
  writeJson(path.join(OUTPUT_ROOT, "rights.json"), rights);

  // Write validation report placeholder
  const report = {
    corpusId: CORPUS_ID,
    generatorVersion: GENERATOR_VERSION,
    validatedAt: null,
    status: "pending",
    checks: [],
  };
  writeJson(path.join(OUTPUT_ROOT, "reports", "validation-report.json"), report);

  // Write README
  const readme = `# ${TITLE} — Legacy Stress/Noise Fixture

## 개요

- Corpus ID: \`${CORPUS_ID}\`
- 언어: ${LANGUAGE}
- 회차 수: ${TOTAL_CHAPTERS}
- 등장인물: ${TOTAL_CHARACTERS}명
- 세계선: ${CONTINUITY_COUNT}개 (prime, return, if)
- Gold Query: ${queries.length}개
- 생성 Seed: \`${SEED}\`
- Generator Version: ${GENERATOR_VERSION}

## 용도

이 120화 corpus는 정식 Narrative RAG acceptance gold가 아니다.
반복 문장과 구조 fact의 직접 노출이 많으므로 \`legacy_stress_noise_fixture\`로만 보존한다.

- 허용: 대용량 ingestion, offset/hash, 재현성, 반복 noise 검색, 성능·메모리 stress regression
- 금지: 제품 정확도 임계값 확정, 장르 지원 주장, human-reviewed gold 주장
- 신규 benchmark: \`docs/architecture/narrative-rag-benchmark-ssot.md\`의 S(20화 이하)부터 시작

## 권리

- 이 프로젝트를 위해 새로 생성한 원고이다.
- 외부 상업 웹소설 본문을 입력으로 사용하지 않았다.
- ParallelFiction-Ja_En-100k는 이 corpus 생성 입력으로 사용하지 않았다.

## 구조

\`\`\`
manuscript/         원문 정본 (chapter_001.txt ~ chapter_120.txt)
structure/          구조 파생 데이터 (chapters, scenes, characters, continuities, relations, facts)
gold/               gold query, answer, evidence
reports/            검증 보고서
\`\`\`

## 재생성

\`\`\`bash
pnpm run corpus:legacy:generate
\`\`\`

같은 seed와 generator version은 byte-identical output을 보장한다.

## 검증

\`\`\`bash
pnpm run corpus:legacy:validate
\`\`\`

## 상태

- fixtureRole: legacy_stress_noise_fixture
- dataQualityLabel: NOISE
- benchmarkEligibility: false
- humanReviewStatus: unreviewed
- canFinalizeProductThresholds: false
- canReplaceRealWriterBeta: false
`;
  fs.writeFileSync(path.join(OUTPUT_ROOT, "README.md"), readme, "utf8");

  // Summary
  const uniqueRelTypes = new Set(relations.map((r) => r.relationType)).size;
  console.log("\n[generate] ═══ Generation Complete ═══");
  console.log(`[generate] Chapters: ${TOTAL_CHAPTERS}`);
  console.log(`[generate] Characters: ${characters.length}`);
  console.log(`[generate] Relations: ${relations.length} (${uniqueRelTypes} types)`);
  console.log(`[generate] Scenes: ${scenes.length}`);
  console.log(`[generate] Facts: ${facts.length}`);
  console.log(`[generate] Queries: ${queries.length}`);
  console.log(`[generate] Evidence: ${evidences.length}`);
  console.log(`[generate] Taxonomy coverage:`);
  for (const t of TAXONOMY) {
    console.log(`[generate]   ${t}: ${queries.filter((q) => q.taskType === t).length}`);
  }

  // Verify char counts
  let minChars = Infinity;
  let maxChars = 0;
  for (let i = 0; i < chapterTexts.length; i++) {
    const len = [...chapterTexts[i]].length;
    if (len < minChars) minChars = len;
    if (len > maxChars) maxChars = len;
  }
  console.log(`[generate] Char count range: ${minChars} ~ ${maxChars}`);
  console.log(`[generate] Output: ${OUTPUT_ROOT}`);
}

// ─── Utility Functions ───────────────────────────────────────────────────────

function writeJson(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function writeJsonl(filepath, items) {
  const lines = items.map((item) => JSON.stringify(item));
  fs.writeFileSync(filepath, lines.join("\n") + "\n", "utf8");
}

// ─── Execute ─────────────────────────────────────────────────────────────────

main();
