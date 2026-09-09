import path from "node:path";
import { fileURLToPath } from "node:url";
const evidenceDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidenceDir, "../../../..");
export default { root, test: { environment: "node", include: [path.join(evidenceDir, "*.probe.ts")], setupFiles: [path.join(root, "tests/setup.ts")] } };
