# Vibes Components RAG Chatbot v3 - Gemini Setup

## 1. Create `.env`

In the project root:

```bash
cp .env.example .env
```

Open `.env` and add your Google AI Studio key:

```env
GEMINI_API_KEY=YOUR_PRIVATE_GEMINI_KEY
EMBEDDING_PROVIDER=gemini
GEMINI_CHAT_MODEL=gemini-3.6-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
```

Never put the key in `.env.example`, `public/app.js`, `public/widget.js`, GitHub, or screenshots.

## 2. Build the Gemini vector index

```bash
npm run ingest
```

Expected final line:

```text
RAG index ready: ... provider=gemini, model=gemini-embedding-2
```

If you want to test without any AI key, use:

```bash
EMBEDDING_PROVIDER=local npm run ingest:seed
```

## 3. Start

```bash
npm start
```

Open:

- http://localhost:3000
- http://localhost:3000/widget.html
- http://localhost:3000/api/health

## 4. Recommended tests

- What products do you manufacture?
- What materials do you work with?
- What manufacturing processes do you use?
- What EV battery components do you manufacture?
- Can you make a custom seal for my battery enclosure?
- How can I contact sales?
- What is your phone number?

## 5. Website integration

After deployment, load the widget from the chatbot host:

```html
<script>
  window.VibesChatbotConfig = {
    title: "Vibes Assistant",
    position: "bottom-right"
  };
</script>
<script src="https://chatbot.vibescomponents.com/widget.js" defer></script>
```
