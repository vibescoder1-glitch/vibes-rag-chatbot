# Final Changes in v3

- Replaced OpenAI API layer with Gemini API.
- Uses `gemini-3.6-flash` for grounded answer generation.
- Uses `gemini-embedding-2` for semantic embeddings.
- Added/retained `src/index-store.mjs` so ingestion can save/load the vector index.
- Added hybrid vector + keyword retrieval for both local and Gemini indexes.
- Added second-stage reranking before selecting TOP_K chunks.
- Added conversation-aware retrieval using the latest user messages.
- Added query expansion for products, materials, manufacturing, EV, sealing, quotation, contact, engineering and company questions.
- Added verified company facts for high-value questions.
- Added `+91 77700 12885` as the primary chatbot contact number.
- Improved local RAG fallback to combine information from multiple retrieved chunks.
- Replaced customer-facing `Grounded local RAG answer` text with `Verified from Vibes Components sources`.
- Added source links, confidence metadata, rate limiting and secure iframe restrictions.
- No npm dependency install is required. Node.js 20+ is sufficient.
