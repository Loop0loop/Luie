import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const resolveDefaultDbPath = () => path.join(process.cwd(), "prisma", "dev.db");
const datasourceUrl = process.env.DATABASE_URL ?? `file:${resolveDefaultDbPath()}`;
process.env.DATABASE_URL = datasourceUrl;

const adapter = new PrismaBetterSqlite3({
  url: datasourceUrl,
});

const prisma = new PrismaClient({
  adapter,
  log: ["error", "warn"],
});

async function main() {
  const existing = await prisma.project.count();
  if (existing > 0) {
    console.log(`[seed] skipped (projects exist: ${existing})`);
    return;
  }

  await prisma.project.create({
    data: {
      title: "새 프로젝트",
      description: "",
      settings: {
        create: {
          autoSave: true,
          autoSaveInterval: 30,
        },
      },
      chapters: {
        create: [
          {
            title: "1장",
            content: "",
            order: 1,
            wordCount: 0,
          },
        ],
      },
    },
  });

  console.log("[seed] default project created");
}

main()
  .catch((error) => {
    console.error("[seed] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
