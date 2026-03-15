import fs from "fs";
const file = "/Users/user/Luie/src/renderer/src/features/research/components/world/graph/components/CustomEntityNode.tsx";
let content = fs.readFileSync(file, "utf8");
content = content.replace("const { label, subType, entityType, description } = data;", "const { label, subType, entityType, description } = data;\n  console.log('CustomEntityNode data:', data);");
fs.writeFileSync(file, content);
