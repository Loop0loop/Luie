#!/usr/bin/env node

import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { performance } from "node:perf_hooks";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:18081";
const corpusDir =
  process.argv[3] ??
  path.join(process.cwd(), "tests", ".tmp", "bge-public-domain-corpus");
const maxChunksPerLanguage = Number(process.argv[4] ?? 96);

const CASES = {
  en: [
    ["Who was Edmond Dantès promised to marry?", "Mercédès"],
    ["Which jealous shipmate plotted against Edmond?", "Danglars"],
    ["What fortress was used as Edmond's prison?", "Château d’If"],
    ["Who educated Edmond while he was imprisoned?", "Abbé Faria"],
    ["On which island was the hidden fortune found?", "Island of Monte Cristo"],
    ["Who was the daughter of Ali Pasha?", "Haydée"],
  ],
  ko: [
    ["김장로가 영어 가정교사에게 맡긴 딸은 누구인가?", "선형"],
    ["형식의 옛 스승 박진사의 딸은 누구인가?", "영채"],
    ["형식의 신문기자 친구는 누구인가?", "신우선"],
    ["영채가 기차에서 만나 삶을 바꾸게 된 여학생은 누구인가?", "병욱"],
    ["형식이 동시에 사랑한다고 갈등한 두 여성은 누구인가?", "선형과 영채"],
    ["수해 때문에 기차가 멈춘 역은 어디인가?", "삼랑진"],
  ],
  ja: [
    ["語り手の猫には名前がありますか？", "名前はまだ無い"],
    ["猫の飼い主は何の仕事をしていますか？", "職業は教師"],
    ["主人が胃のために飲む薬は何ですか？", "タカジヤスターゼ"],
    ["主人の友人である美学者は誰ですか？", "美学者迷亭君"],
    ["寒月君の演説の題目は何ですか？", "首縊りの力学"],
    ["猫が訪ねる隣家の猫は誰ですか？", "三毛"],
  ],
};

function normalize(text) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkText(text, maxChars = 480, overlapChars = 50) {
  const chunks = [];
  for (const paragraph of normalize(text).split(/\n\n+/)) {
    if (paragraph.length <= maxChars) {
      if (paragraph.length >= 80) chunks.push(paragraph);
      continue;
    }
    for (
      let start = 0;
      start < paragraph.length;
      start += maxChars - overlapChars
    ) {
      const chunk = paragraph.slice(start, start + maxChars).trim();
      if (chunk.length >= 80) chunks.push(chunk);
      if (start + maxChars >= paragraph.length) break;
    }
  }
  return chunks;
}

function includesAnswer(text, answer) {
  return answer
    .split("과 ")
    .every((term) =>
      text.toLocaleLowerCase().includes(term.toLocaleLowerCase()),
    );
}

function selectChunks(allChunks, cases, limit) {
  const selected = new Set();
  for (const [, answer] of cases) {
    const index = allChunks.findIndex((chunk) => includesAnswer(chunk, answer));
    if (index < 0) throw new Error(`정답 구절을 찾지 못했습니다: ${answer}`);
    selected.add(index);
  }
  const slots = Math.max(0, limit - selected.size);
  for (let i = 0; i < slots; i += 1) {
    selected.add(
      Math.floor(
        (i * Math.max(0, allChunks.length - 1)) / Math.max(1, slots - 1),
      ),
    );
  }
  return [...selected]
    .sort((a, b) => a - b)
    .map((index) => ({ index, text: allChunks[index] }));
}

async function embed(inputs) {
  const vectors = [];
  for (let offset = 0; offset < inputs.length; offset += 1) {
    const response = await fetch(`${baseUrl}/v1/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "bge-m3-q4_k_m",
        input: inputs.slice(offset, offset + 1),
      }),
    });
    if (!response.ok)
      throw new Error(
        `embedding HTTP ${response.status}: ${await response.text()}`,
      );
    const payload = await response.json();
    vectors.push(
      ...payload.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding),
    );
  }
  return vectors;
}

function cosine(a, b) {
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  return dot / Math.sqrt(aa * bb);
}

async function loadCorpora() {
  const english = await fsp.readFile(
    path.join(corpusDir, "en-count-of-monte-cristo.txt"),
    "utf8",
  );
  const japanese = await fsp.readFile(
    path.join(corpusDir, "ja-wagahai.txt"),
    "utf8",
  );
  const koreanFiles = (await fsp.readdir(corpusDir))
    .filter((name) => /^ko-mujeong-.*\.txt$/.test(name))
    .sort(
      (a, b) => Number(a.match(/-(\d+)/)?.[1]) - Number(b.match(/-(\d+)/)?.[1]),
    );
  const korean = (
    await Promise.all(
      koreanFiles.map((name) =>
        fsp.readFile(path.join(corpusDir, name), "utf8"),
      ),
    )
  ).join("\n\n");
  return {
    en: english.slice(
      english.indexOf("*** START OF THE PROJECT GUTENBERG EBOOK"),
    ),
    ko: korean
      .replace(/\{\{머리말[\s\S]*?\}\}/g, "")
      .replace(/\{\{문단 그림\}\}/g, ""),
    ja: japanese.slice(japanese.indexOf("吾輩《わがはい》は猫である")),
  };
}

async function main() {
  const corpora = await loadCorpora();
  const started = performance.now();
  const languages = {};

  for (const language of Object.keys(CASES)) {
    const allChunks = chunkText(corpora[language]);
    const chunks = selectChunks(
      allChunks,
      CASES[language],
      maxChunksPerLanguage,
    );
    const chunkVectors = await embed(chunks.map(({ text }) => text));
    const queryVectors = await embed(CASES[language].map(([query]) => query));
    const queries = CASES[language].map(([query, answer], queryIndex) => {
      const ranked = chunks
        .map(({ index, text }, candidateIndex) => ({
          index,
          text,
          score: cosine(queryVectors[queryIndex], chunkVectors[candidateIndex]),
        }))
        .sort((a, b) => b.score - a.score);
      const rank =
        ranked.findIndex(({ text }) => includesAnswer(text, answer)) + 1;
      return {
        query,
        answer,
        rank,
        topScore: Number(ranked[0].score.toFixed(4)),
      };
    });
    languages[language] = {
      sourceChars: corpora[language].length,
      allChunks: allChunks.length,
      benchmarkChunks: chunks.length,
      recallAt1:
        queries.filter(({ rank }) => rank === 1).length / queries.length,
      recallAt5:
        queries.filter(({ rank }) => rank > 0 && rank <= 5).length /
        queries.length,
      mrr:
        queries.reduce((sum, { rank }) => sum + (rank > 0 ? 1 / rank : 0), 0) /
        queries.length,
      queries,
    };
  }

  const firstLanguage = Object.keys(languages)[0];
  const probe = await embed(["dimension probe"]);
  console.log(
    JSON.stringify(
      {
        model: "bge-m3-Q4_K_M.gguf",
        dimensions: probe[0].length,
        maxChunksPerLanguage,
        elapsedMs: Math.round(performance.now() - started),
        languages,
        selfCheck: firstLanguage && probe[0].length === 1024 ? "pass" : "fail",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
