const STOPWORDS = new Set([
  'a','an','and','are','as','at','be','been','by','for','from','has','have','how','i','in','is','it','its','of','on','or','our','that','the','their','this','to','was','we','what','when','where','which','with','you','your','can','do','does','about','tell','me'
]);

export function normalizeWhitespace(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

export function tokenize(text) {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[^a-z0-9+.-]+/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOPWORDS.has(token));
}

export function chunkText(text, { maxChars = 1450, overlapChars = 220 } = {}) {
  const clean = normalizeWhitespace(text);
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if (!sentence) continue;
    if ((current + ' ' + sentence).trim().length <= maxChars) {
      current = (current + ' ' + sentence).trim();
      continue;
    }
    if (current) chunks.push(current);
    const overlap = current.slice(Math.max(0, current.length - overlapChars));
    current = normalizeWhitespace(overlap + ' ' + sentence);
    while (current.length > maxChars) {
      chunks.push(current.slice(0, maxChars));
      current = current.slice(Math.max(1, maxChars - overlapChars));
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function decodeHtmlEntities(text) {
  const map = {
    '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'",
    '&lt;': '<', '&gt;': '>', '&ndash;': '–', '&mdash;': '—', '&trade;': '™', '&reg;': '®'
  };
  return text.replace(/&(?:nbsp|amp|quot|#39|apos|lt|gt|ndash|mdash|trade|reg);/g, m => map[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

export function htmlToText(html) {
  return normalizeWhitespace(
    decodeHtmlEntities(
      String(html)
        .replace(/<!--([\s\S]*?)-->/g, ' ')
        .replace(/<(script|style|svg|noscript|nav|footer|header|form)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<br\s*\/?>/gi, '. ')
        .replace(/<\/(p|h1|h2|h3|h4|li|tr|div|section|article)>/gi, '. ')
        .replace(/<[^>]+>/g, ' ')
    )
  );
}

export function selectRelevantSentences(query, text, limit = 4) {
  const q = new Set(tokenize(query));
  const sentences = normalizeWhitespace(text).split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences
    .map((sentence, index) => {
      const tokens = tokenize(sentence);
      let score = 0;
      for (const token of tokens) if (q.has(token)) score += 1;
      return { sentence, score, index };
    })
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(x => x.sentence);
}
