import { readFileSync } from "node:fs";
import { join } from "node:path";

export function readLegalDocument(name) {
  return readFileSync(join(process.cwd(), "src", "layerDocs", `${name}.md`), "utf8");
}
