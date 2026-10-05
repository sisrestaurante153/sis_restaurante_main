// Extrai um peso em gramas a partir do nome de um item, quando presente
// (ex.: "Arroz Branco 200g" -> 200, "Feijoada 1,2kg" -> 1200). Usado para
// calcular automaticamente a proporcao ao clonar uma ficha para um item sem
// custo. Intencionalmente NAO reconhece unidades de volume (ml/l): densidade
// de liquido nao e confiavel o bastante para escalar quantidade por peso, e
// um item assim deve sempre cair no caminho sem calculo automatico (clone
// como rascunho).

export interface ExtractedWeight {
  grams: number;
  rawMatch: string;
}

const WEIGHT_PATTERN = /(\d+(?:[.,]\d+)?)\s*(kg|g)\b/gi;

export function extractWeightInGrams(itemName: string): ExtractedWeight | null {
  const matches = [...itemName.matchAll(WEIGHT_PATTERN)];
  if (matches.length === 0) return null;

  // Quando ha mais de um numero com unidade no nome, usa a ultima ocorrencia
  // (convencao observada no catalogo: o peso da porcao vem no final do nome).
  const match = matches[matches.length - 1];
  const rawNumber = match[1].replace(",", ".");
  const unit = match[2].toLowerCase();
  const value = Number.parseFloat(rawNumber);
  if (!Number.isFinite(value) || value <= 0) return null;

  const grams = unit === "kg" ? value * 1000 : value;
  return { grams, rawMatch: match[0] };
}
