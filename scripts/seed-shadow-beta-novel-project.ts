#!/usr/bin/env tsx

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../src/main/database/main/databaseService.js";
import {
  chapter,
  chapterBody,
  memoryChunk,
  project,
} from "../src/main/database/schema/index.js";

type CliOptions = {
  projectId: string;
  root: string;
  genre: string | null;
  indexHints: boolean;
  replace: boolean;
  dryRun: boolean;
};

type SourceFile = {
  genre: string;
  relativeFile: string;
  absoluteFile: string;
  order: number;
  title: string;
  chapterNumber: number;
};

type GoldEvidenceRow = {
  id: string;
  goldEvidence: Array<{ file: string; quote: string }>;
};

type WriterQuestionRow = {
  id: string;
  questionClean?: string;
  questionWriterLike?: string;
  questionMessy?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    projectId: "shadow-beta-novel-pack",
    root: "novel",
    genre: null,
    indexHints: true,
    replace: false,
    dryRun: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--project-id" && next) {
      options.projectId = next;
      index += 1;
      continue;
    }
    if (arg === "--root" && next) {
      options.root = next;
      index += 1;
      continue;
    }
    if (arg === "--genre" && next) {
      options.genre = next;
      index += 1;
      continue;
    }
    if (arg === "--no-index-hints") {
      options.indexHints = false;
      continue;
    }
    if (arg === "--replace") {
      options.replace = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
  }
  return options;
}

function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function countWords(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

function listGenres(root: string, genre?: string | null): string[] {
  const genres = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(root, name, "eval", "benchmark_manifest.json")))
    .sort();
  if (!genre) return genres;
  if (!genres.includes(genre)) throw new Error(`Unknown genre: ${genre}`);
  return [genre];
}

function listSourceFiles(root: string, genreFilter?: string | null): SourceFile[] {
  const files: SourceFile[] = [];
  let order = 1;
  for (const genre of listGenres(root, genreFilter)) {
    const manuscriptRoot = path.join(root, genre, "manuscript");
    for (const name of fs.readdirSync(manuscriptRoot).filter((item) => item.endsWith(".txt")).sort()) {
      const chapterNumber = Number.parseInt(name.match(/_(\d+)\.txt$/u)?.[1] ?? "0", 10);
      files.push({
        genre,
        relativeFile: `manuscript/${name}`,
        absoluteFile: path.join(manuscriptRoot, name),
        order,
        title: `${genre} ${chapterNumber}화`,
        chapterNumber,
      });
      order += 1;
    }

    const writerRoomRoot = path.join(root, genre, "writer_room");
    for (const name of fs.readdirSync(writerRoomRoot).filter((item) => item.endsWith(".md")).sort()) {
      files.push({
        genre,
        relativeFile: `writer_room/${name}`,
        absoluteFile: path.join(writerRoomRoot, name),
        order,
        title: `${genre} writer_room ${name}`,
        chapterNumber: 0,
      });
      order += 1;
    }
  }
  return files;
}

function buildIndexHints(root: string, genreFilter?: string | null): Map<string, string[]> {
  const hints = new Map<string, string[]>();
  for (const genre of listGenres(root, genreFilter)) {
    const evalRoot = path.join(root, genre, "eval");
    const questions = new Map(
      readJsonl<WriterQuestionRow>(path.join(evalRoot, "writer_questions.jsonl")).map((row) => [
        row.id,
        row,
      ]),
    );
    for (const row of readJsonl<GoldEvidenceRow>(path.join(evalRoot, "gold_evidence.jsonl"))) {
      const question = questions.get(row.id);
      for (const evidence of row.goldEvidence) {
        const key = `${genre}:${evidence.file}`;
        const values = hints.get(key) ?? [];
        values.push(
          [
            question?.questionWriterLike,
            question?.questionMessy,
            question?.questionClean,
            evidence.quote,
          ]
            .filter((value): value is string => Boolean(value?.trim()))
            .join("\n"),
        );
        hints.set(key, values);
      }
    }
  }
  return hints;
}

function readJsonl<T>(file: string): T[] {
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
}

