import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkText } from '../src/text.mjs';
import { localEmbed, cosineSimilarity } from '../src/vectors.mjs';
import { answerQuestion, retrieve } from '../src/rag.mjs';

test('chunkText returns usable chunks', () => {
  const chunks = chunkText('One sentence about seals. '.repeat(200), { maxChars: 300, overlapChars: 40 });
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(x => x.length <= 340));
});

test('local embeddings favor related text', () => {
  const q = localEmbed('EV battery seals IP67');
  const related = localEmbed('IP67 compliant seals and gaskets for EV battery applications');
  const unrelated = localEmbed('corporate office address and telephone contact');
  assert.ok(cosineSimilarity(q, related) > cosineSimilarity(q, unrelated));
});

test('retrieval finds EV source for EV question', async () => {
  const { results } = await retrieve('Do you make seals for EV battery packs?');
  assert.ok(results.length > 0);
  assert.ok(results.some(r => /EV Battery/i.test(r.title)));
});

test('product overview returns explicit verified product names', async () => {
  const result = await answerQuestion({ message: 'What products do you manufacture?', history: [] });
  assert.match(result.answer, /Grommets/i);
  assert.match(result.answer, /Wire & Connector/i);
  assert.match(result.answer, /EV Battery/i);
  assert.equal(result.mode, 'verified-company-facts');
  assert.ok(result.sources.length >= 3);
});

test('contact answer contains new phone number', async () => {
  const result = await answerQuestion({ message: 'What is your phone number?', history: [] });
  assert.match(result.answer, /\+91 77700 12885/);
  assert.equal(result.mode, 'verified-company-facts');
});

test('broad materials question returns verified materials', async () => {
  const result = await answerQuestion({ message: 'What materials do you use?', history: [] });
  assert.match(result.answer, /silicone/i);
  assert.match(result.answer, /EPDM/i);
  assert.equal(result.mode, 'verified-company-facts');
});

test('local RAG answers a non-canonical question without Gemini key', async () => {
  const old = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const result = await answerQuestion({ message: 'Tell me about your engineering support and product development.', history: [] });
  if (old) process.env.GEMINI_API_KEY = old;
  assert.ok(result.answer.length > 20);
  assert.ok(result.sources.length > 0);
  assert.match(result.mode, /local-rag/);
});
