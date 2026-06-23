import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOTS = ["src/main", "src/renderer/src", "src/shared"];
const EXTENSIONS = new Set([".ts", ".tsx", ".css"]);
const MAX_LOC = 500;
const ALLOWLIST = new Set(["src/renderer/src/styles/global.css"]);

const toPosixPath = (filePath) => filePath.split(path.sep).join("/");

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }
    if (stats.isFile() && EXTENSIONS.has(path.extname(entry))) {
      yield fullPath;
    }
  }
}

const violations = [];

for (const root of ROOTS) {
  for (const filePath of walk(root)) {
    const relativePath = toPosixPath(path.relative(process.cwd(), filePath));
    if (ALLOWLIST.has(relativePath)) continue;

    const source = readFileSync(filePath, "utf8");
    const loc = source.length === 0 ? 0 : source.split(/\r\n|\r|\n/).length;
    if (loc > MAX_LOC) {
      violations.push({ file: relativePath, loc });
    }
  }
}

violations.sort(
  (left, right) => right.loc - left.loc || left.file.localeCompare(right.file),
);

if (violations.length > 0) {
  console.error(
    `[check-source-loc] ${violations.length} file(s) exceed ${MAX_LOC} LOC`,
  );
  for (const violation of violations) {
    console.error(`  ${violation.loc} ${violation.file}`);
  }
  process.exit(1);
}

console.log(`[check-source-loc] OK (${ROOTS.join(", ")}, max=${MAX_LOC})`);
