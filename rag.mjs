import fs from 'node:fs/promises';
import path from 'node:path';
import { loadIndex } from './index-store.mjs';
import { localEmbed, cosineSimilarity } from './vectors.mjs';
import { createEmbeddings, generateGroundedAnswer } from './gemini.mjs';
import { floatEnv, intEnv } from './env.mjs';
import { selectRelevantSentences, tokenize } from './text.mjs';

let factsCache;

async function loadCompanyFacts() {
  if (!factsCache) {
    factsCache = JSON.parse(await fs.readFile(path.resolve('data/company-facts.json'), 'utf8'));
  }
  return factsCache;
}

function normalizedIntentText(message) {
  return String(message || '')
    .toLowerCase()
    .replace(/[^a-z0-9+\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectIntent(message) {
  const text = normalizedIntentText(message);

  if (/\b(contact|email|phone|telephone|call|address|location|linkedin|follow|social|social media|connect)\b/.test(text)) return 'linkedin';
  if (/\b(quotation|quote|rfq|request a quote|request quotation|pricing enquiry|price enquiry|price|cost)\b/.test(text)) return 'quotation';
  if (/\b(material|materials|silicone|epdm|nbr|tpe|tpu|polyurethane|rubber compound|elastomer)\b/.test(text)) return 'materials';
  if (/\b(manufacturing process|manufacturing processes|compression moulding|compression molding|transfer moulding|transfer molding|injection moulding|injection molding|extrusion)\b/.test(text)) return 'manufacturing';
  if (/\b(ev|electric vehicle|battery|charger|battery pack|busbar|power electronics|charging port)\b/.test(text)) return 'ev';
  if (/\b(wire seal|wire seals|connector seal|connector seals|mat seal|mat seals|dummy seal|gum seal|peripheral seal)\b/.test(text)) return 'sealing';
  if (/\b(product|products|component|components|parts|product range|what do you make|what do you manufacture|what does vibes manufacture)\b/.test(text)) return 'products';
  if (/\b(engineering|innovation|custom component|customized|customised|design|prototype|development|r&d)\b/.test(text)) return 'engineering';
  if (/\b(company|about vibes|about company|who are you|who is vibes|facility|plant|infrastructure)\b/.test(text)) return 'company';
  return 'general';
}

function isBroadProductQuestion(message) {
  const text = normalizedIntentText(message);
  const hasProductWord = /\b(product|products|component|components|parts|range)\b/.test(text);
  const hasMakerWord = /\b(manufacture|manufactures|manufacturing|make|makes|made|offer|offers|sell|sells|provide|provides)\b/.test(text);
  return (hasProductWord && hasMakerWord) || /\bwhat\s+(do|does)\s+(you|vibes).*\b(make|manufacture|offer|sell)\b/.test(text);
}

function isBroadMaterialsQuestion(message) {
  const text = normalizedIntentText(message);
  return /\b(what|which)\s+materials?\b/.test(text) || /\bmaterials?\s+(do|does)\s+(you|vibes)\s+(use|work with)\b/.test(text);
}

function isBroadManufacturingQuestion(message) {
  const text = normalizedIntentText(message);
  return /\b(what|which).*\b(manufacturing|moulding|molding|process|processes)\b/.test(text) || /\bhow\s+do\s+you\s+manufacture\b/.test(text);
}

function isBroadEvQuestion(message) {
  const text = normalizedIntentText(message);

  const hasEvTerm =
    /\b(ev|electric vehicle|battery|battery pack|charger|busbar)\b/.test(text);

  const hasProductTerm =
    /\b(product|products|component|components|solution|solutions|manufacture|make|offer|provide)\b/.test(text);

  return hasEvTerm && hasProductTerm;
}

function isBroadSealingQuestion(message) {
  const text = normalizedIntentText(message);
  return /\bwhat.*\b(wire|connector|seal|seals|sealing).*\b(product|products|component|components|make|manufacture|offer)\b/.test(text);
}

async function canonicalAnswer(message) {
  const facts = await loadCompanyFacts();
  const intent = detectIntent(message);

  if (isBroadProductQuestion(message))
    return {
      ...facts.productOverview,
      mode: 'verified-company-facts'
    };

  if (intent === 'linkedin')
    return {
      ...facts.linkedin,
      mode: 'verified-company-facts'
    };

  if (intent === 'contact')
    return {
      ...facts.contact,
      mode: 'verified-company-facts'
    };

  if (intent === 'quotation')
    return { ...facts.quotation, mode: 'verified-company-facts' };

  if (isBroadMaterialsQuestion(message))
    return { ...facts.materials, mode: 'verified-company-facts' };

  if (isBroadManufacturingQuestion(message))
    return { ...facts.manufacturingProcesses, mode: 'verified-company-facts' };

  if (isBroadEvQuestion(message))
    return { ...facts.evComponents, mode: 'verified-company-facts' };

  if (isBroadSealingQuestion(message))
    return { ...facts.sealingProducts, mode: 'verified-company-facts' };

  return null;
}

function buildRetrievalQuery(message, history = []) {
  const previousUserMessages = history
    .filter(item => item?.role === 'user')
    .slice(-2)
    .map(item => String(item.content || '').trim())
    .filter(Boolean);

  return [...previousUserMessages, String(message || '').trim()].join(' ');
}

function expandQuery(message) {
  const intent = detectIntent(message);
  const expansions = {
    products: 'product range EV battery charger components wire seals connector seals mat seals dummy seals gum seals peripheral seals grommets boots bellows tubes dampers bonded components sealants O-rings washers handlebar grips USB charger caps',
    materials: 'silicone EPDM NBR TPU TPE polyurethane elastomers rubber compounds custom compound materials',
    manufacturing: 'compression moulding transfer moulding injection moulding extrusion manufacturing processes production',
    ev: 'EV electric vehicle battery charger battery pack seals gaskets flame retardant silicone dampers cushioning pads busbars thermal pads power electronics charging ports',
    sealing: 'wire seals connector seals mat seals dummy seals gum seals peripheral seals silicone NBR wire gauges',
    quotation: 'RFQ quotation enquiry drawing specification quantity operating requirements contact sales',
    contact: 'company email phone mobile call address location sales contact info@vibescomponents.com +91 77700 12885',
    engineering: 'engineering innovation R&D custom elastomer compound product design prototype validation development',
    company: 'Vibes Components company facility plants infrastructure Pune manufacturing engineering',
    general: ''
  };
  return `${message} ${expansions[intent] || ''}`.trim();
}

function overlapScore(query, text) {
  const q = new Set(tokenize(query));
  if (!q.size) return 0;
  const t = new Set(tokenize(text));
  let overlap = 0;
  for (const word of q) if (t.has(word)) overlap++;
  return overlap / q.size;
}

function phraseBoost(query, text) {
  const normalizedQuery = normalizedIntentText(query);
  const normalizedText = normalizedIntentText(text);
  const phrases = normalizedQuery.split(/\s+/).filter(Boolean);
  if (normalizedQuery.length >= 12 && normalizedText.includes(normalizedQuery)) return 0.12;
  let boost = 0;
  for (let i = 0; i < phrases.length - 1; i++) {
    const pair = `${phrases[i]} ${phrases[i + 1]}`;
    if (pair.length > 5 && normalizedText.includes(pair)) boost += 0.012;
  }
  return Math.min(boost, 0.08);
}

function rerankResults(query, results) {
  const queryWords = new Set(tokenize(query));
  const intent = detectIntent(query);

  return results
    .map(result => {
      const title = String(result.title || '').toLowerCase();
      const text = `${result.title || ''} ${result.text || ''}`.toLowerCase();
      let keywordHits = 0;
      for (const word of queryWords) if (text.includes(word)) keywordHits++;

      const titleBoost = [...queryWords].some(word => title.includes(word)) ? 0.08 : 0;
      const intentBoost =
        (intent === 'ev' && /ev|battery|charger/i.test(result.title)) ||
          (intent === 'sealing' && /wire|connector|seal/i.test(result.title)) ||
          (intent === 'materials' && /engineering|innovation|component/i.test(result.title)) ||
          (intent === 'manufacturing' && /engineering|component|about/i.test(result.title))
          ? 0.06
          : 0;

      return {
        ...result,
        rerankScore: result.score + keywordHits * 0.012 + titleBoost + intentBoost + phraseBoost(query, text)
      };
    })
    .sort((a, b) => b.rerankScore - a.rerankScore);
}

async function embedQuery(message, index) {
  if (index.provider === 'gemini') {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        'This index uses Gemini embeddings. Configure GEMINI_API_KEY.'
      );
    }

    return (
      await createEmbeddings(
        [message],
        'RETRIEVAL_QUERY'
      )
    )[0];
  }
  return localEmbed(message, index.dimension);
}

export async function retrieve(message, history = []) {
  const index = await loadIndex();
  const contextualQuery = buildRetrievalQuery(message, history);
  const expanded = expandQuery(contextualQuery);
  const queryVector = await embedQuery(expanded, index);
  const topK = intEnv('TOP_K', 8);
  const candidateLimit = Math.max(topK, intEnv('RERANK_CANDIDATES', 20));
  const minScore = floatEnv('MIN_RETRIEVAL_SCORE', 0.05);

  const ranked = index.chunks
    .map(chunk => {
      const vectorScore = cosineSimilarity(queryVector, chunk.vector);
      const lexical = overlapScore(expanded, `${chunk.title} ${chunk.text}`);
      const score = vectorScore * 0.72 + lexical * 0.28;
      return { ...chunk, vectorScore, lexicalScore: lexical, score };
    })
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, candidateLimit);

  const reranked = rerankResults(expanded, ranked);
  return { index, results: reranked.slice(0, topK), retrievalQuery: expanded };
}

