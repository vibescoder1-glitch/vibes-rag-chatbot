import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv, intEnv } from './src/env.mjs';
import { answerQuestion } from './src/rag.mjs';

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const port = Number(process.env.PORT || 3000);
const maxChars = intEnv('MAX_MESSAGE_CHARS', 2000);
const maxHistory = intEnv('MAX_HISTORY_MESSAGES', 8);
const allowedFrameAncestors = (process.env.ALLOWED_FRAME_ANCESTORS || 'https://vibescomponents.com https://www.vibescomponents.com http://localhost:3000').split(/\s+/).filter(Boolean);

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.ico', 'image/x-icon']
]);

const buckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 60_000;
  const limit = 30;
  const item = buckets.get(ip) || { start: now, count: 0 };
  if (now - item.start > windowMs) { item.start = now; item.count = 0; }
  item.count++;
  buckets.set(ip, item);
  return item.count > limit;
}
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [ip, item] of buckets) if (item.start < cutoff) buckets.delete(ip);
}, 120_000).unref();

function securityHeaders(res, pathname) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', pathname === '/widget.js' ? 'cross-origin' : 'same-origin');
  res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self' ${allowedFrameAncestors.join(' ')}`);
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 50_000) throw new Error('Request too large');
  }
  return raw ? JSON.parse(raw) : {};
}

async function serveStatic(req, res, pathname) {
  let relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  relative = decodeURIComponent(relative);
  const filePath = path.normalize(path.join(publicDir, relative));
  if (!filePath.startsWith(publicDir)) return false;
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return false;
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', mime.get(ext) || 'application/octet-stream');
    if (pathname === '/widget.js') res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'HEAD') return res.end();
    res.end(await fs.readFile(filePath));
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  securityHeaders(res, pathname);

  if (req.method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      service: 'Vibes Components RAG Chatbot',
      generation: process.env.GEMINI_API_KEY ? 'Gemini-powered grounded RAG' : 'local grounded RAG',
      embeddingProvider: process.env.EMBEDDING_PROVIDER || 'auto',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method === 'POST' && pathname === '/api/chat') {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (rateLimited(ip)) return sendJson(res, 429, { error: 'Too many requests. Please try again shortly.' });

    try {
      const body = await readJson(req);
      const message = String(body.message || '').trim();
      if (!message) return sendJson(res, 400, { error: 'Message is required.' });
      if (message.length > maxChars) return sendJson(res, 400, { error: `Message must be under ${maxChars} characters.` });
      const history = Array.isArray(body.history) ? body.history.slice(-maxHistory) : [];
      const result = await answerQuestion({ message, history });
      return sendJson(res, 200, result);
    } catch (error) {
      console.error(error);
      return sendJson(res, 500, {
        error: 'The Vibes Assistant could not answer right now. Please contact info@vibescomponents.com or call +91 77700 12885.',
        detail: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    if (await serveStatic(req, res, pathname)) return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Vibes RAG Chatbot running on port ${port}`);

  console.log(
    process.env.GEMINI_API_KEY
      ? 'Gemini-powered RAG enabled.'
      : 'GEMINI_API_KEY not set; local grounded RAG mode enabled.'
  );
});
