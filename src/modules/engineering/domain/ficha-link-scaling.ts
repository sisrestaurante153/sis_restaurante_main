import { Prisma } from "@/generated/prisma/client";
import { DomainInvariantError } from "@/modules/engineering/domain/errors";

type ModoRendimento = "percentual_perda" | "peso_final";

export interface ScaleFactorInput {
  targetWeightGrams: number;
  sourceYieldGrams: number;
}

export function computeScaleFactor({ targetWeightGrams, sourceYieldGrams }: ScaleFactorInput): Prisma.Decimal {
  if (sourceYieldGrams <= 0) {
    throw new DomainInvariantError("A ficha de origem nao tem rendimento valido para calcular a proporcao.");
  }

  if (targetWeightGrams <= 0) {
    throw new DomainInvariantError("O peso do item de destino precisa ser maior que zero.");
  }

  return new Prisma.Decimal(targetWeightGrams).dividedBy(sourceYieldGrams);
}

export interface ScalableComponent {
  cd_ficha_componente: string;
  vl_qtd_bruta: Prisma.Decimal;
  vl_qtd_limpa: Prisma.Decimal | null;
}

export interface ScalableFichaFields {
  modoRendimento: ModoRendimento;
  pesoFinal: Prisma.Decimal | null;
  rendimentoPorcoes: Prisma.Decimal | null;
  componentes: ScalableComponent[];
}

// Escala as quantidades de uma ficha clonada pela proporcao calculada entre o
// peso do item de destino e o rendimento da ficha de origem. vl_pct_perda
// (modo percentual_perda) NAO e escalado: e uma razao, nao uma quantidade -
// o peso final derivado ja acompanha a escala dos componentes automaticamente.
export function scaleFichaFields(fields: ScalableFichaFields, factor: Prisma.Decimal): ScalableFichaFields {
  return {
    modoRendimento: fields.modoRendimento,
    pesoFinal: fields.modoRendimento === "peso_final" && fields.pesoFinal ? fields.pesoFinal.times(factor) : fields.pesoFinal,
    rendimentoPorcoes: fields.rendimentoPorcoes ? fields.rendimentoPorcoes.times(factor) : fields.rendimentoPorcoes,
    componentes: fields.componentes.map((componente) => ({
      cd_ficha_componente: componente.cd_ficha_componente,
      vl_qtd_bruta: componente.vl_qtd_bruta.times(factor),
      vl_qtd_limpa: componente.vl_qtd_limpa ? componente.vl_qtd_limpa.times(factor) : null
    }))
  };
}
