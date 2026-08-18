# Website Integration

## Recommended architecture

Keep the chatbot as a separate Node.js application and embed only the widget loader on the existing company website.

```text
vibescomponents.com
      |
      | widget.js
      v
chatbot.vibescomponents.com
      |
      +-- /widget.html
      +-- /api/chat
      +-- RAG index
      +-- Gemini API (server-side only)
```

## Generic HTML integration

```html
<script>
  window.VibesChatbotConfig = {
    title: "Vibes Assistant",
    position: "bottom-right"
  };
</script>
<script src="https://chatbot.vibescomponents.com/widget.js" defer></script>
```

## WordPress integration

If the main company website is WordPress, use the included sample plugin in:

`integrations/wordpress/vibes-rag-widget.php`

Change the chatbot URL in that file, zip the plugin folder, upload it in WordPress Plugins, and activate it.

## Security

The iframe is restricted using Content-Security-Policy `frame-ancestors`. The default configuration allows the Vibes Components root domain, `www` domain and localhost. Add a staging domain in `.env` if needed.
