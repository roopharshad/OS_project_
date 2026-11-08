// Minimal C syntax highlighter. Returns an array of lines; each line is an
// array of { text, kind } tokens. Kinds: comment, string, pre, keyword, type,
// fn, api, number, macro, plain.

const KEYWORDS = new Set(['if', 'else', 'for', 'while', 'do', 'return', 'break', 'continue', 'switch', 'case', 'default', 'sizeof', 'static', 'const', 'struct', 'typedef', 'void', 'int', 'char', 'unsigned', 'long']);
const TYPES = new Set(['pthread_t', 'sem_t', 'size_t']);
const API = new Set(['sem_init', 'sem_wait', 'sem_post', 'sem_destroy', 'pthread_create', 'pthread_join', 'printf', 'perror', 'sleep']);
const MACROS = new Set(['N', 'ROUNDS', 'THINKING', 'HUNGRY', 'EATING', 'LEFT', 'RIGHT', 'NULL', 'EXIT_SUCCESS', 'EXIT_FAILURE']);

const RE = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(^[ \t]*#[^\n]*)|([A-Za-z_]\w*)|(\d+[A-Za-z]*)|(\n)|([^\w\n"'/#]+|[/#])/gm;

export function highlightC(src) {
  const lines = [[]];
  const push = (text, kind) => {
    const parts = text.split('\n');
    parts.forEach((p, k) => {
      if (k > 0) lines.push([]);
      if (p) lines[lines.length - 1].push({ text: p, kind });
    });
  };

  let m;
  RE.lastIndex = 0;
  while ((m = RE.exec(src)) !== null) {
    const [tok, comment, str, pre, word, num, nl] = m;
    if (comment) push(tok, 'comment');
    else if (str) push(tok, 'string');
    else if (pre) push(tok, 'pre');
    else if (word) {
      const next = src.slice(RE.lastIndex).match(/^\s*\(/);
      if (KEYWORDS.has(word)) push(tok, 'keyword');
      else if (TYPES.has(word)) push(tok, 'type');
      else if (API.has(word)) push(tok, 'api');
      else if (MACROS.has(word)) push(tok, 'macro');
      else if (next) push(tok, 'fn');
      else push(tok, 'plain');
    } else if (num) push(tok, 'number');
    else if (nl) push('\n', 'plain');
    else push(tok, 'plain');
  }
  return lines;
}

export const TOKEN_COLORS = {
  comment: '#8B9187',
  string: '#7A6A2E',
  pre: '#6B5E9E',
  keyword: '#9A4E2E',
  type: '#2F6A8F',
  api: '#315C46',
  fn: '#1F4A36',
  macro: '#8A5A12',
  number: '#A0522D',
  plain: '#252823',
};
