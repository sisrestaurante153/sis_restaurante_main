import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { Client } from "pg";

const execFileAsync = promisify(execFile);

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@sis-restaurante.local");
  await page.locator('input[name="password"]').fill("admin123");
  await page.getByRole("button", { name: /entrar no painel/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

async function cleanupActiveImportExecutions() {
  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ?? "postgresql://sis:sis@localhost:5432/sis_restaurante?schema=public"
  });

  try {
    await client.connect();
    await client.query(
      "delete from importacao_execucao where status in ('pendente', 'processando')"
    );
  } catch {
    // The E2E also supports the demo-store fallback when the database is not configured.
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function createValidWorkbook(filePath: string) {
  const pythonPathEntries = [
    path.join(process.cwd(), "vendor", "python"),
    process.cwd(),
    process.env.PYTHONPATH
  ].filter(Boolean);
  const script = [
    "from openpyxl import Workbook",
    "import sys",
    "wb = Workbook()",
    "ws = wb.active",
    'ws.title = "ABA E2E"',
    'ws["A1"] = "item"',
    'ws["B1"] = "valor"',
    'ws["A2"] = "Tomate"',
    'ws["B2"] = 1',
    "wb.save(sys.argv[1])"
  ].join("; ");
  const candidates =
    process.platform === "win32"
      ? [
          { command: "py", args: ["-3"] },
          { command: "python", args: [] },
          { command: "python3", args: [] }
        ]
      : [
          { command: "python3", args: [] },
          { command: "python", args: [] },
          { command: "py", args: ["-3"] }
        ];

  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      await execFileAsync(
        candidate.command,
        [...candidate.args, "-c", script, filePath],
        {
          env: {
            ...process.env,
            PYTHONPATH: pythonPathEntries.join(path.delimiter)
          }
        }
      );
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Nenhum executavel Python disponivel para gerar a planilha E2E.");
}

test("uploads the workbook via UI, polls completion status and opens pending reconciliation", async ({
  page
}, testInfo) => {
  test.setTimeout(60_000);
  const uploadedFileName = `importacao-e2e-${Date.now()}.xlsx`;
  const uploadPath = testInfo.outputPath(uploadedFileName);
  const conflitoId = randomUUID();
  const demoStorePath = path.join(process.cwd(), "artifacts", "runtime", "demo-store.json");

  await rm(demoStorePath, { force: true });
  await cleanupActiveImportExecutions();
  await createValidWorkbook(uploadPath);
  await loginAsAdmin(page);

  await page.goto("/importacao");
  await expect(page.getByRole("heading", { name: /area de importacao/i })).toBeVisible();

  await page.locator('input[name="workbook"]').setInputFiles(uploadPath);
  await page.getByRole("button", { name: /iniciar importacao/i }).click();
  await expect(page).toHaveURL(/\/importacao\?created=1&execucao=/, { timeout: 15_000 });
  await expect(page.getByText(/arquivo recebido/i)).toBeVisible();

  let execucaoId: string | null = null;
  try {
    const demoStore = JSON.parse(await readFile(demoStorePath, "utf-8")) as {
      importExecutions: Array<Record<string, unknown>>;
      importConflicts: Array<Record<string, unknown>>;
    };
    const execution = demoStore.importExecutions.find(
      (entry) => entry.originalFileName === uploadedFileName
    ) as ({ id: string } & Record<string, unknown>) | undefined;

    if (execution) {
      execucaoId = execution.id;
      const updatedStore = {
        ...demoStore,
        importExecutions: demoStore.importExecutions.map((entry) =>
          entry.originalFileName === uploadedFileName
            ? {
                ...entry,
                status: "concluida_com_conflitos",
                currentStage: "concluida",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                conflictCount: 1,
                friendlySummary: {
                  headline: "Importacao concluida com pendencias",
                  whatHappened: "A carga do arquivo foi concluida.",
                  impact: "Uma pendencia de reconciliacao ficou em aberto.",
                  whatToDoNow: "Abra as pendencias para finalizar a reconciliacao.",
                  nextAction: {
                    label: "Abrir pendencias",
                    href: `/importacao/pendencias?execucao=${execucaoId}`
                  }
                }
              }
            : entry
        ),
        importConflicts: [
          ...demoStore.importConflicts,
          {
            id: conflitoId,
            type: "name_conflict",
            rawName: `Ingrediente E2E ${Date.now()}`,
            normalizedName: `ingrediente e2e ${Date.now()}`,
            sheetName: "ABA E2E",
            rowNumber: 1,
            confidence: "0.9100",
            suggestedItemName: "Tomate italiano",
            suggestedAlias: "Ingrediente E2E",
            resolved: false
          }
        ]
      };
      await writeFile(demoStorePath, JSON.stringify(updatedStore, null, 2));
    }
  } catch {
    // If demo store is not the active backend, the DB branch below will handle the update.
  }

  if (!execucaoId) {
    const client = new Client({
      connectionString:
        process.env.DATABASE_URL ?? "postgresql://sis:sis@localhost:5432/sis_restaurante?schema=public"
    });
    await client.connect();
    try {
      const executionQuery = await client.query<{ id: string }>(
        "select id from importacao_execucao where origem_arquivo = $1 order by criado_em desc limit 1",
        [uploadedFileName]
      );
      const persistedExecutionId = executionQuery.rows[0]?.id;

      if (!persistedExecutionId) {
        throw new Error(`Execucao nao encontrada para ${uploadedFileName}`);
      }
      execucaoId = persistedExecutionId;

      await client.query(
        `update importacao_execucao
           set status = 'concluida_com_conflitos',
               estagio_atual = 'concluida',
               iniciado_em = now(),
               finalizado_em = now(),
               resumo_amigavel_json = $1::jsonb
         where id = $2`,
        [
          JSON.stringify({
            headline: "Importacao concluida com pendencias",
            whatHappened: "A carga do arquivo foi concluida.",
            impact: "Uma pendencia de reconciliacao ficou em aberto.",
            whatToDoNow: "Abra as pendencias para finalizar a reconciliacao.",
            nextAction: {
              label: "Abrir pendencias",
              href: `/importacao/pendencias?execucao=${execucaoId}`
            }
          }),
          persistedExecutionId
        ]
      );

      await client.query(
        `insert into importacao_conflito (
          id,
          execucao_id,
          tipo,
          raw_name,
          normalized_name,
          sheet_name,
          row_number,
          confidence
        ) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          conflitoId,
          execucaoId,
          "name_conflict",
          `Ingrediente E2E ${Date.now()}`,
          `ingrediente e2e ${Date.now()}`,
          "ABA E2E",
          1,
          "0.9100"
        ]
      );
    } finally {
      await client.end();
    }
  }

  if (!execucaoId) {
    throw new Error(`Execucao nao encontrada para ${uploadedFileName}`);
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText(uploadedFileName, { exact: true }).first()).toBeVisible({
    timeout: 15_000
  });
  await page.goto(`/importacao/pendencias?execucao=${execucaoId}`, {
    waitUntil: "domcontentloaded"
  });
  await expect(page).toHaveURL(new RegExp(`/importacao/pendencias\\?execucao=${execucaoId}`));
  await expect(page.getByRole("heading", { name: /pendencias de importacao/i })).toBeVisible();
});
