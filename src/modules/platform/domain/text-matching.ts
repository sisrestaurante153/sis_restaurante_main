// Normalizacao e comparacao de texto por similaridade de tokens (Jaccard).
// Usado para casar descricoes livres (PDV, nomes de fichas) contra o
// catalogo quando nao ha um identificador exato em comum.

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

export function jaccard(a: string[], b: string[]): number {
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
