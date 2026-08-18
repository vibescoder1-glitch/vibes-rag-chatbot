(() => {
  if (window.__VIBES_RAG_WIDGET__) return;
  window.__VIBES_RAG_WIDGET__ = true;

  const script = document.currentScript;
  const base = new URL(script.src).origin;

  const config = window.VibesChatbotConfig || {};

  const position =
    config.position === 'bottom-left'
      ? 'left'
      : 'right';

  const title =
    config.title || 'Vibes Assistant';

  const host = document.createElement('div');
  host.id = 'vibes-rag-widget-host';
  host.style.position = 'fixed';

  /*
   * Keeps the chatbot above the company website's
   * WhatsApp and Go-to-top buttons.
   */
  host.style.bottom = '125px';
  host.style[position] = '18px';
  host.style.zIndex = '2147483000';

  document.body.appendChild(host);

  const shadow = host.attachShadow({
    mode: 'open'
  });

  const style = document.createElement('style');

  style.textContent = `
    * {
      box-sizing: border-box;
      font-family:
        Inter,
        ui-sans-serif,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }

    :host {
      display: block;
    }

    .button {
      width: 58px;
      height: 58px;
      margin-left: auto;
      border: 0;
      border-radius: 50%;
      background: #0b66c3;
      color: #ffffff;
      box-shadow:
        0 10px 28px rgba(11, 56, 99, 0.28);
      cursor: pointer;
      font-size: 25px;
      display: grid;
      place-items: center;
      transition:
        background 0.2s ease,
        transform 0.2s ease;
    }

    .button:hover {
      background: #084f98;
      transform: translateY(-2px);
    }

    .button:focus-visible {
      outline: 3px solid rgba(11, 102, 195, 0.3);
      outline-offset: 3px;
    }

    /*
     * Shorter desktop panel.
     * It opens above the floating chatbot button.
     */
.panel {
  display: none;
  width: min(400px, calc(100vw - 30px));
  height: min(560px, calc(100vh - 220px));
  max-height: 560px;
  margin-bottom: 12px;
  overflow: hidden;
  border: 1px solid #dfe6ef;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 20px 60px rgba(8, 32, 60, 0.26);
}

    .panel.open {
      display: block;
    }

    .panel iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      background: #ffffff;
    }

    .label {
      position: absolute;
      right: 68px;
      bottom: 11px;
      padding: 9px 12px;
      border-radius: 10px;
      background: #132238;
      color: #ffffff;
      box-shadow:
        0 8px 22px rgba(0, 0, 0, 0.18);
      font-size: 12px;
      white-space: nowrap;
    }

    /*
     * Tablet and mobile layout.
     */
    @media (max-width: 520px) {
      :host {
        right: 10px !important;
        bottom: 120px !important;
        left: auto !important;
      }

.panel {
  position: fixed;
  right: 10px;
  bottom: 190px;
  left: 10px;
  width: auto;
  height: min(500px, calc(100vh - 230px));
  max-height: 500px;
  margin: 0;
  border-radius: 18px;
}

      .button {
        width: 56px;
        height: 56px;
        margin-left: auto;
      }

      .label {
        display: none;
      }
    }

    /*
     * Very short screens, such as landscape phones.
     */
@media (max-height: 650px) {
  .panel {
    height: calc(100vh - 210px);
    max-height: 440px;
  }
}
  `;

  const panel = document.createElement('div');
  panel.className = 'panel';

  const iframe = document.createElement('iframe');
  iframe.src = `${base}/widget.html`;
  iframe.title = title;
  iframe.loading = 'lazy';
  iframe.setAttribute(
    'allow',
    'clipboard-write'
  );

  panel.appendChild(iframe);

  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = `Ask ${title}`;

  const button = document.createElement('button');
  button.className = 'button';
  button.type = 'button';
  button.setAttribute(
    'aria-label',
    `Open ${title}`
  );
  button.setAttribute(
    'aria-expanded',
    'false'
  );
  button.textContent = '💬';

  let open = false;

  button.addEventListener('click', () => {
    open = !open;

    panel.classList.toggle(
      'open',
      open
    );

    label.style.display =
      open ? 'none' : '';

    button.textContent =
      open ? '×' : '💬';

    button.setAttribute(
      'aria-label',
      `${open ? 'Close' : 'Open'} ${title}`
    );

    button.setAttribute(
      'aria-expanded',
      String(open)
    );
  });

  shadow.append(
    style,
    panel,
    label,
    button
  );

  /*
   * Hide the helper label automatically.
   */
  setTimeout(() => {
    if (!open) {
      label.style.display = 'none';
    }
  }, 6000);
})();