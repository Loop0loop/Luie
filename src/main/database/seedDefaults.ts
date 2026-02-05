import { createLogger } from "../../shared/logger/index.js";

const logger = createLogger("DatabaseSeed");

type SeedClient = {
  project: {
    count: () => Promise<number>;
    create: (args: unknown) => Promise<unknown>;
  };
};

export async function seedIfEmpty(prisma: SeedClient): Promise<boolean> {
  const existing = await prisma.project.count();
  if (existing > 0) {
    logger.info("Seed skipped (projects exist)", { count: existing });
    return false;
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

  logger.info("Seed completed (default project created)");
  return true;
}
