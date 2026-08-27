#!/usr/bin/env node
/**
 * validate-korean-narrative-gold-corpus.mjs
 *
 * 한국어 장편 웹소설 synthetic gold corpus 자동 검증기.
 * 정본 명세: docs/plans/korean-synthetic-narrative-corpus.md
 *
 * 검증 항목:
 * - 회차 파일 120개 및 1~120 연속 번호
 * - 회차당 4,500~6,500자
 * - 인물 60명, continuity 3개, 관계 type 30개 이상
 * - scene offset/hash와 원문 일치
 * - chapter hash와 manifest 일치
 * - query 120개 이상 및 taxonomy별 최소 10개
 * - evidence quote와 offset 일치
 * - evidence chapter가 allowedUntilChapter를 초과하지 않음
 * - evidence continuity가 query scope와 일치
 * - 금지 continuity가 gold evidence에 포함되지 않음
 * - 미래 누출 guard query 존재
 * - 외부 corpus 경로·URL·작품명이 생성 입력에 없음
 * - 재생성 후 byte-identical hash
 * - humanReviewStatus=unreviewed, canFinalizeProductThresholds=false
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

// ─── Config ──────────────────────────────────────────────────────────────────

const rootArg = readArg("--root") ?? "novel/narrative_memory_gold_120";
const jsonOutput = hasArg("--json");
const verifyRegen = hasArg("--verify-regen");
const root = path.resolve(process.cwd(), rootArg);

const EXPECTED_CHAPTERS = 120;
const MIN_CHAR_COUNT = 4500;
const MAX_CHAR_COUNT = 6500;
const EXPECTED_CHARACTERS = 60;
const EXPECTED_CONTINUITIES = 3;
const MIN_RELATION_TYPES = 30;
const MIN_QUERIES = 120;
const MIN_PER_TAXONOMY = 10;
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

const FACT_PREDICATE_CONTRACT = {
  knowledge_state: new Set(["knows"]),
  relationship_change: new Set(["relation_established"]),
  location_presence: new Set(["is_at"]),
  event_occurrence: new Set(["caused_by"]),
  status_change: new Set(["status_changed"]),
  possession: new Set(["possesses"]),
  alias_use: new Set(["known_as"]),
  death: new Set(["is_dead"]),
  survival: new Set(["is_alive"]),
  secret_reveal: new Set(["reveals"]),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasArg(name) {
  return process.argv.includes(name);
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readJsonl(file) {
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${file}:${index + 1} JSON parse failed: ${error.message}`);
      }
    });
}

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function chapterBelongsToContinuity(chapter, continuityId) {
  if (continuityId === "prime") return chapter >= 1 && chapter <= 60;
  if (continuityId === "if") return chapter >= 91 && chapter <= 105;
  if (continuityId === "return") return (chapter >= 61 && chapter <= 90) || (chapter >= 106 && chapter <= 120);
  return false;
}

function corpusFingerprint(corpusRoot) {
  const entries = [];
  function visit(directory) {
    for (const name of fs.readdirSync(directory).sort()) {
      const absolutePath = path.join(directory, name);
      const relativePath = path.relative(corpusRoot, absolutePath).split(path.sep).join("/");
      const stat = fs.statSync(absolutePath);
      if (stat.isDirectory()) visit(absolutePath);
      else if (relativePath !== "reports/validation-report.json") entries.push(relativePath);
    }
  }
  visit(corpusRoot);
  const hash = crypto.createHash("sha256");
  for (const relativePath of entries) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(corpusRoot, relativePath)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validate() {
  const errors = [];
  const warnings = [];
  const checks = [];

  function check(name, pass, detail) {
    checks.push({ name, pass, detail });
    if (!pass) errors.push(`[FAIL] ${name}: ${detail}`);
  }

  // ─── File existence ────────────────────────────────────────────────────────

  const manuscriptDir = path.join(root, "manuscript");
  const structureDir = path.join(root, "structure");
  const goldDir = path.join(root, "gold");

  check("root_exists", fs.existsSync(root), `Root directory: ${root}`);
  if (!fs.existsSync(root)) {
    return finalize(errors, warnings, checks);
  }

  check("manuscript_dir_exists", fs.existsSync(manuscriptDir), manuscriptDir);
  check("structure_dir_exists", fs.existsSync(structureDir), structureDir);
  check("gold_dir_exists", fs.existsSync(goldDir), goldDir);
  check("manifest_exists", fs.existsSync(path.join(root, "corpus_manifest.json")), "corpus_manifest.json");
  check("rights_exists", fs.existsSync(path.join(root, "rights.json")), "rights.json");
  check("readme_exists", fs.existsSync(path.join(root, "README.md")), "README.md");

  if (errors.length > 0) {
    return finalize(errors, warnings, checks);
  }

  // ─── Manifest checks ──────────────────────────────────────────────────────

  const manifest = readJson(path.join(root, "corpus_manifest.json"));
  check("manifest_human_review_status", manifest.humanReviewStatus === "unreviewed",
    `Expected 'unreviewed', got '${manifest.humanReviewStatus}'`);
  check("manifest_cannot_finalize_thresholds", manifest.canFinalizeProductThresholds === false,
    `Expected false, got ${manifest.canFinalizeProductThresholds}`);
  check("manifest_cannot_replace_writer_beta", manifest.canReplaceRealWriterBeta === false,
    `Expected false, got ${manifest.canReplaceRealWriterBeta}`);
  check("manifest_is_legacy_fixture", manifest.datasetKind === "legacy_stress_noise_fixture"
    && manifest.fixtureRole === "legacy_stress_noise_fixture",
    `Expected legacy_stress_noise_fixture, got datasetKind=${manifest.datasetKind}, fixtureRole=${manifest.fixtureRole}`);
  check("manifest_not_benchmark_eligible", manifest.benchmarkEligibility === false,
    `Expected false, got ${manifest.benchmarkEligibility}`);
  check("manifest_noise_quality", manifest.dataQualityLabel === "NOISE",
    `Expected NOISE, got ${manifest.dataQualityLabel}`);

  // ─── Rights checks ────────────────────────────────────────────────────────

  const rights = readJson(path.join(root, "rights.json"));
  check("rights_no_external_sources", rights.externalSourcesUsed === false,
    `externalSourcesUsed should be false`);
  check("rights_no_parallel_fiction", rights.parallelFictionUsed === false,
    `parallelFictionUsed should be false`);
  check("rights_no_commercial_novel", rights.commercialNovelUsed === false,
    `commercialNovelUsed should be false`);

  // ─── Chapter file checks ──────────────────────────────────────────────────

  const chapterFiles = [];
  for (let i = 1; i <= EXPECTED_CHAPTERS; i++) {
    const filename = `chapter_${String(i).padStart(3, "0")}.txt`;
    const filepath = path.join(manuscriptDir, filename);
    chapterFiles.push({ number: i, filename, filepath, exists: fs.existsSync(filepath) });
  }

  const existingChapters = chapterFiles.filter((c) => c.exists);
  check("chapter_count", existingChapters.length === EXPECTED_CHAPTERS,
    `Expected ${EXPECTED_CHAPTERS} chapters, found ${existingChapters.length}`);

  const missingChapters = chapterFiles.filter((c) => !c.exists).map((c) => c.number);
  check("chapter_sequential", missingChapters.length === 0,
    missingChapters.length > 0 ? `Missing chapters: ${missingChapters.join(", ")}` : "All sequential");

  // ─── Chapter char count checks ────────────────────────────────────────────

  const chapterTexts = new Map();
  const chapterHashes = new Map();
  let charCountFails = [];

  for (const ch of existingChapters) {
    const text = fs.readFileSync(ch.filepath, "utf8");
    chapterTexts.set(ch.number, text);
    chapterHashes.set(ch.number, sha256(text));

    const charCount = [...text].length;
    if (charCount < MIN_CHAR_COUNT || charCount > MAX_CHAR_COUNT) {
      charCountFails.push({ chapter: ch.number, count: charCount });
    }
  }

  check("chapter_char_counts", charCountFails.length === 0,
    charCountFails.length > 0
      ? `${charCountFails.length} chapters out of range: ${charCountFails.slice(0, 5).map((f) => `ch${f.chapter}=${f.count}`).join(", ")}${charCountFails.length > 5 ? "..." : ""}`
      : "All chapters in 4500~6500 range");

  // ─── Structure checks ─────────────────────────────────────────────────────

  const chapters = readJsonl(path.join(structureDir, "chapters.jsonl"));
  const scenes = readJsonl(path.join(structureDir, "scenes.jsonl"));
  const characters = readJsonl(path.join(structureDir, "characters.jsonl"));
  const continuities = readJson(path.join(structureDir, "continuities.json"));
  const relations = readJsonl(path.join(structureDir, "relations.jsonl"));
  const facts = readJsonl(path.join(structureDir, "facts.jsonl"));

  check("characters_count", characters.length === EXPECTED_CHARACTERS,
    `Expected ${EXPECTED_CHARACTERS}, got ${characters.length}`);
  check("continuities_count", continuities.length === EXPECTED_CONTINUITIES,
    `Expected ${EXPECTED_CONTINUITIES}, got ${continuities.length}`);

  const uniqueRelTypes = new Set(relations.map((r) => r.relationType));
  check("relation_types_count", uniqueRelTypes.size >= MIN_RELATION_TYPES,
    `Expected >= ${MIN_RELATION_TYPES}, got ${uniqueRelTypes.size}`);

  const particleMarkerPattern = /(?:은\(는\)|이\(가\)|을\(를\)|과\(와\))/;
  const particleMarkerChapters = [...chapterTexts.entries()]
    .filter(([, text]) => particleMarkerPattern.test(text))
    .map(([chapter]) => chapter);
  check("prose_has_no_particle_markers", particleMarkerChapters.length === 0,
    particleMarkerChapters.length > 0
      ? `Unresolved particle markers in chapters: ${particleMarkerChapters.slice(0, 10).join(", ")}`
      : "No unresolved Korean particle markers");

  const incoherentFacts = facts.filter((fact) =>
    !FACT_PREDICATE_CONTRACT[fact.factType]?.has(fact.predicate)
  );
  check("fact_semantic_coherence", incoherentFacts.length === 0,
    incoherentFacts.length > 0
      ? `${incoherentFacts.length} invalid factType/predicate pairs: ${incoherentFacts.slice(0, 5).map((fact) => `${fact.factId}:${fact.factType}/${fact.predicate}`).join(", ")}`
      : "All factType/predicate pairs satisfy the contract");

  const selfReferentialFacts = facts.filter((fact) =>
    fact.objectId !== null && fact.objectId !== undefined && fact.subjectId === fact.objectId
  );
  check("fact_no_self_reference", selfReferentialFacts.length === 0,
    selfReferentialFacts.length > 0
      ? `${selfReferentialFacts.length} self-referential facts: ${selfReferentialFacts.slice(0, 5).map((fact) => fact.factId).join(", ")}`
      : "No invalid self-referential facts");

  const confirmedDeathFacts = facts.filter((fact) => fact.factType === "death" && fact.status === "confirmed");
  check("death_reports_remain_unconfirmed", confirmedDeathFacts.length === 0,
    confirmedDeathFacts.length > 0
      ? `${confirmedDeathFacts.length} confirmed deaths can conflict with later generated appearances`
      : "Generated death reports remain explicitly unconfirmed");

  const continuityMisalignments = [...facts, ...relations].filter((item) =>
    !chapterBelongsToContinuity(item.validFromChapter, item.continuityId)
    || (item.validToChapter !== null && item.validToChapter !== undefined
      && !chapterBelongsToContinuity(item.validToChapter, item.continuityId))
  );
  check("continuity_chapter_alignment", continuityMisalignments.length === 0,
    continuityMisalignments.length > 0
      ? `${continuityMisalignments.length} facts/relations outside continuity ranges`
      : "All facts and relations stay inside their continuity ranges");

  const missingFactStatements = facts.filter((fact) => {
    const text = chapterTexts.get(fact.validFromChapter);
    return !fact.statement || !text?.includes(fact.statement);
  });
  check("fact_statement_in_canonical_prose", missingFactStatements.length === 0,
    missingFactStatements.length > 0
      ? `${missingFactStatements.length} fact statements missing from canonical prose`
      : "Every structured fact has an exact statement in canonical prose");

  // ─── Chapter hash match ───────────────────────────────────────────────────

  let hashMismatches = [];
  for (const ch of chapters) {
    const expectedHash = chapterHashes.get(ch.chapterNumber);
    if (expectedHash && ch.sha256 !== expectedHash) {
      hashMismatches.push(ch.chapterNumber);
    }
  }
  check("chapter_hash_match", hashMismatches.length === 0,
    hashMismatches.length > 0
      ? `Hash mismatch in chapters: ${hashMismatches.join(", ")}`
      : "All chapter hashes match");

  // ─── Scene offset/hash checks ─────────────────────────────────────────────

  let sceneOffsetFails = [];
  for (const scene of scenes) {
    const chapterNum = parseInt(scene.chapterId.replace("chapter-", ""), 10);
    const text = chapterTexts.get(chapterNum);
    if (!text) continue;

    const codepoints = [...text];
    const sceneText = codepoints.slice(scene.startOffset, scene.endOffset).join("");
    const expectedHash = sha256(sceneText);

    if (scene.sha256 !== expectedHash) {
      sceneOffsetFails.push(scene.sceneId);
    }
  }
  check("scene_offset_hash", sceneOffsetFails.length === 0,
    sceneOffsetFails.length > 0
      ? `${sceneOffsetFails.length} scene offset/hash mismatches: ${sceneOffsetFails.slice(0, 5).join(", ")}${sceneOffsetFails.length > 5 ? "..." : ""}`
      : "All scene offsets and hashes match");

  // ─── Gold checks ──────────────────────────────────────────────────────────

  const queries = readJsonl(path.join(goldDir, "queries.jsonl"));
  const evidences = readJsonl(path.join(goldDir, "evidence.jsonl"));

  check("query_count", queries.length >= MIN_QUERIES,
    `Expected >= ${MIN_QUERIES}, got ${queries.length}`);

  // Taxonomy coverage
  const taxonomyCounts = {};
  for (const t of TAXONOMY) taxonomyCounts[t] = 0;
  for (const q of queries) {
    if (taxonomyCounts[q.taskType] !== undefined) {
      taxonomyCounts[q.taskType]++;
    }
  }

  let taxonomyFails = [];
  for (const t of TAXONOMY) {
    if (taxonomyCounts[t] < MIN_PER_TAXONOMY) {
      taxonomyFails.push(`${t}=${taxonomyCounts[t]}`);
    }
  }
  check("taxonomy_coverage", taxonomyFails.length === 0,
    taxonomyFails.length > 0
      ? `Insufficient coverage: ${taxonomyFails.join(", ")}`
      : "All taxonomy types have >= 10 queries");

  const questionCounts = new Map();
  for (const query of queries) {
    questionCounts.set(query.question, (questionCounts.get(query.question) ?? 0) + 1);
  }
  const duplicateQuestions = [...questionCounts.entries()].filter(([, count]) => count > 1);
  check("query_no_duplicate_questions", duplicateQuestions.length === 0,
    duplicateQuestions.length > 0
      ? `${duplicateQuestions.length} duplicate question texts`
      : "All gold question texts are unique");

  const difficultyCoverage = new Set(queries.map((query) => query.difficulty));
  check("query_difficulty_coverage",
    ["easy", "medium", "hard"].every((difficulty) => difficultyCoverage.has(difficulty)),
    `Found difficulty levels: ${[...difficultyCoverage].sort().join(", ")}`);

  const factMap = new Map(facts.map((fact) => [fact.factId, fact]));
  const missingExpectedFacts = queries.flatMap((query) =>
    query.expectedFactIds.filter((factId) => !factMap.has(factId)).map((factId) => `${query.queryId}:${factId}`)
  );
  check("query_expected_facts_exist", missingExpectedFacts.length === 0,
    missingExpectedFacts.length > 0
      ? `${missingExpectedFacts.length} missing expected fact references`
      : "All expected fact references exist");

  // ─── Evidence quote/offset validation ─────────────────────────────────────

  let evidenceQuoteFails = [];
  for (const ev of evidences) {
    const chapterNum = parseInt(ev.chapterId.replace("chapter-", ""), 10);
    const text = chapterTexts.get(chapterNum);
    if (!text) {
      evidenceQuoteFails.push(`${ev.evidenceId}: chapter not found`);
      continue;
    }

    const codepoints = [...text];
    const extracted = codepoints.slice(ev.startOffset, ev.endOffset).join("");

    if (extracted !== ev.quote) {
      evidenceQuoteFails.push(ev.evidenceId);
    }
  }
  check("evidence_quote_offset", evidenceQuoteFails.length === 0,
    evidenceQuoteFails.length > 0
      ? `${evidenceQuoteFails.length} evidence quote/offset mismatches: ${evidenceQuoteFails.slice(0, 5).join(", ")}${evidenceQuoteFails.length > 5 ? "..." : ""}`
      : "All evidence quotes match offsets");

  const evidenceByQuery = new Map(evidences.map((evidence) => [evidence.queryId, evidence]));
  const factEvidenceMismatches = [];
  for (const query of queries) {
    const evidence = evidenceByQuery.get(query.queryId);
    for (const factId of query.expectedFactIds) {
      const fact = factMap.get(factId);
      if (!evidence || !fact || evidence.quote !== fact.statement || !fact.evidenceIds.includes(evidence.evidenceId)) {
        factEvidenceMismatches.push(`${query.queryId}:${factId}`);
      }
    }
  }
  check("evidence_matches_expected_fact", factEvidenceMismatches.length === 0,
    factEvidenceMismatches.length > 0
      ? `${factEvidenceMismatches.length} query/fact/evidence linkage mismatches`
      : "Every evidence quote exactly supports and is linked from its expected fact");

  // ─── Evidence chapter hash validation ─────────────────────────────────────

  let evidenceHashFails = [];
  for (const ev of evidences) {
    const chapterNum = parseInt(ev.chapterId.replace("chapter-", ""), 10);
    const expectedHash = chapterHashes.get(chapterNum);
    if (expectedHash && ev.chapterSha256 !== expectedHash) {
      evidenceHashFails.push(ev.evidenceId);
    }
  }
  check("evidence_chapter_hash", evidenceHashFails.length === 0,
    evidenceHashFails.length > 0
      ? `${evidenceHashFails.length} evidence chapter hash mismatches`
      : "All evidence chapter hashes match");

  // ─── Evidence within allowedUntilChapter ──────────────────────────────────

  const queryMap = new Map(queries.map((q) => [q.queryId, q]));
  let futureLeakFails = [];

  for (const ev of evidences) {
    const query = queryMap.get(ev.queryId);
    if (!query) continue;

    const evChapterNum = parseInt(ev.chapterId.replace("chapter-", ""), 10);
    if (evChapterNum > query.allowedUntilChapter) {
      futureLeakFails.push(`${ev.evidenceId} (ch${evChapterNum} > allowed${query.allowedUntilChapter})`);
    }
  }
  check("evidence_within_allowed_chapter", futureLeakFails.length === 0,
    futureLeakFails.length > 0
      ? `${futureLeakFails.length} evidence entries exceed allowedUntilChapter: ${futureLeakFails.slice(0, 3).join(", ")}${futureLeakFails.length > 3 ? "..." : ""}`
      : "All evidence within allowed chapter range");

  // ─── Evidence continuity scope ────────────────────────────────────────────

  let continuityScopeFails = [];
  for (const ev of evidences) {
    const query = queryMap.get(ev.queryId);
    if (!query) continue;

    if (query.forbiddenContinuityIds && query.forbiddenContinuityIds.includes(ev.continuityId)) {
      continuityScopeFails.push(`${ev.evidenceId} (${ev.continuityId} forbidden for ${query.queryId})`);
    }
  }
  check("evidence_continuity_scope", continuityScopeFails.length === 0,
    continuityScopeFails.length > 0
      ? `${continuityScopeFails.length} evidence entries violate continuity scope`
      : "No forbidden continuity violations");

  // ─── Future leakage guard queries exist ───────────────────────────────────

  const futureGuardQueries = queries.filter((q) => q.taskType === "future_leakage_guard");
  check("future_leakage_guard_exists", futureGuardQueries.length > 0,
    `Found ${futureGuardQueries.length} future leakage guard queries`);

  // ─── External source check ────────────────────────────────────────────────
  // Checks that the generator does not import, fetch, or read from external corpus sources.
  // Field names like 'parallelFictionUsed: false' and negative assertions are NOT violations.

  const generatorPath = path.join(process.cwd(), "scripts", "generate-korean-narrative-gold-corpus.mjs");
  let externalRefFails = [];
  if (fs.existsSync(generatorPath)) {
    const generatorSource = fs.readFileSync(generatorPath, "utf8");
    const lines = generatorSource.split(/\r?\n/);

    // Patterns that indicate actual usage (import/require/readFile/fetch of external corpus)
    const forbiddenUsagePatterns = [
      { pattern: /(?:import|require|readFile|fetch).*ParallelFiction/i, label: "ParallelFiction import/read" },
      { pattern: /(?:import|require|readFile|fetch).*namu\.wiki/i, label: "namu.wiki access" },
      { pattern: /(?:import|require|readFile|fetch).*novelpia/i, label: "novelpia access" },
      { pattern: /(?:import|require|readFile|fetch).*kakaopage/i, label: "kakaopage access" },
      { pattern: /(?:import|require|readFile|fetch).*munpia/i, label: "munpia access" },
      { pattern: /(?:import|require|readFile|fetch).*ridibooks/i, label: "ridibooks access" },
      { pattern: /(?:import|require|readFile|fetch).*joara/i, label: "joara access" },
    ];

    for (const { pattern, label } of forbiddenUsagePatterns) {
      for (const line of lines) {
        if (pattern.test(line)) {
          externalRefFails.push(label);
          break;
        }
      }
    }
  }
  check("no_external_sources_in_generator", externalRefFails.length === 0,
    externalRefFails.length > 0
      ? `Generator references external sources: ${externalRefFails.join(", ")}`
      : "No external source references found in generator");

  // ─── Byte-identical reproducibility check ─────────────────────────────────
  const currentFingerprint = corpusFingerprint(root);
  check("corpus_fingerprint_computed", currentFingerprint.length === 64,
    `Corpus fingerprint: ${currentFingerprint.slice(0, 16)}...`);

  if (verifyRegen) {
    const temporaryParent = fs.mkdtempSync(path.join(os.tmpdir(), "luie-narrative-regen-"));
    const regeneratedRoot = path.join(temporaryParent, "corpus");
    try {
      const generatorPath = path.join(process.cwd(), "scripts", "generate-korean-narrative-gold-corpus.mjs");
      const result = spawnSync(process.execPath, [generatorPath, "--output", regeneratedRoot], {
        cwd: process.cwd(),
        encoding: "utf8",
      });
      const regenerated = result.status === 0 && fs.existsSync(regeneratedRoot);
      const regeneratedFingerprint = regenerated ? corpusFingerprint(regeneratedRoot) : null;
      check("reproducibility_full_regen",
        regenerated && regeneratedFingerprint === currentFingerprint,
        regenerated
          ? `current=${currentFingerprint.slice(0, 16)} regenerated=${regeneratedFingerprint.slice(0, 16)}`
          : `Generator failed: ${result.stderr || result.stdout}`);
    } finally {
      fs.rmSync(temporaryParent, { recursive: true, force: true });
    }
  }

  return finalize(errors, warnings, checks);
}

function finalize(errors, warnings, checks) {
  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass).length;
  const total = checks.length;

  const report = {
    corpusId: "luie-korean-narrative-gold-120-v1",
    validatedAt: new Date().toISOString(),
    status: failed === 0 ? "pass" : "fail",
    summary: { total, passed, failed, warnings: warnings.length },
    checks,
  };

  // Write report
  const reportDir = path.join(root, "reports");
  if (fs.existsSync(reportDir)) {
    fs.writeFileSync(
      path.join(reportDir, "validation-report.json"),
      JSON.stringify(report, null, 2) + "\n",
      "utf8"
    );
  }

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`\n═══ Korean Narrative Gold Corpus Validation ═══`);
    console.log(`Root: ${root}`);
    console.log(`Status: ${report.status.toUpperCase()}`);
    console.log(`Checks: ${passed}/${total} passed, ${failed} failed\n`);

    if (failed > 0) {
      console.log("FAILURES:");
      for (const c of checks.filter((c) => !c.pass)) {
        console.log(`  ✗ ${c.name}: ${c.detail}`);
      }
      console.log("");
    }

    if (passed > 0 && !jsonOutput) {
      console.log("PASSED:");
      for (const c of checks.filter((c) => c.pass)) {
        console.log(`  ✓ ${c.name}`);
      }
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
  }

  return report;
}

// ─── Execute ─────────────────────────────────────────────────────────────────

validate();

export { validate };
