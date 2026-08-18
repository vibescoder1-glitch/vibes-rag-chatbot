# Goal Result

## Goal

Deliver a working Vibes Components RAG chatbot that:

1. Retrieves from approved company knowledge.
2. Produces grounded answers without inventing unsupported facts.
3. Returns source pages used for retrieval.
4. Runs as a separate Node.js service.
5. Embeds into the existing company website through a floating widget.
6. Can be tested without an AI API key.
7. Supports production generative RAG with Gemini when a server-side API key is configured.

## Acceptance result

PASS - local knowledge ingestion creates a vector index.

PASS - retrieval identifies EV product knowledge for EV questions.

PASS - `/api/chat` returns a grounded answer and source URLs.

PASS - `/api/health` reports service status.

PASS - widget UI is served at `/widget.html`.

PASS - embeddable loader is served at `/widget.js`.

PASS - automated tests pass.

NOT EXECUTED - live Gemini generation, because no user API key was supplied. The implementation is included and activates automatically after `GEMINI_API_KEY` is added and the Gemini index is built with `npm run ingest`.
