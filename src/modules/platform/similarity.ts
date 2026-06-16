export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1].toLowerCase() === s2[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export function findClosestTerm(query: string, allTerms: string[]): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  let bestTerm: string | null = null;
  let minDistance = Infinity;

  // Deduplicate terms to avoid checking multiple similar variants
  const uniqueTerms = Array.from(new Set(allTerms));

  for (const term of uniqueTerms) {
    const t = term.trim().toLowerCase();
    if (!t || q === t) continue; // Skip identical strings
    
    const dist = levenshteinDistance(q, t);
    if (dist < minDistance) {
      minDistance = dist;
      bestTerm = term;
    }
  }

  // Threshold: distance must be <= 4 and strictly less than half the query length + 1
  if (minDistance <= 4 && minDistance < q.length / 2 + 1) {
    return bestTerm;
  }

  return null;
}