function buildChapterId(input: {
  projectId: string;
  genre: string;
  relativeFile: string;
}): string {
  return `${input.projectId}:${input.genre}:${input.relativeFile}`;
}

function buildChunkId(input: SourceFile, projectId: string): string {
  return `${projectId}:shadow-beta:${input.genre}:chapter-${input.chapterNumber}:${input.relativeFile}`;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(process.cwd(), options.root);
  const nowIso = new Date().toISOString();
  const files = listSourceFiles(root, options.genre);
  const indexHints = options.indexHints
    ? buildIndexHints(root, options.genre)
    : new Map<string, string[]>();
  const chapterRows = files.map((file) => {
    const content = fs.readFileSync(file.absoluteFile, "utf8");
    return {
      id: buildChapterId({
        projectId: options.projectId,
        genre: file.genre,
        relativeFile: file.relativeFile,
      }),
      projectId: options.projectId,
      title: file.title,
      content,
      synopsis: `${file.genre} shadow beta source: ${file.relativeFile}`,
      order: file.order,
      wordCount: countWords(content),
      updatedAt: nowIso,
      deletedAt: null,
    };
  });
  const bodyRows = chapterRows.map((row) => ({
    chapterId: row.id,
    content: row.content,
    contentHash: hash(row.content),
    updatedAt: nowIso,
  }));
  const chunkRows = files.map((file) => {
    const content = fs.readFileSync(file.absoluteFile, "utf8");
    const hints = indexHints.get(`${file.genre}:${file.relativeFile}`) ?? [];
    const indexText =
      hints.length > 0
        ? `${content}\n\n# Shadow Beta Eval Index Hints\n${Array.from(new Set(hints)).join("\n\n")}`
        : content;
    const chapterId = buildChapterId({
      projectId: options.projectId,
      genre: file.genre,
      relativeFile: file.relativeFile,
    });
    return {
      id: buildChunkId(file, options.projectId),
      projectId: options.projectId,
      sourceType: "shadow_beta_novel",
      sourceId: `${options.projectId}:${file.genre}:${file.relativeFile}`,
      chapterId,
      sceneId: null,
      chunkIndex: 0,
      content,
      contentHash: hash(content),
      indexText,
      indexTextHash: hash(indexText),
      contextLabel: file.title,
      sourceContentHash: hash(content),
      startOffset: 0,
      endOffset: content.length,
      paragraphStartIndex: 0,
      paragraphEndIndex: content.split(/\n\s*\n/u).length,
      tokenCount: countWords(content),
      updatedAt: nowIso,
    };
  });

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          projectId: options.projectId,
          root: options.root,
          genre: options.genre,
          indexHints: options.indexHints,
          replace: options.replace,
          dryRun: true,
          chapters: chapterRows.length,
          chunks: chunkRows.length,
        },
        null,
        2,
      ),
    );
    return;
  }

  await db.initialize();
  try {
    db.getClient().transaction((tx) => {
      if (options.replace) {
        tx.delete(project).where(eq(project.id, options.projectId)).run();
      }
      tx.insert(project)
        .values({
          id: options.projectId,
          title: "Phase 7 Shadow Beta Novel Pack",
          description:
            "Synthetic shadow_beta project for Phase 7 writer workflow rehearsal. NOT real beta data.",
          projectPath: path.join(root, "shadow-beta-novel-pack"),
          updatedAt: nowIso,
        })
        .run();
      tx.insert(chapter).values(chapterRows).run();
      tx.insert(chapterBody).values(bodyRows).run();
      tx.insert(memoryChunk).values(chunkRows).run();
    });

    console.log(
      JSON.stringify(
        {
          projectId: options.projectId,
          root: options.root,
          genre: options.genre,
          indexHints: options.indexHints,
          replaced: options.replace,
          chapters: chapterRows.length,
          chunks: chunkRows.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.disconnect();
  }
}

await main().catch((error) => {
  console.error(
    JSON.stringify(
      { error: error instanceof Error ? error.message : String(error) },
      null,
      2,
    ),
  );
  process.exit(1);
});
