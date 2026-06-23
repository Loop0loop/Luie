#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const PROJECT_ROOT = process.cwd();
const HANDLER_ROOT = path.join(PROJECT_ROOT, "src/main/handler");
const SOURCE_FILE_PATTERN = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

const collectFiles = (dir, output = []) => {
  if (!fs.existsSync(dir)) return output;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, output);
      continue;
    }
    if (SOURCE_FILE_PATTERN.test(entry.name)) {
      output.push(fullPath);
    }
  }
  return output;
};

const getLineNumber = (sourceFile, position) =>
  sourceFile.getLineAndCharacterOfPosition(position).line + 1;

const getLineText = (content, line) =>
  content.split(/\r?\n/)[line - 1]?.trim() ?? "";

const getPropertyName = (property) => {
  if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) {
    return property.name.text;
  }
  return null;
};

const getObjectProperty = (node, name) =>
  node.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) && getPropertyName(property) === name,
  );

const buildFinding = ({
  relativeFile,
  sourceFile,
  content,
  node,
  channelText,
}) => {
  const line = getLineNumber(sourceFile, node.getStart(sourceFile));
  return {
    type: "missing-ipc-args-schema",
    severity: "error",
    message:
      "IPC handlers with input parameters must declare an argsSchema runtime contract.",
    file: relativeFile,
    line,
    channel: channelText,
    text: getLineText(content, line),
  };
};

const collectHandlerConfigObjects = (sourceFile) => {
  const configs = [];

  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === "registerIpcHandler"
      ) {
        const candidate = node.arguments[0];
        if (candidate && ts.isObjectLiteralExpression(candidate)) {
          configs.push(candidate);
        }
      }

      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === "registerIpcHandlers"
      ) {
        const candidate = node.arguments[1];
        if (candidate && ts.isArrayLiteralExpression(candidate)) {
          candidate.elements.forEach((element) => {
            if (ts.isObjectLiteralExpression(element)) {
              configs.push(element);
            }
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return configs;
};

export const analyzeIpcHandlerSchemasSource = (content, relativeFile) => {
  const sourceFile = ts.createSourceFile(
    relativeFile,
    content,
    ts.ScriptTarget.Latest,
    true,
    relativeFile.endsWith(".tsx") || relativeFile.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );
  const findings = [];
  const handlerConfigs = collectHandlerConfigObjects(sourceFile);

  for (const config of handlerConfigs) {
    const handlerProperty = getObjectProperty(config, "handler");
    if (!handlerProperty) continue;
    const argsSchemaProperty = getObjectProperty(config, "argsSchema");
    if (argsSchemaProperty) continue;

    const handlerInitializer = handlerProperty.initializer;
    if (
      !ts.isArrowFunction(handlerInitializer) &&
      !ts.isFunctionExpression(handlerInitializer)
    ) {
      continue;
    }

    if (handlerInitializer.parameters.length === 0) {
      continue;
    }

    const channelProperty = getObjectProperty(config, "channel");
    const channelText = channelProperty
      ? channelProperty.initializer.getText(sourceFile)
      : "(unknown channel)";

    findings.push(
      buildFinding({
        relativeFile,
        sourceFile,
        content,
        node: handlerProperty,
        channelText,
      }),
    );
  }

  return findings;
};

export const analyzeIpcHandlerSchemas = () => {
  const files = collectFiles(HANDLER_ROOT);
  const findings = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    const relativeFile = path
      .relative(PROJECT_ROOT, filePath)
      .replace(/\\/g, "/");
    findings.push(...analyzeIpcHandlerSchemasSource(content, relativeFile));
  }

  return findings;
};

export const runIpcHandlerSchemaCheck = async () => {
  const findings = analyzeIpcHandlerSchemas();

  if (findings.length > 0) {
    console.error("[check-ipc-handler-schemas] schema findings:");
    findings.forEach((finding) => {
      console.error(
        `- ${finding.file}:${finding.line} [${finding.channel}] ${finding.message}`,
      );
    });
    return { exitCode: 1 };
  }

  console.log("[check-ipc-handler-schemas] OK");
  return { exitCode: 0 };
};

const isExecutedDirectly =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isExecutedDirectly) {
  runIpcHandlerSchemaCheck()
    .then(({ exitCode }) => process.exit(exitCode))
    .catch((error) => {
      console.error(
        "[check-ipc-handler-schemas] failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    });
}
