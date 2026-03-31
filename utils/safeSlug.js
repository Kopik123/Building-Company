const toLowerAscii = (value) => String(value || '').trim().toLowerCase();

const trimEdgeDashes = (value) => {
  let start = 0;
  let end = value.length;

  while (start < end && value.charCodeAt(start) === 45) start += 1;
  while (end > start && value.charCodeAt(end - 1) === 45) end -= 1;

  return value.slice(start, end);
};

const buildSafeSlug = (value, { allowUnderscore = false, maxLength = 0 } = {}) => {
  const input = toLowerAscii(value);
  let output = '';
  let lastWasDash = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const code = input.charCodeAt(index);
    const isDigit = code >= 48 && code <= 57;
    const isLower = code >= 97 && code <= 122;
    const isUnderscore = allowUnderscore && code === 95;

    if (isDigit || isLower || isUnderscore) {
      output += char;
      lastWasDash = false;
      continue;
    }

    if (!lastWasDash && output) {
      output += '-';
      lastWasDash = true;
    }
  }

  const trimmed = trimEdgeDashes(output);
  if (maxLength > 0 && trimmed.length > maxLength) {
    return trimEdgeDashes(trimmed.slice(0, maxLength));
  }

  return trimmed;
};

module.exports = { buildSafeSlug };
