import { DomainInvariantError } from "@/modules/engineering/domain/errors";

type FichaStatus = "rascunho" | "ativa" | "inativa" | "arquivada";
type ModoRendimento = "percentual_perda" | "peso_final";

interface FichaComponenteDraft {
  ordem: number;
  quantidadeBruta: string;
}

interface FichaTecnicaDraft {
  itemResultanteId: string;
  versao: number;
  status: FichaStatus;
  modoRendimento: ModoRendimento;
  percentualPerda?: string | null;
  pesoFinalInformado?: string | null;
  componentes: FichaComponenteDraft[];
}

interface AssertSingleActiveFichaInput {
  itemResultanteId: string;
  status: FichaStatus;
  existingActiveVersions: number[];
  versaoAtual: number;
}

function parsePositiveDecimal(value: string, fieldName: string) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new DomainInvariantError(`${fieldName} deve ser maior que zero.`);
  }

  return parsedValue;
}

export function assertFichaTecnicaInvariants(draft: FichaTecnicaDraft) {
  if (!draft.itemResultanteId) {
    throw new DomainInvariantError("A ficha tecnica precisa de item resultante.");
  }

  if (!Number.isInteger(draft.versao) || draft.versao < 1) {
    throw new DomainInvariantError("A versao da ficha tecnica deve iniciar em 1.");
  }

  if (draft.componentes.length === 0) {
    throw new DomainInvariantError("A ficha tecnica precisa ter ao menos um componente.");
  }

  if (draft.modoRendimento === "percentual_perda") {
    if (!draft.percentualPerda || draft.pesoFinalInformado) {
      throw new DomainInvariantError(
        "Modo percentual_perda exige apenas percentual de perda informado."
      );
    }

    const percentual = Number(draft.percentualPerda);

    if (!Number.isFinite(percentual) || percentual < 0 || percentual >= 1) {
      throw new DomainInvariantError("O percentual de perda deve estar entre 0 e 1.");
    }
  }

  if (draft.modoRendimento === "peso_final") {
    if (!draft.pesoFinalInformado || draft.percentualPerda) {
      throw new DomainInvariantError("Modo peso_final exige apenas peso final informado.");
    }

    parsePositiveDecimal(draft.pesoFinalInformado, "O peso final");
  }

  const ordens = new Set<number>();

  for (const componente of draft.componentes) {
    if (!Number.isInteger(componente.ordem) || componente.ordem < 1) {
      throw new DomainInvariantError("A ordem dos componentes deve ser inteira e positiva.");
    }

    if (ordens.has(componente.ordem)) {
      throw new DomainInvariantError("A ordem dos componentes deve ser unica na ficha.");
    }

    ordens.add(componente.ordem);
    parsePositiveDecimal(componente.quantidadeBruta, "A quantidade bruta");
  }
}

export function assertSingleActiveFicha({
  itemResultanteId,
  status,
  existingActiveVersions,
  versaoAtual
}: AssertSingleActiveFichaInput) {
  if (status !== "ativa") {
    return;
  }

  const hasOtherActiveVersion = existingActiveVersions.some((version) => version !== versaoAtual);

  if (hasOtherActiveVersion) {
    throw new DomainInvariantError(
      `O item ${itemResultanteId} ja possui ficha ativa em outra versao.`
    );
  }
}

export { DomainInvariantError } from "@/modules/engineering/domain/errors";
