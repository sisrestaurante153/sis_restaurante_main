import { requirePermission } from "@/modules/access/server/authorization";
import { readStoredArtifact } from "@/modules/import/server/import-storage";
import { getImportRepository } from "@/modules/import/server/import-repository";

function resolveDownloadPath(execution: Awaited<ReturnType<ReturnType<typeof getImportRepository>["getImportExecution"]>>, artifact: string) {
  if (!execution) {
    return null;
  }

  if (artifact === "original") {
    return execution.originalFilePath;
  }

  if (artifact === "report") {
    return typeof execution.artifacts?.reportPath === "string" ? execution.artifacts.reportPath : null;
  }

  if (artifact === "reportMarkdown") {
    return typeof execution.artifacts?.reportMarkdownPath === "string"
      ? execution.artifacts.reportMarkdownPath
      : null;
  }

  if (artifact === "conflicts") {
    return typeof execution.artifacts?.conflictsPath === "string"
      ? execution.artifacts.conflictsPath
      : null;
  }

  if (artifact === "loadResult") {
    return typeof execution.artifacts?.loadResultPath === "string"
      ? execution.artifacts.loadResultPath
      : null;
  }

  return null;
}

function resolveContentType(artifact: string, executionMimeType: string | null) {
  if (artifact === "original") {
    return executionMimeType ?? "application/octet-stream";
  }

  if (artifact === "reportMarkdown") {
    return "text/markdown; charset=utf-8";
  }

  return "application/json; charset=utf-8";
}

export async function GET(request: Request) {
  const session = await requirePermission("import.read");

  const url = new URL(request.url);
  const executionId = url.searchParams.get("executionId");
  const artifact = url.searchParams.get("artifact") ?? "original";

  if (!executionId) {
    return new Response("executionId is required", { status: 400 });
  }

  const execution = await getImportRepository(session.restaurantId).getImportExecution(executionId);
  if (!execution) {
    return new Response("Importacao nao encontrada", { status: 404 });
  }

  const artifactPath = resolveDownloadPath(execution, artifact);
  if (!artifactPath) {
    return new Response("Artefato indisponivel", { status: 404 });
  }

  try {
    const file = await readStoredArtifact(artifactPath);
    const fileName = (file as { fileName?: string }).fileName ?? artifactPath.split("/").pop() ?? "arquivo";

    return new Response(file.content, {
      headers: {
        "Content-Type": resolveContentType(artifact, execution.mimeType),
        "Content-Length": String(file.size),
        "Content-Disposition": `attachment; filename="${fileName}"`
      }
    });
  } catch {
    return new Response("Arquivo nao encontrado", { status: 404 });
  }
}
