import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOTS = ["src", "tests"];
const EXTENSIONS = new Set([".ts", ".tsx", ".css"]);
const MAX_LOC = 500;
const DEBT_BASELINE_LOC = new Map(
  Object.entries(
    JSON.parse(
      readFileSync(new URL("./source-loc-debt.json", import.meta.url), "utf8"),
    ),
  ),
);

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
const seenDebt = new Set();

for (const root of ROOTS) {
  for (const filePath of walk(root)) {
    const relativePath = toPosixPath(path.relative(process.cwd(), filePath));
    const source = readFileSync(filePath, "utf8");
    const loc = source.length === 0 ? 0 : source.split(/\r\n|\r|\n/).length;
    const debtBaselineLoc = DEBT_BASELINE_LOC.get(relativePath);
    if (debtBaselineLoc !== undefined) {
      seenDebt.add(relativePath);
      if (loc <= MAX_LOC) {
        violations.push({
          file: relativePath,
          loc,
          message: `remove its stale debt baseline (${loc} LOC)`,
        });
      } else if (loc > debtBaselineLoc) {
        violations.push({
          file: relativePath,
          loc,
          message: `grew from ${debtBaselineLoc} to ${loc} LOC`,
        });
      }
      continue;
    }
    if (loc > MAX_LOC) {
      violations.push({ file: relativePath, loc, message: null });
    }
  }
}

for (const debtPath of DEBT_BASELINE_LOC.keys()) {
  if (!seenDebt.has(debtPath)) {
    violations.push({
      file: debtPath,
      loc: 0,
      message: "missing debt baseline file",
    });
  }
}

violations.sort(
  (left, right) => right.loc - left.loc || left.file.localeCompare(right.file),
);

if (violations.length > 0) {
  console.error(
    `[check-source-loc] ${violations.length} LOC policy violation(s) (max=${MAX_LOC})`,
  );
  for (const violation of violations) {
    console.error(
      `  ${violation.loc} ${violation.file}${violation.message ? ` — ${violation.message}` : ""}`,
    );
  }
  process.exit(1);
}

console.log(`[check-source-loc] OK (${ROOTS.join(", ")}, max=${MAX_LOC})`);
