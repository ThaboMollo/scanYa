import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

const candidateRoots = new Set<string>();

for (const baseDir of [process.cwd(), currentDir]) {
  let cursor = path.resolve(baseDir);

  while (true) {
    candidateRoots.add(cursor);
    const parent = path.dirname(cursor);

    if (parent === cursor) {
      break;
    }

    cursor = parent;
  }
}

for (const root of candidateRoots) {
  config({ path: path.join(root, ".env"), override: false });
  config({ path: path.join(root, "apps/api/.env"), override: false });
}

await import("./server.js");