function buildContext(results) {
  return results
    .slice(0, 5)
    .map((r, i) => `[Source ${i + 1}: ${r.title}]\nURL: ${r.url}\n${r.text}`)
    .join('\n\n');
}

function localGroundedAnswer(message, results) {
  if (!results.length) {
    return 'I do not have enough verified information for that exact question yet. You can ask me about Vibes Components products, EV components, wire and connector seals, materials, manufacturing processes, engineering capabilities or quotations. For direct confirmation, email info@vibescomponents.com or call +91 77700 12885.';
  }

  const candidates = [];
  for (const result of results.slice(0, 4)) {
    const sentences = selectRelevantSentences(message, result.text, 4);
    for (const sentence of sentences) {
      if (sentence && !candidates.includes(sentence)) candidates.push(sentence);
    }
  }

  if (candidates.length) return candidates.slice(0, 6).join(' ');

  const excerpts = results.slice(0, 2).map(result => result.text.slice(0, 420).trim()).filter(Boolean);
  return excerpts.join(' ');
}

function confidenceLevel(results) {
  if (!results.length) return 'low';
  const top = results[0].score;
  if (top >= 0.58) return 'high';
  if (top >= 0.28) return 'medium';
  return 'low';
}

export async function answerQuestion({ message, history = [] }) {
  const verified = await canonicalAnswer(message);
  if (verified) return { ...verified, confidence: 'high' };

  const { results } = await retrieve(message, history);
  let answer;
  let mode = 'local-rag';

  if (process.env.GEMINI_API_KEY && results.length) {
    try {
      answer = await generateGroundedAnswer({ message, history, context: buildContext(results) });
      mode = 'gemini-rag';
    } catch (error) {
      console.error('Gemini generation failed, using local grounded answer:', error.message);
      answer = localGroundedAnswer(message, results);
      mode = 'local-rag-fallback';
    }
  } else {
    answer = localGroundedAnswer(message, results);
  }

  const uniqueSources = [];
  for (const result of results) {
    if (!uniqueSources.some(source => source.url === result.url)) {
      uniqueSources.push({
        title: result.title,
        url: result.url,
        score: Number((result.rerankScore ?? result.score).toFixed(3))
      });
    }
  }

  return {
    answer,
    sources: uniqueSources.slice(0, 4),
    mode,
    confidence: confidenceLevel(results)
  };
}
