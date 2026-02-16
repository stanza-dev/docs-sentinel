/**
 * Strip JSONC comments (single-line // and block comments) while
 * preserving strings that contain // or /*.
 */
export function stripJsoncComments(text: string): string {
  let result = '';
  let i = 0;
  while (i < text.length) {
    // String literal — copy verbatim
    if (text[i] === '"') {
      result += '"';
      i++;
      while (i < text.length && text[i] !== '"') {
        if (text[i] === '\\') {
          result += text[i] + (text[i + 1] ?? '');
          i += 2;
        } else {
          result += text[i];
          i++;
        }
      }
      if (i < text.length) {
        result += '"';
        i++;
      }
    }
    // Single-line comment
    else if (text[i] === '/' && text[i + 1] === '/') {
      // Skip until end of line
      while (i < text.length && text[i] !== '\n') i++;
    }
    // Block comment
    else if (text[i] === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2; // skip closing */
    }
    // Normal character
    else {
      result += text[i];
      i++;
    }
  }
  return result;
}
