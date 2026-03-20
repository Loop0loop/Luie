import { spawn } from "node:child_process";

const script = `
const KEY = "luie.graph.perf.enabled";
localStorage.setItem(KEY, "1");
console.log('[graph-perf] instrumentation enabled:', localStorage.getItem(KEY));
`;

const child = spawn(
  process.platform === "win32" ? "bun.cmd" : "bun",
  ["run", "dev"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      LUIE_GRAPH_PERF_SESSION: "1",
    },
  },
);

child.on("spawn", () => {
  console.log("[graph-perf] Run this in DevTools console once app is open:");
  console.log(script.trim());
  console.log(
    "[graph-perf] Interact with graph (drag/connect). Metrics flush on tab hide/unload.",
  );
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
