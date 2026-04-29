import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const runtimeDir = path.join(process.cwd(), "artifacts", "runtime");
const demoStorePath = path.join(runtimeDir, "demo-store.json");

await mkdir(runtimeDir, { recursive: true });

try {
  await writeFile(demoStorePath, "{}\n", { flag: "wx" });
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
    process.exit(0);
  }

  throw error;
}
