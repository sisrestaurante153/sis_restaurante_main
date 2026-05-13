import { createHash, randomUUID } from "node:crypto";
import { getServerEnv } from "@/modules/platform/server/env";

export type ImportArtifactKind =
  | "original"
  | "report"
  | "reportMarkdown"
  | "conflicts"
  | "loadResult";

// ---------------------------------------------------------------------------
// Caminhos no Supabase Storage são prefixados com "supabase://"
// Caminhos locais (fallback dev) não têm prefixo
// ---------------------------------------------------------------------------
const SUPABASE_PREFIX = "supabase://";
const BUCKET = "importacoes";

function isSupabasePath(p: string) {
  return p.startsWith(SUPABASE_PREFIX);
}

function toStoragePath(supabasePath: string) {
  return supabasePath.slice(SUPABASE_PREFIX.length);
}

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

// ---------------------------------------------------------------------------
// Upload de workbook (Supabase Storage em produção, disco local em dev)
// ---------------------------------------------------------------------------

export async function persistImportWorkbook(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buffer).digest("hex");
  const originalFileName = sanitizeFileName(file.name || "importacao.xlsx");
  const uploadId = randomUUID();

  const supabase = getStorageClient();

  if (supabase) {
    const storagePath = `uploads/${uploadId}/${originalFileName}`;

    // Cria o bucket se ainda não existir
    await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {});

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType:
          file.type ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: false
      });

    if (error) throw new Error(`Supabase Storage upload falhou: ${error.message}`);

    return {
      originalFileName,
      storedPath: `${SUPABASE_PREFIX}${storagePath}`,
      fileHash: hash,
      mimeType: file.type || null,
      fileSizeBytes: file.size
    };
  }

  // Fallback local — desenvolvimento sem Supabase configurado
  const { mkdir, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const env = getServerEnv();
  const root = path.resolve(process.cwd(), env.IMPORT_STORAGE_DIR);
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

// ---------------------------------------------------------------------------
// Leitura de artefato (Supabase Storage ou disco local)
// ---------------------------------------------------------------------------

export async function readStoredArtifact(filePath: string) {
  if (isSupabasePath(filePath)) {
    const supabase = getStorageClient();
    if (!supabase) throw new Error("Supabase não configurado para leitura de artefato.");

    const storagePath = toStoragePath(filePath);
    const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
    if (error || !data) throw new Error(`Artefato não encontrado: ${error?.message}`);

    const content = Buffer.from(await data.arrayBuffer());
    const path = await import("node:path");

    return {
      absolutePath: filePath,
      content,
      size: content.length,
      fileName: path.basename(storagePath)
    };
  }

  // Fallback local
  const { readFile, stat } = await import("node:fs/promises");
  const path = await import("node:path");
  const absolutePath = path.resolve(filePath);
  const [content, metadata] = await Promise.all([readFile(absolutePath), stat(absolutePath)]);

  return {
    absolutePath,
    content,
    size: metadata.size,
    fileName: path.basename(absolutePath)
  };
}

// ---------------------------------------------------------------------------
// Helpers de diretório local (usados apenas em dev/legado)
// ---------------------------------------------------------------------------

export function getImportStorageRoot() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path");
  const env = getServerEnv();
  return path.resolve(process.cwd(), env.IMPORT_STORAGE_DIR);
}

export async function ensureImportStorageRoot() {
  const { mkdir } = await import("node:fs/promises");
  const path = await import("node:path");
  const root = getImportStorageRoot();
  await mkdir(root, { recursive: true });
  await mkdir(path.join(root, "uploads"), { recursive: true });
  await mkdir(path.join(root, "executions"), { recursive: true });
  return root;
}

export async function ensureExecutionArtifactDirectory(executionId: string) {
  const { mkdir } = await import("node:fs/promises");
  const path = await import("node:path");
  const directory = path.join(getImportStorageRoot(), "executions", executionId);
  await mkdir(directory, { recursive: true });
  return directory;
}

export async function getExecutionArtifactPaths(executionId: string) {
  const directory = await ensureExecutionArtifactDirectory(executionId);
  const path = await import("node:path");
  return {
    directory,
    reportPath: path.join(directory, "report.json"),
    reportMarkdownPath: path.join(directory, "report.md"),
    conflictsPath: path.join(directory, "conflicts.json"),
    loadResultPath: path.join(directory, "load-result.json"),
    stagingDirectory: path.join(directory, "staging")
  };
}
