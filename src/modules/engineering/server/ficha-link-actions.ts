"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/modules/access/server/session-cookie";
import { getEngineeringRepository } from "@/modules/engineering/server/engineering-repository";
import { getSourceFichaForLink } from "@/modules/engineering/server/ficha-link-repository";
import { extractWeightInGrams } from "@/modules/engineering/domain/peso-extraction";
import { computeScaleFactor, scaleFichaFields } from "@/modules/engineering/domain/ficha-link-scaling";
import { DomainInvariantError } from "@/modules/engineering/domain/errors";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  if (typeof value !== "string" || !value.trim()) {
    throw new DomainInvariantError(`Campo obrigatorio ausente: ${name}.`);
  }
  return value;
}

const AUTO_CLONE_NOTE =
  "Ficha clonada automaticamente a partir de outro item do catalogo. As quantidades vieram da receita original " +
  "(em lote/outro tamanho) e precisam de ajuste manual antes de ativar.";

// Caminho sem peso identificavel no nome do item (ou medido em ml/l): clona
// a ficha candidata como esta, sem recalcular nada, como rascunho.
export async function linkFichaToPendingItemAction(formData: FormData) {
  const session = await requireSession();

  try {
    const sourceFichaId = readField(formData, "sourceFichaId");
    const targetItemId = readField(formData, "targetItemId");

    await getEngineeringRepository(session.restaurantId).linkFichaToPendingItem({
      sourceFichaId,
      targetItemId,
      scaleFactor: new Prisma.Decimal(1),
      status: "rascunho",
      observacaoOverride: AUTO_CLONE_NOTE
    });
  } catch {
    redirect("/fichas/vincular-pendentes?error=link");
  }

  redirect("/fichas/vincular-pendentes?linked=1");
}

export interface ScaledLinkPreviewRow {
  itemName: string;
  before: string;
  after: string;
}

export interface ScaledLinkPreview {
  ok: true;
  scaleFactor: string;
  rows: ScaledLinkPreviewRow[];
}

export interface ScaledLinkPreviewError {
  ok: false;
  message: string;
}

// Calcula (sem persistir) a proporcao e as quantidades recalculadas, para o
// cliente revisar antes de confirmar.
export async function previewScaledFichaLinkAction(
  formData: FormData
): Promise<ScaledLinkPreview | ScaledLinkPreviewError> {
  const session = await requireSession();

  try {
    const sourceFichaId = readField(formData, "sourceFichaId");
    const targetItemName = readField(formData, "targetItemName");

    const extracted = extractWeightInGrams(targetItemName);
    if (!extracted) {
      return { ok: false, message: "Nao foi possivel identificar o peso deste item pelo nome." };
    }

    const source = await getSourceFichaForLink(sourceFichaId, session.restaurantId);
    if (!source) {
      return { ok: false, message: "Ficha candidata nao encontrada." };
    }

    const scaleFactor = computeScaleFactor({
      targetWeightGrams: extracted.grams,
      sourceYieldGrams: source.yieldGrams
    });

    const scaled = scaleFichaFields(
      {
        modoRendimento: source.modoRendimento,
        pesoFinal: null,
        rendimentoPorcoes: null,
        componentes: source.components.map((component) => ({
          cd_ficha_componente: component.id,
          vl_qtd_bruta: new Prisma.Decimal(component.qtdBruta),
          vl_qtd_limpa: component.qtdLimpa ? new Prisma.Decimal(component.qtdLimpa) : null
        }))
      },
      scaleFactor
    );

    const rows: ScaledLinkPreviewRow[] = source.components.map((component, index) => ({
      itemName: component.itemName,
      before: `${component.qtdBruta} ${component.unidadeUso}`,
      after: `${scaled.componentes[index].vl_qtd_bruta.toFixed(4)} ${component.unidadeUso}`
    }));

    return { ok: true, scaleFactor: scaleFactor.toFixed(4), rows };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof DomainInvariantError ? error.message : "Nao foi possivel calcular a proporcao."
    };
  }
}

// Caminho com peso identificavel: recalcula a proporcao (nunca confia no
// fator calculado no cliente) e persiste como ativa.
export async function confirmScaledFichaLinkAction(formData: FormData) {
  const session = await requireSession();

  try {
    const sourceFichaId = readField(formData, "sourceFichaId");
    const targetItemId = readField(formData, "targetItemId");
    const targetItemName = readField(formData, "targetItemName");

    const extracted = extractWeightInGrams(targetItemName);
    if (!extracted) {
      throw new DomainInvariantError("Nao foi possivel identificar o peso deste item pelo nome.");
    }

    const source = await getSourceFichaForLink(sourceFichaId, session.restaurantId);
    if (!source) {
      throw new DomainInvariantError("Ficha candidata nao encontrada.");
    }

    const scaleFactor = computeScaleFactor({
      targetWeightGrams: extracted.grams,
      sourceYieldGrams: source.yieldGrams
    });

    await getEngineeringRepository(session.restaurantId).linkFichaToPendingItem({
      sourceFichaId,
      targetItemId,
      scaleFactor,
      status: "ativa"
    });
  } catch {
    redirect("/fichas/vincular-pendentes?error=link");
  }

  redirect("/fichas/vincular-pendentes?linked=1");
}
