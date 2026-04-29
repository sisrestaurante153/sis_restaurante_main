import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

function uniqueName(prefix: string) {
  return `${prefix} ${Date.now()}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function humanizeType(value: string) {
  const labels: Record<string, string> = {
    insumo: "Insumo",
    pre_preparo: "Pre-preparo",
    intermediario: "Intermediario",
    produto_pronto: "Produto pronto",
    prato: "Prato",
    porcao: "Porcao",
    marmita: "Marmita",
    combo: "Combo",
    embalagem: "Embalagem",
    apoio: "Apoio"
  };

  return labels[value] ?? value.replaceAll("_", " ");
}

async function selectMuiOption(page: Page, label: string, optionText: string, index = 0) {
  await page
    .getByRole("combobox", { name: new RegExp(`^${escapeRegExp(label)}`) })
    .nth(index)
    .click();
  await page.getByRole("option", { name: optionText, exact: true }).click();
  await page.waitForTimeout(150);
}

async function selectAutocompleteOption(page: Page, label: string, optionText: string, index = 0) {
  const combobox = page.getByRole("combobox", { name: label, exact: true }).nth(index);
  await combobox.click();
  await combobox.fill("");
  await combobox.fill(optionText);
  await page.getByRole("option", { name: optionText, exact: true }).click();
  await page.waitForTimeout(150);
}

async function readFichaTotalCost(page: Page) {
  const labels = ["Custo total da ficha", "Custo Real da Ficha", "Total atual"];

  for (const label of labels) {
    const value = page.getByText(label, { exact: true }).locator("xpath=following-sibling::*[1]");

    if (await value.count()) {
      return (await value.textContent()) ?? "";
    }
  }

  return "";
}

async function seedPendingConflict(targetItemName: string) {
  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ?? "postgresql://sis:sis@localhost:5432/sis_restaurante?schema=public"
  });
  await client.connect();
  const targetItemResult = await client.query<{ id: string }>(
    "select id from item where nome = $1 order by criado_em desc limit 1",
    [targetItemName]
  );
  const targetItem = targetItemResult.rows[0];

  if (!targetItem) {
    await client.end();
    throw new Error(`Item alvo nao encontrado para conflito E2E: ${targetItemName}`);
  }

  const rawName = `Tomate Italiano E2E ${Date.now()}`;
  const execucaoId = randomUUID();
  const stagingId = randomUUID();
  const conflictId = randomUUID();
  await client.query(
    `insert into importacao_execucao (id, origem_arquivo, status)
     values ($1, $2, $3)`,
    [execucaoId, `e2e-import-${Date.now()}.xlsx`, "concluida_com_conflitos"]
  );
  await client.query(
    `insert into importacao_staging (
      id,
      execucao_id,
      entidade,
      chave_externa,
      sheet_name,
      row_number,
      payload_json,
      status,
      atualizado_em
    ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, now())`,
    [stagingId, execucaoId, "item", `item:e2e:${Date.now()}`, "ABA E2E", 1, JSON.stringify({ display_name: rawName }), "conflict"]
  );
  await client.query(
    `insert into importacao_conflito (
      id,
      execucao_id,
      staging_id,
      tipo,
      raw_name,
      normalized_name,
      sheet_name,
      row_number,
      confidence
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [conflictId, execucaoId, stagingId, "name_conflict", rawName, rawName.toLowerCase(), "ABA E2E", 1, "0.9900"]
  );
  await client.end();

  return {
    rawName,
    targetItemId: targetItem.id
  };
}

async function selectIngredientRowItem(page: Page, itemName: string, index = 0) {
  await page.getByLabel("Item", { exact: true }).nth(index).click();
  await page.getByRole("option", { name: itemName, exact: true }).click();
  await page.waitForTimeout(150);
}

async function setHiddenInput(page: Page, name: string, value: string) {
  await page.locator(`input[name="${name}"]`).evaluate(
    (element, nextValue) => {
      (element as HTMLInputElement).value = String(nextValue);
    },
    value
  );
}

async function addMaterialFromLibrary(page: Page, itemName: string) {
  await page.getByRole("tab", { name: "Biblioteca de materiais", exact: true }).click();
  await page.getByLabel("Buscar material", { exact: true }).fill(itemName);
  const card = page.locator('[class*="MuiCard-root"]').filter({ hasText: itemName }).first();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page.waitForTimeout(150);
}

