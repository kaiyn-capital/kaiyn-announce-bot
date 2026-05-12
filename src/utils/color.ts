export const DEFAULT_COLOR = '#87CEEB';

export function parseHexColor(input = DEFAULT_COLOR): number | null {
  const rawColor = String(input || DEFAULT_COLOR).trim();
  const normalizedColor = rawColor.startsWith('#') ? rawColor.slice(1) : rawColor;

  if (!/^[0-9a-fA-F]{6}$/.test(normalizedColor)) {
    return null;
  }

  return parseInt(normalizedColor, 16);
}
