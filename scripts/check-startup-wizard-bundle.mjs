import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export function staticModuleSpecifiers(text, filename = "chunk.js") {
  const source = ts.createSourceFile(
    filename,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  assert.equal(source.parseDiagnostics.length, 0, `Invalid JS: ${filename}`);
  return source.statements.flatMap((statement) => {
    if (
      !ts.isImportDeclaration(statement) &&
      !ts.isExportDeclaration(statement)
    )
      return [];
    if (!statement.moduleSpecifier) return [];
    assert(ts.isStringLiteral(statement.moduleSpecifier));
    return [statement.moduleSpecifier.text];
  });
}

export function analyzeStartupBundle(directory) {
  const root = path.resolve(directory);
  const html = readFileSync(path.join(root, "index.html"), "utf8");
  const entries = [
    ...new Set(
      [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"?#]+\.js)"/g)].map(
        (match) => path.join(root, match[1]),
      ),
    ),
  ];
  assert(entries.length > 0, "No renderer HTML JS entries found");
  const chunks = path.join(root, "assets/chunks");
  const allChunks = readdirSync(chunks);
  assert(
    allChunks.some((name) => /^vendor-prosemirror-.*\.js$/.test(name)),
    "Missing editor sentinel chunk; review build naming before using this gate",
  );
  const names = allChunks.filter((name) => /^StartupWizard-.*\.js$/.test(name));
  assert.equal(
    names.length,
    1,
    "Expected one StartupWizard chunk; build first",
  );
  const closure = (seeds) => {
    const files = new Set();
    const visit = (file) => {
      const relative = path.relative(root, file);
      assert(
        !relative.startsWith("..") && !path.isAbsolute(relative),
        "Import outside renderer output",
      );
      if (files.has(file)) return;
      files.add(file);
      for (const specifier of staticModuleSpecifiers(
        readFileSync(file, "utf8"),
        file,
      )) {
        assert(
          specifier.startsWith("."),
          `Unexpected external import: ${specifier}`,
        );
        visit(path.resolve(path.dirname(file), specifier));
      }
    };
    seeds.forEach(visit);
    return files;
  };
  const boot = closure(entries);
  const wizard = closure([path.join(chunks, names[0])]);
  const union = new Set([...boot, ...wizard]);
  const extra = new Set([...wizard].filter((file) => !boot.has(file)));
  const summary = (files) => ({
    files: files.size,
    bytes: [...files].reduce((sum, file) => sum + statSync(file).size, 0),
  });
  return {
    boot: summary(boot),
    wizard: summary(wizard),
    extra: summary(extra),
    union: summary(union),
    eagerEditorChunks: [...union]
      .map((file) => path.relative(root, file))
      .filter((file) =>
        /(?:vendor-prosemirror|vendor-tiptap|EditorToolbar|WizardEditor|LayoutLivePreview)-/.test(
          path.basename(file),
        ),
      ),
    limits:
      "Unique emitted static JS only; excludes dynamic imports, runtime fetch/evaluation, CSS, locale, images and OS timing. Chunk-name guard must be updated if build naming changes.",
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  assert(
    process.argv.slice(2).every((arg) => arg === "--report"),
    "Only --report is supported",
  );
  const report = analyzeStartupBundle(
    fileURLToPath(new URL("../out/renderer", import.meta.url)),
  );
  console.log(JSON.stringify(report, null, 2));
  if (!process.argv.includes("--report")) {
    assert.equal(
      report.eagerEditorChunks.length,
      0,
      "Wizard initial static graph includes editor preview chunks",
    );
  }
}
