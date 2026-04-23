/**
 * Zaokružuje broj na najviše 2 decimale (izbjegava floating point artefakte).
 */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

/**
 * Formatira broj za prikaz: uvijek najviše 2 decimale (npr. 12.34 ili 12.00).
 */
export function format2(value: number): string {
  return round2(value).toFixed(2);
}
