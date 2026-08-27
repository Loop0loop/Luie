#!/usr/bin/env node

import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { JSDOM } from "jsdom";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:18081";
const outputDir = path.join(
  process.cwd(),
  "tests",
  ".tmp",
  "bge-modern-webserial",
);
const pages = [
  "we-need-to-talk-about-fifty-five",
  "introductory-antimemetics",
  "unforgettable-that-s-what-you-are",
  "case-colourless-green",
  "your-last-first-day",
];
const editions = {
  en: "https://scp-wiki.wikidot.com",
  ko: "https://scpko.wikidot.com",
  ja: "https://scp-jp.wikidot.com",
};
const queries = {
  en: [
    ["What is known about the shape and properties of SCP-055?", pages[0]],
    [
      "What happens to Paul Kim when he meets Alastair Grey in the cafeteria?",
      pages[1],
    ],
    [
      "Why is Marion Wheeler able to remember the antimemetic threat?",
      pages[2],
    ],
    [
      "How does the Colourless Green anomaly erase people and records?",
      pages[3],
    ],
    [
      "Why does Marion Wheeler have to experience her last first day again?",
      pages[4],
    ],
  ],
  ko: [
    ["SCP-055의 모양과 성질에 관해 무엇을 알 수 있는가?", pages[0]],
    ["폴 김이 식당에서 앨러스터 그레이를 만나 무슨 일을 겪는가?", pages[1]],
    ["매리언 휠러는 어떻게 항밈적 위협을 기억할 수 있었는가?", pages[2]],
    ["무색의 녹색 변칙은 사람과 기록을 어떻게 지우는가?", pages[3]],
    ["매리언 휠러는 왜 마지막 첫날을 다시 겪어야 하는가?", pages[4]],
  ],
  ja: [
    ["SCP-055の形状と性質について何が分かっていますか？", pages[0]],
    [
      "ポール・キムが食堂でアラステア・グレイに会うと何が起きますか？",
      pages[1],
    ],
    ["マリオン・ホイーラーはなぜ反ミームの脅威を記憶できますか？", pages[2]],
    ["色無き緑の異常は人と記録をどのように消しますか？", pages[3]],
    ["マリオン・ホイーラーはなぜ最後の初日を再び経験しますか？", pages[4]],
  ],
};

function chunk(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const result = [];
  for (let start = 0; start < normalized.length; start += 430) {
    result.push(normalized.slice(start, start + 480));
  }
  return result.filter((value) => value.length >= 80);
}

async function embed(texts) {
  const result = [];
  for (const text of texts) {
    const response = await fetch(`${baseUrl}/v1/embeddings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "bge-m3-q4_k_m", input: [text] }),
    });
    if (!response.ok) throw new Error(await response.text());
    result.push((await response.json()).data[0].embedding);
  }
  return result;
}

function cosine(a, b) {
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    aa += a[i] ** 2;
    bb += b[i] ** 2;
  }
  return dot / Math.sqrt(aa * bb);
}

await fsp.mkdir(outputDir, { recursive: true });
const report = {};
for (const [language, origin] of Object.entries(editions)) {
  const documents = [];
  for (const slug of pages) {
    const source = `${origin}/${slug}`;
    const response = await fetch(source);
    if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`);
    const dom = new JSDOM(await response.text());
    const content = dom.window.document.querySelector("#page-content");
    if (!content) throw new Error(`${source}: page content not found`);
    content
      .querySelectorAll(
        "script,style,.page-rate-widget-box,.creditRate,.licensebox",
      )
      .forEach((node) => node.remove());
    documents.push({
      slug,
      source,
      attribution: "qntm; translator attribution is on the source page",
      license: "CC BY-SA 3.0",
      text: content.textContent.replace(/\s+/g, " ").trim(),
    });
  }
  await fsp.writeFile(
    path.join(outputDir, `${language}.json`),
    JSON.stringify(documents, null, 2),
  );
  const candidates = documents.flatMap((document) =>
    chunk(document.text).map((text) => ({ slug: document.slug, text })),
  );
  const candidateVectors = await embed(candidates.map(({ text }) => text));
  const queryVectors = await embed(queries[language].map(([text]) => text));
  const ranks = queries[language].map(([text, expected], queryIndex) => {
    const ranked = candidates
      .map((candidate, index) => ({
        ...candidate,
        score: cosine(queryVectors[queryIndex], candidateVectors[index]),
      }))
      .sort((a, b) => b.score - a.score);
    return {
      query: text,
      expected,
      rank: ranked.findIndex(({ slug }) => slug === expected) + 1,
      top: ranked[0].slug,
    };
  });
  report[language] = {
    documents: documents.length,
    chars: documents.reduce((sum, document) => sum + document.text.length, 0),
    chunks: candidates.length,
    recallAt1: ranks.filter(({ rank }) => rank === 1).length / ranks.length,
    recallAt5: ranks.filter(({ rank }) => rank <= 5).length / ranks.length,
    mrr: ranks.reduce((sum, { rank }) => sum + 1 / rank, 0) / ranks.length,
    ranks,
  };
}
console.log(JSON.stringify(report, null, 2));
