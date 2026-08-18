import fs from 'node:fs/promises';
import path from 'node:path';

export const INDEX_PATH = path.resolve('data/index.json');

export async function loadIndex() {
  const raw = await fs.readFile(INDEX_PATH, 'utf8');
  const index = JSON.parse(raw);
  if (!Array.isArray(index.chunks) || !index.chunks.length) throw new Error('RAG index is empty. Run npm run ingest:seed or npm run ingest.');
  return index;
}

export async function saveIndex(index) {
  await fs.mkdir(path.dirname(INDEX_PATH), { recursive: true });
  await fs.writeFile(INDEX_PATH, JSON.stringify(index, null, 2));
}
