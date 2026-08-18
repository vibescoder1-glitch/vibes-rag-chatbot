# Vibes Components RAG Chatbot v3

A standalone, embeddable RAG chatbot for Vibes Components.

## v3 highlights

- Gemini API instead of OpenAI
- Default generation model: `gemini-3.6-flash`
- Default embedding model: `gemini-embedding-2`
- No external npm dependencies required; Node.js `fetch` calls Gemini directly
- Hybrid semantic + keyword retrieval
- Second-stage reranking
- Conversation-aware retrieval for follow-up questions
- Verified facts layer for products, materials, manufacturing, EV products, sealing products, quotation and contact
- Local RAG fallback if Gemini generation fails
- Contact: `info@vibescomponents.com` and `+91 77700 12885`
- Source links in answers
- Embeddable `widget.js`
- Rate limiting and framing restrictions

## Quick start

```bash
cp .env.example .env
```

Add your Gemini API key to `.env`, then:

```bash
npm run ingest
npm start
```

Open `http://localhost:3000`.

For detailed setup, see `SETUP_GEMINI.md`.

## Local mode without Gemini

The included index supports immediate local testing:

```bash
npm start
```

To rebuild a local seed index:

```bash
EMBEDDING_PROVIDER=local npm run ingest:seed
```

## Production integration

Deploy this project separately, for example at `https://chatbot.vibescomponents.com`, then insert the loader script documented in `INTEGRATION.md` or `SETUP_GEMINI.md` into the existing company site.
