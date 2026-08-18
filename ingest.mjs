import fs from 'node:fs/promises';
import path from 'node:path';
import { loadEnv } from '../src/env.mjs';
import { chunkText, htmlToText } from '../src/text.mjs';
import { localEmbed, LOCAL_VECTOR_DIM } from '../src/vectors.mjs';
import { createEmbeddings } from '../src/gemini.mjs';
import { saveIndex } from '../src/index-store.mjs';

loadEnv();

const useSeed = process.argv.includes('--seed');
const sources = JSON.parse(await fs.readFile(path.resolve('config/sources.json'), 'utf8'));
const seedDocs = JSON.parse(await fs.readFile(path.resolve('data/seed-documents.json'), 'utf8'));

async function fetchDocuments() {
  const docs = [];
  for (const source of sources) {
    try {
      console.log(`Fetching ${source.url}`);
      const response = await fetch(source.url, {
        headers: { 'User-Agent': 'VibesRAGBot/3.0 (+https://vibescomponents.com)' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const text = htmlToText(html);
      if (text.length < 200) throw new Error('Extracted text is unexpectedly short');
      docs.push({ ...source, content: text });
    } catch (error) {
      console.warn(`Could not fetch ${source.url}: ${error.message}`);
    }
  }
  return docs;
}

let docs = useSeed ? seedDocs : await fetchDocuments();
if (docs.length < 3) {
  console.warn('Using curated seed documents because website crawling was unavailable or incomplete.');
  docs = seedDocs;
}

const chunks = [];
let id = 1;
for (const doc of docs) {
  for (const text of chunkText(doc.content)) {
    chunks.push({ id: `chunk-${id++}`, title: doc.title, url: doc.url, text });
  }
}

const requested = (process.env.EMBEDDING_PROVIDER || 'auto').toLowerCase();
const provider = requested === 'gemini' || (requested === 'auto' && process.env.GEMINI_API_KEY) ? 'gemini' : 'local';
let vectors;
let model;
let dimension;

if (provider === 'gemini') {
  if (!process.env.GEMINI_API_KEY) throw new Error('EMBEDDING_PROVIDER=gemini requires GEMINI_API_KEY in .env');
  console.log(`Creating Gemini embeddings for ${chunks.length} chunks...`);
  vectors = [];
  const batchSize = 50;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize).map(item => `${item.title}\n${item.text}`);
    vectors.push(...await createEmbeddings(batch));
  }
  model = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';
  dimension = vectors[0]?.length ?? 0;
  if (!dimension) throw new Error('Gemini returned empty embeddings.');
} else {
  console.log(`Creating local hashed vectors for ${chunks.length} chunks...`);
  vectors = chunks.map(item => localEmbed(`${item.title}\n${item.text}`));
  model = 'local-hashed-bigram-v1';
  dimension = LOCAL_VECTOR_DIM;
}

for (let i = 0; i < chunks.length; i++) chunks[i].vector = vectors[i];

await saveIndex({
  version: 3,
  generatedAt: new Date().toISOString(),
  provider,
  model,
  dimension,
  sourceMode: useSeed ? 'curated-seed' : (docs === seedDocs ? 'curated-seed-fallback' : 'website-crawl'),
  sourceCount: docs.length,
  chunkCount: chunks.length,
  chunks
});

console.log(`RAG index ready: ${chunks.length} chunks, provider=${provider}, model=${model}`);