async function createFicha(page: Page, input: {
  itemId: string;
  itemName: string;
  itemType: string;
  yieldMode: "peso_final";
  finalWeight: string;
  portions: string;
  preparationMode: string;
  notes: string;
  salePrice?: string;
  variableExpensePercent?: string;
  components: Array<{
    itemName: string;
    componentType: "ingrediente" | "embalagem" | "apoio";
    quantityGross: string;
    quantityNet: string;
    usageUnit: string;
  }>;
}) {
  await page.goto("/fichas/nova");
  await expect(page.getByRole("heading", { name: /criar ficha tecnica/i })).toBeVisible();

  await page.getByLabel("Produto").fill(input.itemName);
  await setHiddenInput(page, "itemId", input.itemId);
  await setHiddenInput(page, "itemType", input.itemType);
  await setHiddenInput(page, "yieldMode", input.yieldMode);
  await selectMuiOption(page, "Status", "Ativa");
  await page.getByLabel(/^Rendimento(\s+\*)?$/).fill(input.portions);
  await page.getByLabel("Qtde Final").first().fill(input.finalWeight);

  const primaryComponent = input.components[0];
  if (!primaryComponent) {
    throw new Error(`A ficha E2E para ${input.itemName} precisa de ao menos um componente.`);
  }

  if ((await page.getByLabel("Item", { exact: true }).count()) === 0) {
    await page.getByRole("button", { name: /adicionar itens/i }).first().click();
  }

  await selectIngredientRowItem(page, primaryComponent.itemName);
  await page
    .getByLabel("Quantidade utilizada", { exact: true })
    .first()
    .fill(primaryComponent.quantityNet);
  await page.getByLabel("Unidade", { exact: true }).first().fill(primaryComponent.usageUnit);

  for (const component of input.components.slice(1)) {
    if (component.componentType === "ingrediente") {
      await addMaterialFromLibrary(page, component.itemName);
      const quantityField = page.getByLabel("Quantidade utilizada", { exact: true }).last();
      await expect(quantityField).toBeVisible();
      await quantityField.fill(component.quantityNet);
      await page.getByLabel("Unidade", { exact: true }).last().fill(component.usageUnit);
      continue;
    }

    await page.getByRole("button", { name: /ativar montagem e descartaveis/i }).click();
    await page.getByRole("button", { name: /adicionar itens/i }).last().click();
    await selectIngredientRowItem(page, component.itemName, (await page.getByLabel("Item", { exact: true }).count()) - 1);
    await page.getByLabel("Quantidade utilizada", { exact: true }).last().fill(component.quantityNet);
    await page.getByLabel("Unidade", { exact: true }).last().fill(component.usageUnit);
  }

  if (input.salePrice) {
    await page.getByLabel("Preco de venda", { exact: true }).fill(input.salePrice);
  }

  if (input.variableExpensePercent) {
    await page
      .getByLabel("Despesa variavel de venda (%PV)", { exact: true })
      .fill(input.variableExpensePercent);
  }

  const preparationField = page.getByRole("textbox", { name: /^Modo de preparo/i });
  await preparationField.scrollIntoViewIfNeeded();
  await preparationField.fill(input.preparationMode);

  const notesField = page.getByRole("textbox", { name: /^Observacoes da ficha/i });
  await notesField.scrollIntoViewIfNeeded();
  await notesField.fill(input.notes);

  await Promise.all([
    page.waitForURL("**/fichas/**?saved=1"),
    page.getByRole("button", { name: /salvar ficha/i }).first().click()
  ]);

  const fichaId = page.url().match(/\/fichas\/([^?]+)/)?.[1];
  if (!fichaId) {
    throw new Error(`Nao foi possivel identificar a ficha criada para ${input.itemName}.`);
  }

  return fichaId;
}

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("admin@sis-restaurante.local");
  await page.locator('input[name="password"]').fill("admin123");
  await page.getByRole("button", { name: /entrar no painel/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

async function createItem(page: Page, input: {
  name: string;
  type: string;
  operationalCategory: string;
  stockUnit: string;
  usageUnit: string;
  conversionFactor: string;
  description: string;
  supplierName: string;
  purchaseUnit: string;
  purchaseQuantity: string;
  purchaseCost: string;
  priceUpdatedAt: string;
}) {
  await page.goto("/itens/novo");
  await expect(page.getByRole("heading", { name: /novo item/i })).toBeVisible();
  // Bloco 1 Identificacao (pos-08-04): Codigo | Nome do item | Status | Tipo | Categoria operacional
  await page.getByLabel("Codigo", { exact: true }).fill(`E2E-${Date.now().toString().slice(-6)}`);
  await page.getByLabel("Nome do item").fill(input.name);
  if (input.type !== "insumo") {
    await selectMuiOption(page, "Tipo", humanizeType(input.type));
  }
  await selectMuiOption(page, "Categoria operacional", input.operationalCategory);
  await selectMuiOption(page, "Status", "Ativo");
  // Bloco 2 Detalhamento de Compras / Fornecedor (pos-08-03): Fornecedor + unidades + qtdes + preco ficam
  // DENTRO do card do fornecedor principal. Unidade de compra fica desabilitada (hidden input); Unidade
  // de uso eh editavel no principal; Quantidade de uso eh editavel no principal; Fator eh calculado
  // automaticamente (qc/qu) — nao recebe mais fill direto.
  await page.locator('input[name="purchaseSupplierName"]').fill(input.supplierName);
  await selectMuiOption(page, "Unidade de uso", input.usageUnit);
  await page.locator('input[name="purchaseQuantity"]').fill(input.purchaseQuantity);
  await page.locator('input[name="purchaseUsageQuantity"]').fill("1.0000");
  await page.locator('input[name="purchaseCost"]').fill(input.purchaseCost);
  // Bloco 3 Observacoes (pos-08-04): "Descricao operacional (opcional)" — label com marker inline
  await page.getByLabel(/Descricao operacional/i).fill(input.description);
  await Promise.all([
    page.waitForURL("**/itens/**?saved=1"),
    page.getByRole("button", { name: /salvar item/i }).click()
  ]);
  await expect(page).toHaveURL(/\/itens\/.+\?saved=1$/);
  await expect(page.getByRole("heading", { name: input.name })).toBeVisible();

  const itemId = page.url().match(/\/itens\/([^?]+)/)?.[1];
  if (!itemId) {
    throw new Error(`Nao foi possivel identificar o item criado para ${input.name}.`);
  }

  return itemId;
}

test("supports the full engineering flow from item creation to cascade recalculation", async ({
  page
}) => {
  test.setTimeout(180_000);
  const insumoName = uniqueName("Tomate E2E");
  const intermediarioName = uniqueName("Molho E2E");
  const embalagemName = uniqueName("Pote E2E");
  const pratoName = uniqueName("Prato E2E");
  let insumoId = "";
  let intermediarioId = "";
  let embalagemId = "";
  let pratoId = "";

  await loginAsAdmin(page);

  await test.step("creates the required items", async () => {
    insumoId = await createItem(page, {
      name: insumoName,
      type: "insumo",
      operationalCategory: "Hortifruti",
      stockUnit: "kg",
      usageUnit: "g",
      conversionFactor: "1000.0000",
      description: "Insumo base do fluxo e2e.",
      supplierName: "Fornecedor E2E Hortifruti",
      purchaseUnit: "kg",
      purchaseQuantity: "1.0000",
      purchaseCost: "10.0000",
      priceUpdatedAt: "2026-03-16"
    });

    intermediarioId = await createItem(page, {
      name: intermediarioName,
      type: "pre_preparo",
      operationalCategory: "Operacional",
      stockUnit: "kg",
      usageUnit: "g",
      conversionFactor: "1000.0000",
      description: "Item intermediario do fluxo e2e.",
      supplierName: "Fornecedor E2E Cozinha",
      purchaseUnit: "kg",
      purchaseQuantity: "1.0000",
      purchaseCost: "1.0000",
      priceUpdatedAt: "2026-03-16"
    });

    embalagemId = await createItem(page, {
      name: embalagemName,
      type: "embalagem",
      operationalCategory: "Embalagens",
      stockUnit: "un",
      usageUnit: "un",
      conversionFactor: "1.0000",
      description: "Embalagem do fluxo e2e.",
      supplierName: "Fornecedor E2E Embalagem",
      purchaseUnit: "un",
      purchaseQuantity: "1.0000",
      purchaseCost: "0.8000",
      priceUpdatedAt: "2026-03-16"
    });

    pratoId = await createItem(page, {
      name: pratoName,
      type: "prato",
      operationalCategory: "Operacional",
      stockUnit: "kg",
      usageUnit: "g",
      conversionFactor: "1000.0000",
      description: "Produto final do fluxo e2e.",
      supplierName: "Fornecedor E2E Montagem",
      purchaseUnit: "kg",
      purchaseQuantity: "1.0000",
      purchaseCost: "1.0000",
      priceUpdatedAt: "2026-03-16"
    });

  });

  await test.step("creates an intermediate ficha in the UI", async () => {
    const fichaId = await createFicha(page, {
      itemId: intermediarioId,
      itemName: intermediarioName,
      itemType: "pre_preparo",
      yieldMode: "peso_final",
      finalWeight: "900.0000",
      portions: "9.0000",
      preparationMode: "Cozinhar e reduzir.",
      notes: "Ficha intermediaria do fluxo e2e.",
      components: [
        {
          itemName: insumoName,
          componentType: "ingrediente",
          quantityGross: "1000.0000",
          quantityNet: "900.0000",
          usageUnit: "g"
        }
      ]
    });

    await page.goto(`/fichas/${fichaId}`);
    await expect(page.getByRole("heading", { name: new RegExp(intermediarioName, "i") })).toBeVisible();
    await expect(page.getByText("Quadro final da ficha", { exact: true })).toBeVisible();
  });

  let custoAntes = "";

  await test.step("creates the final ficha in the UI", async () => {
    const fichaId = await createFicha(page, {
      itemId: pratoId,
      itemName: pratoName,
      itemType: "prato",
      yieldMode: "peso_final",
      finalWeight: "350.0000",
      portions: "1.0000",
      salePrice: "87.9000",
      variableExpensePercent: "0.1500",
      preparationMode: "Montar e embalar.",
      notes: "Ficha final do fluxo e2e.",
      components: [
        {
          itemName: intermediarioName,
          componentType: "ingrediente",
          quantityGross: "300.0000",
          quantityNet: "300.0000",
          usageUnit: "g"
        },
        {
          itemName: embalagemName,
          componentType: "embalagem",
          quantityGross: "1.0000",
          quantityNet: "1.0000",
          usageUnit: "un"
        }
      ]
    });

    await page.goto(`/fichas/${fichaId}`);
    await expect(page.getByRole("heading", { name: new RegExp(pratoName, "i") })).toBeVisible();
    await expect(page.getByText("Montagem e Descartaveis").first()).toBeVisible();
    await expect(page.getByText("CMV final aplicado").first()).toBeVisible();
    await expect(page.getByText("Preco de venda").first()).toBeVisible();

    custoAntes = await readFichaTotalCost(page);
    expect(custoAntes).not.toBe("");
  });

  await test.step("updates the input price and expects cascade recalculation", async () => {
    await page.goto(`/itens?query=${encodeURIComponent(insumoName)}`, {
      waitUntil: "domcontentloaded"
    });
    const itemRow = page.getByRole("row").filter({ hasText: insumoName }).first();
    await expect(itemRow).toBeVisible();
    await Promise.all([page.waitForURL(/\/itens\/.+$/), itemRow.click()]);

    await page.locator('input[name="purchaseCost"]').first().fill("14.0000");
    await Promise.all([
      page.waitForURL(/\/itens\/.+\?saved=1$/),
      page.getByRole("button", { name: /salvar alteracoes/i }).click()
    ]);
    await expect(page).toHaveURL(/\/itens\/.+\?saved=1$/);

    await page.goto(`/fichas?query=${encodeURIComponent(pratoName)}`, {
      waitUntil: "domcontentloaded"
    });
    const fichaRow = page.getByRole("row").filter({ hasText: pratoName }).first();
    await expect(fichaRow).toBeVisible();
    await Promise.all([page.waitForURL(/\/fichas\/.+$/), fichaRow.click()]);

    const custoDepois = await readFichaTotalCost(page);
    expect(custoDepois).not.toBe(custoAntes);
  });

  await test.step("consults the expanded tree and inactivates the ficha", async () => {
    await page.goto("/composicao", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Filtrar por ficha", { exact: true }).fill(pratoName);
    await expect(page.getByText(insumoName, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(embalagemName).first()).toBeVisible();

    await page.goto(`/fichas?query=${encodeURIComponent(pratoName)}`, {
      waitUntil: "domcontentloaded"
    });
    const finalFichaRow = page.getByRole("row").filter({ hasText: pratoName }).first();
    await expect(finalFichaRow).toBeVisible();
    await Promise.all([page.waitForURL(/\/fichas\/.+$/), finalFichaRow.click()]);
    await page.getByRole("button", { name: "Inativar ficha", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Inativar ficha", exact: true });
    await expect(dialog).toBeVisible();
    await Promise.all([
      page.waitForURL(/inactivated=1$/),
      dialog.getByRole("button", { name: "Inativar ficha", exact: true }).click()
    ]);

    await expect(page.getByText("inativa", { exact: true }).first()).toBeVisible();
  });

  await test.step("resolves a persisted import conflict in the UI", async () => {
    const conflict = await seedPendingConflict(insumoName);
    await page.goto("/importacao/pendencias", { waitUntil: "domcontentloaded" });
    const conflictRow = page.getByRole("row").filter({ hasText: conflict.rawName }).first();

    await expect(conflictRow).toBeVisible();
    await conflictRow.getByRole("button", { name: /resolver/i }).click();
    const dialog = page.getByRole("dialog", { name: /resolver pendencia/i });

    await expect(dialog).toBeVisible();
    await selectAutocompleteOption(page, "Item-alvo", insumoName);
    await dialog.getByLabel("Alias").fill("Tomate Italiano E2E");
    await dialog.getByRole("button", { name: /resolver/i }).click();

    await expect(page).toHaveURL(/resolved=1/);
  });
});

// ===========================================================================
// PDFV2-FICHA-07 — Banner "ingrediente ja aparece em ficha semelhante"
// ===========================================================================

test("PDFV2-FICHA-07 — banner ingrediente em ficha semelhante", async ({ page }) => {
  test.setTimeout(180_000);
  const ingredientName = uniqueName("ArrozPDFV2FICHA07");
  const firstFichaName = uniqueName("FichaPDFV2FICHA07-A");
  const secondFichaName = uniqueName("FichaPDFV2FICHA07-B");

  await loginAsAdmin(page);

  // 1) Cria o ingrediente insumo
  const ingredientId = await createItem(page, {
    name: ingredientName,
    type: "insumo",
    operationalCategory: "Hortifruti",
    stockUnit: "kg",
    usageUnit: "kg",
    conversionFactor: "1.0000",
    description: "Insumo compartilhado PDFV2-FICHA-07.",
    supplierName: "Fornecedor PDFV2-FICHA-07",
    purchaseUnit: "kg",
    purchaseQuantity: "1.0000",
    purchaseCost: "8.0000",
    priceUpdatedAt: "2026-04-17"
  });

  // 2) Cria a primeira ficha com modalidade Delivery + ingrediente X
  await page.goto("/fichas/nova");
  await expect(page.getByRole("heading", { name: /criar ficha tecnica/i })).toBeVisible();
  await page.getByLabel("Produto").fill(firstFichaName);
  await setHiddenInput(page, "itemId", ingredientId);
  await setHiddenInput(page, "itemType", "insumo");
  await setHiddenInput(page, "yieldMode", "peso_final");
  await selectMuiOption(page, "Modalidade", "Delivery");
  await selectMuiOption(page, "Status", "Ativa");
  await page.getByLabel(/^Rendimento(\s+\*)?$/).fill("1.0000");
  await page.getByLabel("Qtde Final").first().fill("1.0000");
  if ((await page.getByLabel("Item", { exact: true }).count()) === 0) {
    await page.getByRole("button", { name: /adicionar itens/i }).first().click();
  }
  await selectIngredientRowItem(page, ingredientName);
  await page.getByLabel("Quantidade utilizada", { exact: true }).first().fill("1.0000");
  await page.getByLabel("Unidade", { exact: true }).first().fill("kg");
  const preparationFieldA = page.getByRole("textbox", { name: /^Modo de preparo/i });
  await preparationFieldA.scrollIntoViewIfNeeded();
  await preparationFieldA.fill("Passo 1.");
  const notesFieldA = page.getByRole("textbox", { name: /^Observacoes da ficha/i });
  await notesFieldA.scrollIntoViewIfNeeded();
  await notesFieldA.fill("Ficha A");
  await Promise.all([
    page.waitForURL("**/fichas/**?saved=1"),
    page.getByRole("button", { name: /salvar ficha/i }).first().click()
  ]);

  // 3) Cria a segunda ficha com MESMA modalidade + MESMO ingrediente. Deve aparecer banner.
  await page.goto("/fichas/nova");
  await expect(page.getByRole("heading", { name: /criar ficha tecnica/i })).toBeVisible();
  await page.getByLabel("Produto").fill(secondFichaName);
  await setHiddenInput(page, "itemId", ingredientId);
  await setHiddenInput(page, "itemType", "insumo");
  await setHiddenInput(page, "yieldMode", "peso_final");
  await selectMuiOption(page, "Modalidade", "Delivery");
  await selectMuiOption(page, "Status", "Ativa");
  await page.getByLabel(/^Rendimento(\s+\*)?$/).fill("1.0000");
  await page.getByLabel("Qtde Final").first().fill("1.0000");
  if ((await page.getByLabel("Item", { exact: true }).count()) === 0) {
    await page.getByRole("button", { name: /adicionar itens/i }).first().click();
  }
  await selectIngredientRowItem(page, ingredientName);

  // Banner deve aparecer inline com o nome da primeira ficha
  await expect(page.getByText(/Este ingrediente ja aparece em/i).first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("link", { name: new RegExp(firstFichaName, "i") })).toBeVisible();
});

test("PDFV2-FICHA-07 — banner NAO aparece se modalidade diferente", async ({ page }) => {
  test.setTimeout(180_000);
  const ingredientName = uniqueName("ArrozPDFV2F07Neg1");
  const firstFichaName = uniqueName("FichaPDFV2F07Neg1-A");
  const secondFichaName = uniqueName("FichaPDFV2F07Neg1-B");

  await loginAsAdmin(page);

  const ingredientId = await createItem(page, {
    name: ingredientName,
    type: "insumo",
    operationalCategory: "Hortifruti",
    stockUnit: "kg",
    usageUnit: "kg",
    conversionFactor: "1.0000",
    description: "Insumo negativo 1 PDFV2-FICHA-07.",
    supplierName: "Fornecedor PDFV2-FICHA-07-neg1",
    purchaseUnit: "kg",
    purchaseQuantity: "1.0000",
    purchaseCost: "8.0000",
    priceUpdatedAt: "2026-04-17"
  });

  // Primeira ficha na modalidade Delivery
  await page.goto("/fichas/nova");
  await page.getByLabel("Produto").fill(firstFichaName);
  await setHiddenInput(page, "itemId", ingredientId);
  await setHiddenInput(page, "itemType", "insumo");
  await setHiddenInput(page, "yieldMode", "peso_final");
  await selectMuiOption(page, "Modalidade", "Delivery");
  await selectMuiOption(page, "Status", "Ativa");
  await page.getByLabel(/^Rendimento(\s+\*)?$/).fill("1.0000");
  await page.getByLabel("Qtde Final").first().fill("1.0000");
  if ((await page.getByLabel("Item", { exact: true }).count()) === 0) {
    await page.getByRole("button", { name: /adicionar itens/i }).first().click();
  }
  await selectIngredientRowItem(page, ingredientName);
  await page.getByLabel("Quantidade utilizada", { exact: true }).first().fill("1.0000");
  await page.getByLabel("Unidade", { exact: true }).first().fill("kg");
  const prepA = page.getByRole("textbox", { name: /^Modo de preparo/i });
  await prepA.scrollIntoViewIfNeeded();
  await prepA.fill("x");
  const notesA = page.getByRole("textbox", { name: /^Observacoes da ficha/i });
  await notesA.scrollIntoViewIfNeeded();
  await notesA.fill("y");
  await Promise.all([
    page.waitForURL("**/fichas/**?saved=1"),
    page.getByRole("button", { name: /salvar ficha/i }).first().click()
  ]);

  // Segunda ficha com modalidade DIFERENTE
  await page.goto("/fichas/nova");
  await page.getByLabel("Produto").fill(secondFichaName);
  await setHiddenInput(page, "itemId", ingredientId);
  await setHiddenInput(page, "itemType", "insumo");
  await setHiddenInput(page, "yieldMode", "peso_final");
  await selectMuiOption(page, "Modalidade", "Presencial");
  await selectMuiOption(page, "Status", "Ativa");
  await page.getByLabel(/^Rendimento(\s+\*)?$/).fill("1.0000");
  await page.getByLabel("Qtde Final").first().fill("1.0000");
  if ((await page.getByLabel("Item", { exact: true }).count()) === 0) {
    await page.getByRole("button", { name: /adicionar itens/i }).first().click();
  }
  await selectIngredientRowItem(page, ingredientName);

  // Esperar render atualizar
  await page.waitForTimeout(1500);
  await expect(page.getByText(/Este ingrediente ja aparece em/i)).toHaveCount(0);
});

test("PDFV2-FICHA-07 — banner NAO aparece se item diferente", async ({ page }) => {
  test.setTimeout(180_000);
  const ingredientAName = uniqueName("ArrozPDFV2F07Neg2A");
  const ingredientBName = uniqueName("FeijaoPDFV2F07Neg2B");
  const firstFichaName = uniqueName("FichaPDFV2F07Neg2-A");
  const secondFichaName = uniqueName("FichaPDFV2F07Neg2-B");

  await loginAsAdmin(page);

  const ingredientAId = await createItem(page, {
    name: ingredientAName,
    type: "insumo",
    operationalCategory: "Hortifruti",
    stockUnit: "kg",
    usageUnit: "kg",
    conversionFactor: "1.0000",
    description: "Insumo A negativo 2.",
    supplierName: "Fornecedor PDFV2-FICHA-07-neg2-A",
    purchaseUnit: "kg",
    purchaseQuantity: "1.0000",
    purchaseCost: "8.0000",
    priceUpdatedAt: "2026-04-17"
  });
  const ingredientBId = await createItem(page, {
    name: ingredientBName,
    type: "insumo",
    operationalCategory: "Hortifruti",
    stockUnit: "kg",
    usageUnit: "kg",
    conversionFactor: "1.0000",
    description: "Insumo B negativo 2.",
    supplierName: "Fornecedor PDFV2-FICHA-07-neg2-B",
    purchaseUnit: "kg",
    purchaseQuantity: "1.0000",
    purchaseCost: "7.0000",
    priceUpdatedAt: "2026-04-17"
  });

  // Ficha 1 com ingrediente A
  await page.goto("/fichas/nova");
  await page.getByLabel("Produto").fill(firstFichaName);
  await setHiddenInput(page, "itemId", ingredientAId);
  await setHiddenInput(page, "itemType", "insumo");
  await setHiddenInput(page, "yieldMode", "peso_final");
  await selectMuiOption(page, "Modalidade", "Delivery");
  await selectMuiOption(page, "Status", "Ativa");
  await page.getByLabel(/^Rendimento(\s+\*)?$/).fill("1.0000");
  await page.getByLabel("Qtde Final").first().fill("1.0000");
  if ((await page.getByLabel("Item", { exact: true }).count()) === 0) {
    await page.getByRole("button", { name: /adicionar itens/i }).first().click();
  }
  await selectIngredientRowItem(page, ingredientAName);
  await page.getByLabel("Quantidade utilizada", { exact: true }).first().fill("1.0000");
  await page.getByLabel("Unidade", { exact: true }).first().fill("kg");
  const prepA2 = page.getByRole("textbox", { name: /^Modo de preparo/i });
  await prepA2.scrollIntoViewIfNeeded();
  await prepA2.fill("x");
  const notesA2 = page.getByRole("textbox", { name: /^Observacoes da ficha/i });
  await notesA2.scrollIntoViewIfNeeded();
  await notesA2.fill("y");
  await Promise.all([
    page.waitForURL("**/fichas/**?saved=1"),
    page.getByRole("button", { name: /salvar ficha/i }).first().click()
  ]);

  // Ficha 2 com ingrediente B (mesma modalidade, item DIFERENTE)
  await page.goto("/fichas/nova");
  await page.getByLabel("Produto").fill(secondFichaName);
  await setHiddenInput(page, "itemId", ingredientBId);
  await setHiddenInput(page, "itemType", "insumo");
  await setHiddenInput(page, "yieldMode", "peso_final");
  await selectMuiOption(page, "Modalidade", "Delivery");
  await selectMuiOption(page, "Status", "Ativa");
  await page.getByLabel(/^Rendimento(\s+\*)?$/).fill("1.0000");
  await page.getByLabel("Qtde Final").first().fill("1.0000");
  if ((await page.getByLabel("Item", { exact: true }).count()) === 0) {
    await page.getByRole("button", { name: /adicionar itens/i }).first().click();
  }
  await selectIngredientRowItem(page, ingredientBName);

  await page.waitForTimeout(1500);
  await expect(page.getByText(/Este ingrediente ja aparece em/i)).toHaveCount(0);
});
