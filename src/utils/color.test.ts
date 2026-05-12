import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_COLOR, parseHexColor } from './color';

describe('parseHexColor', () => {
  it('accepts colors with or without #', () => {
    assert.equal(parseHexColor('#87CEEB'), 0x87ceeb);
    assert.equal(parseHexColor('87CEEB'), 0x87ceeb);
  });

  it('rejects invalid hex colors', () => {
    assert.equal(parseHexColor('#GGGGGG'), null);
    assert.equal(parseHexColor('#12345'), null);
    assert.equal(parseHexColor('not-a-color'), null);
  });

  it('uses the default color for empty input', () => {
    assert.equal(parseHexColor(''), parseHexColor(DEFAULT_COLOR));
  });
});
