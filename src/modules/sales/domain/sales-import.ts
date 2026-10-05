// Matching de vendas importadas (CSV/Excel de relatorio de PDV) contra o
// catalogo de itens vendaveis. Mesma logica usada no import unico da
// planilha "Relatorio de vendas 07.09 a 12.09" (importada via script), agora
// como fluxo reutilizavel pela tela de importacao de vendas.

export { normalizeForMatch, tokens, jaccard, FUZZY_THRESHOLD } from "@/modules/platform/domain/text-matching";
import { normalizeForMatch, tokens, jaccard, FUZZY_THRESHOLD } from "@/modules/platform/domain/text-matching";

export interface CatalogEntry {
  id: string;
  name: string;
}

export interface SalesImportMatch {
  itemId: string;
  itemName: string;
  score: number;
}

// Resolve o item do catalogo para cada descricao distinta vinda da planilha:
// match exato (score 1) por nome normalizado, senao o melhor candidato por
// similaridade de tokens (Jaccard) se atingir o limiar minimo.
export function resolveSalesImportMatches(
  descriptions: string[],
  catalog: CatalogEntry[]
): Map<string, SalesImportMatch | null> {
  const byNormalizedName = new Map(catalog.map((entry) => [normalizeForMatch(entry.name), entry]));
  const catalogTokens = catalog.map((entry) => ({ entry, toks: tokens(entry.name) }));

  const result = new Map<string, SalesImportMatch | null>();

  for (const description of new Set(descriptions)) {
    const exact = byNormalizedName.get(normalizeForMatch(description));
    if (exact) {
      result.set(description, { itemId: exact.id, itemName: exact.name, score: 1 });
      continue;
    }

    const descTokens = tokens(description);
    let best: CatalogEntry | null = null;
    let bestScore = 0;
    for (const candidate of catalogTokens) {
      const score = jaccard(descTokens, candidate.toks);
      if (score > bestScore) {
        bestScore = score;
        best = candidate.entry;
      }
    }

    if (best && bestScore >= FUZZY_THRESHOLD) {
      result.set(description, { itemId: best.id, itemName: best.name, score: bestScore });
    } else {
      result.set(description, null);
    }
  }

  return result;
}
