import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const repoEnvPath = path.resolve(currentDir, "../../../.env");
const localEnvPath = path.resolve(currentDir, "../.env");

config({ path: repoEnvPath });
config({ path: localEnvPath, override: false });

await import("./server.js");
