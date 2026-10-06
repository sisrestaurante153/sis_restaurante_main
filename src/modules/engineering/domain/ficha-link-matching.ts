import { jaccard, tokens } from "@/modules/platform/domain/text-matching";

// Faixas de confianca para sugerir uma ficha existente como candidata para
// vincular a um item que ainda nao tem ficha ativa. Abaixo do piso minimo a
// candidata nao e mostrada - o item fica sem sugestao.
const STRONG_MATCH_THRESHOLD = 0.5;
const MIN_SUGGESTION_THRESHOLD = 0.25;
const MAX_CANDIDATES = 3;

export type MatchStrength = "forte" | "fraco";

export interface FichaCandidateSource {
  itemId: string;
  itemName: string;
  fichaId: string;
}

export interface FichaCandidate extends FichaCandidateSource {
  score: number;
  strength: MatchStrength;
  // Quantas outras fichas usam este item como ingrediente - preenchido pelo
  // repositorio (ficha-link-repository.ts), nao calculado aqui.
  usedAsIngredientCount?: number;
}

export function rankFichaCandidates(
  targetName: string,
  candidates: FichaCandidateSource[],
  limit: number = MAX_CANDIDATES
): FichaCandidate[] {
  const targetTokens = tokens(targetName);

  return candidates
    .map((candidate) => ({ candidate, score: jaccard(targetTokens, tokens(candidate.itemName)) }))
    .filter(({ score }) => score >= MIN_SUGGESTION_THRESHOLD)
    .sort((a, b) => b.score - a.score || a.candidate.itemName.localeCompare(b.candidate.itemName))
    .slice(0, limit)
    .map(({ candidate, score }) => ({
      ...candidate,
      score,
      strength: score >= STRONG_MATCH_THRESHOLD ? "forte" : "fraco"
    }));
}
