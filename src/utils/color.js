const DEFAULT_COLOR = '#2F80ED';

function parseHexColor(input = DEFAULT_COLOR) {
  const rawColor = String(input || DEFAULT_COLOR).trim();
  const normalizedColor = rawColor.startsWith('#') ? rawColor.slice(1) : rawColor;

  if (!/^[0-9a-fA-F]{6}$/.test(normalizedColor)) {
    return null;
  }

  return parseInt(normalizedColor, 16);
}

module.exports = {
  DEFAULT_COLOR,
  parseHexColor
};
