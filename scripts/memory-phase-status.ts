#!/usr/bin/env tsx

import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/main/infra/database/index.js";
import { getMemoryPhaseStatusReport } from "../src/main/services/features/memory/status/index.js";

type CliOptions = {
  projectId: string;
  out?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    projectId: "454cce80-02b4-4d43-a162-4116898e4b4e",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--") {
      continue;
    }
    if (arg === "--project-id" && next) {
      options.projectId = next;
      index += 1;
      continue;
    }
    if (arg === "--out" && next) {
      options.out = next;
      index += 1;
      continue;
    }
    throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await db.initialize();
  try {
    const report = await getMemoryPhaseStatusReport({
      projectId: options.projectId,
    });
    const json = `${JSON.stringify(report, null, 2)}\n`;
    if (options.out) {
      const outPath = path.resolve(options.out);
      await mkdir(path.dirname(outPath), { recursive: true });
      await writeFile(outPath, json, "utf8");
      console.log(`Wrote memory phase status report to ${outPath}`);
      return;
    }
    console.log(json);
  } finally {
    await db.disconnect();
  }
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  await db.disconnect().catch(() => undefined);
  process.exit(1);
});
