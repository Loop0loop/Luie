const fs = require("fs");
const path = require("path");

const prismaClientPkg = require.resolve("@prisma/client/package.json");
const prismaClientDir = path.dirname(prismaClientPkg);
const prismaClientDirReal = fs.realpathSync(prismaClientDir);
const sourcePrismaDir = path.join(prismaClientDirReal, "..", "..", ".prisma");
const sourcePrismaScopeDir = path.join(prismaClientDirReal, "..");

const vendorBase = path.join(process.cwd(), "vendor", "prisma");
const vendorNodeModules = path.join(vendorBase, "node_modules");
const targetPrismaDir = path.join(vendorNodeModules, ".prisma");
const targetPrismaScopeDir = path.join(vendorNodeModules, "@prisma");

if (!fs.existsSync(sourcePrismaDir)) {
  console.error("[prisma:sync] source .prisma not found", { sourcePrismaDir });
  process.exit(1);
}

try {
  fs.rmSync(vendorBase, { recursive: true, force: true });
  fs.mkdirSync(vendorNodeModules, { recursive: true });
  fs.cpSync(sourcePrismaDir, targetPrismaDir, { recursive: true, dereference: true });
  fs.cpSync(sourcePrismaScopeDir, targetPrismaScopeDir, { recursive: true, dereference: true });

  const clientDir = path.join(sourcePrismaScopeDir, "client");
  const clientRuntimeUtilsDir = path.join(sourcePrismaScopeDir, "client-runtime-utils");
  const clientDirReal = fs.realpathSync(clientDir);
  const clientRuntimeUtilsDirReal = fs.realpathSync(clientRuntimeUtilsDir);

  const targetClientDir = path.join(targetPrismaScopeDir, "client");
  const targetRuntimeUtilsDir = path.join(targetPrismaScopeDir, "client-runtime-utils");

  fs.rmSync(targetClientDir, { recursive: true, force: true });
  fs.rmSync(targetRuntimeUtilsDir, { recursive: true, force: true });

  fs.cpSync(clientDirReal, targetClientDir, { recursive: true, dereference: true });
  fs.cpSync(clientRuntimeUtilsDirReal, targetRuntimeUtilsDir, { recursive: true, dereference: true });
  console.log("[prisma:sync] prisma vendor prepared", {
    sourcePrismaDir,
    targetPrismaDir,
    targetPrismaScopeDir,
  });
} catch (error) {
  console.error("[prisma:sync] failed", error);
  process.exit(1);
}
