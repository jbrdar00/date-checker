/** Default palette for date range markers (calendar and list). */
export const RANGE_COLOR_PALETTE = [
  '#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed',
  '#0891b2', '#ea580c', '#4f46e5', '#0d9488', '#ca8a04',
  '#db2777', '#0369a1', '#65a30d', '#be185d', '#1e40af',
] as const;

/** Pick a random color from the palette. Optionally avoid colors already used by row IDs. */
export function getRandomRangeColor(usedColors?: Set<string>): string {
  const available = usedColors
    ? RANGE_COLOR_PALETTE.filter((c) => !usedColors.has(c))
    : [...RANGE_COLOR_PALETTE];
  const i = Math.floor(Math.random() * (available.length || 1));
  return available[i] ?? RANGE_COLOR_PALETTE[0];
}
