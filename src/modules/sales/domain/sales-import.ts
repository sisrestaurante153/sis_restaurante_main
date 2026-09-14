// Matching de vendas importadas (CSV/Excel de relatorio de PDV) contra o
// catalogo de itens vendaveis. Mesma logica usada no import unico da
// planilha "Relatorio de vendas 07.09 a 12.09" (importada via script), agora
// como fluxo reutilizavel pela tela de importacao de vendas.

export function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

const STOP_WORDS = new Set(["de", "da", "do", "com", "sem", "e", "un", "kg", "pct"]);

export function tokens(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[#{}()]/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export const FUZZY_THRESHOLD = 0.6;

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
