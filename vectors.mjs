import { tokenize } from './text.mjs';

export const LOCAL_VECTOR_DIM = 768;

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function localEmbed(text, dim = LOCAL_VECTOR_DIM) {
  const vector = new Array(dim).fill(0);
  const tokens = tokenize(text);
  const grams = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) grams.push(`${tokens[i]}_${tokens[i+1]}`);

  for (const gram of grams) {
    const hash = hashString(gram);
    const idx = hash % dim;
    const sign = ((hash >>> 8) & 1) ? 1 : -1;
    vector[idx] += sign;
  }
  const norm = Math.sqrt(vector.reduce((s, x) => s + x * x, 0)) || 1;
  return vector.map(x => x / norm);
}

export function cosineSimilarity(a, b) {
  if (!a?.length || a.length !== b?.length) return -1;
  let dot = 0, an = 0, bn = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    an += a[i] * a[i];
    bn += b[i] * b[i];
  }
  if (!an || !bn) return 0;
  return dot / (Math.sqrt(an) * Math.sqrt(bn));
}
