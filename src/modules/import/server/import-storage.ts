import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { getServerEnv } from "@/modules/platform/server/env";

export type ImportArtifactKind =
  | "original"
  | "report"
  | "reportMarkdown"
  | "conflicts"
  | "loadResult";

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

export function getImportStorageRoot() {
  const env = getServerEnv();
  return path.resolve(process.cwd(), env.IMPORT_STORAGE_DIR);
}

export async function ensureImportStorageRoot() {
  const root = getImportStorageRoot();
  await mkdir(root, { recursive: true });
  await mkdir(path.join(root, "uploads"), { recursive: true });
  await mkdir(path.join(root, "executions"), { recursive: true });
  return root;
}

export async function persistImportWorkbook(file: File) {
  const root = await ensureImportStorageRoot();
  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buffer).digest("hex");
  const originalFileName = sanitizeFileName(file.name || "importacao-legado.xlsx");
  const uploadId = randomUUID();
  const uploadDir = path.join(root, "uploads", uploadId);
  const storedPath = path.join(uploadDir, originalFileName);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(storedPath, buffer);

  return {
    originalFileName,
    storedPath,
    fileHash: hash,
    mimeType: file.type || null,
    fileSizeBytes: file.size
  };
}

export async function ensureExecutionArtifactDirectory(executionId: string) {
  const directory = path.join(getImportStorageRoot(), "executions", executionId);
  await mkdir(directory, { recursive: true });
  return directory;
}

export async function getExecutionArtifactPaths(executionId: string) {
  const directory = await ensureExecutionArtifactDirectory(executionId);
  return {
    directory,
    reportPath: path.join(directory, "report.json"),
    reportMarkdownPath: path.join(directory, "report.md"),
    conflictsPath: path.join(directory, "conflicts.json"),
    loadResultPath: path.join(directory, "load-result.json"),
    stagingDirectory: path.join(directory, "staging")
  };
}

export async function readStoredArtifact(filePath: string) {
  const absolutePath = path.resolve(filePath);
  const [content, metadata] = await Promise.all([readFile(absolutePath), stat(absolutePath)]);
  return {
    absolutePath,
    content,
    size: metadata.size
  };
}
