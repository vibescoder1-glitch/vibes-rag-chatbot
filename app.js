const messagesEl = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('input');
const send = document.getElementById('send');
const statusEl = document.getElementById('status');
const history = [];
const QUOTATION_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScBCCZwBkBBIWoraE6SXUadsfaXo4wrm9JfFEfL98iZdZaC5Q/viewform?usp=publish-editor';

function addMessage(role, text, sources = []) {
  const wrap = document.createElement('div');
  wrap.className = `message ${role}`;
  const body = document.createElement('div');
  body.textContent = text;
  wrap.appendChild(body);

  if (role === 'assistant' && sources.length) {
    const sourceWrap = document.createElement('div');
    sourceWrap.className = 'sources';
    const label = document.createElement('strong');
    label.style.fontSize = '11px';
    label.textContent = 'Sources';
    sourceWrap.appendChild(label);
    for (const source of sources) {
      const a = document.createElement('a');
      a.className = 'source';
      a.href = source.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = `↗ ${source.title}`;
      sourceWrap.appendChild(a);
    }
    wrap.appendChild(sourceWrap);
  }
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addWelcome() {
  addMessage('assistant', 'Welcome to Vibes Components. I can help with our sealing solutions, EV battery components, wire and connector seals, elastomeric engineering capabilities, materials, and company information.');
  const row = document.createElement('div');
  row.className = 'contact-row';

  row.innerHTML = `
    <a
      id="emailSalesButton"
      class="contact-button"
      href="mailto:info@vibescomponents.com?subject=Product%20Enquiry%20from%20Vibes%20Website"
    >
      Email sales
    </a>
  
    <a
      id="callSalesButton"
      class="contact-button"
      href="tel:+917770012885"
    >
      Call +91 77700 12885
    </a>
  `;

  const emailButton = row.querySelector('#emailSalesButton');
  const callButton = row.querySelector('#callSalesButton');

  emailButton.addEventListener('click', event => {
    event.preventDefault();

    const emailUrl =
      'mailto:info@vibescomponents.com?subject=Product%20Enquiry%20from%20Vibes%20Website';

    try {
      window.top.location.href = emailUrl;
    } catch {
      window.location.href = emailUrl;
    }
  });

  callButton.addEventListener('click', event => {
    event.preventDefault();

    const phoneUrl = 'tel:+917770012885';

    try {
      window.top.location.href = phoneUrl;
    } catch {
      window.location.href = phoneUrl;
    }
  });

  messagesEl.lastElementChild.appendChild(row);
}
function showQuotationPrompt() {
  const userText = 'I want to request a quotation.';

  addMessage('user', userText);

  history.push({
    role: 'user',
    content: userText
  });

  const wrap = document.createElement('div');
  wrap.className = 'message assistant';

  const body = document.createElement('div');
  body.textContent =
    `To request a quotation, please provide:

• Your name and company name
• Email and phone number
• Product or component requirement
• Drawing or specification
• Required material
• Operating conditions
• Estimated quantity
• Required delivery date`;

  const actions = document.createElement('div');
  actions.className = 'quotation-actions';

  const formLink = document.createElement('a');
  formLink.className = 'quotation-form-button';
  formLink.href = QUOTATION_FORM_URL;
  formLink.target = '_blank';
  formLink.rel = 'noopener noreferrer';
  formLink.textContent = 'Open Quotation Form';

  const contact = document.createElement('div');
  contact.className = 'quotation-contact';
  contact.textContent =
    'Email: info@vibescomponents.com | Phone: +91 77700 12885';

  actions.appendChild(formLink);
  actions.appendChild(contact);

  wrap.appendChild(body);
  wrap.appendChild(actions);

  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  history.push({
    role: 'assistant',
    content: 'Please complete the quotation request form.'
  });

  statusEl.textContent = 'Quotation form ready';
}

async function ask(message) {
  message = message.trim();
  if (!message) return;
  addMessage('user', message);
  history.push({ role: 'user', content: message });
  input.value = '';
  send.disabled = true;
  statusEl.textContent = 'Searching Vibes knowledge…';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: history.slice(-8) })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    addMessage('assistant', data.answer, data.sources || []);
    history.push({ role: 'assistant', content: data.answer });
    statusEl.textContent = 'Verified from Vibes Components sources';
  } catch (error) {
    addMessage('assistant', 'I could not answer right now. Please contact info@vibescomponents.com or call +91 77700 12885 for assistance.');
    statusEl.textContent = error.message;
  } finally {
    send.disabled = false;
    input.focus();
  }
}

form.addEventListener('submit', event => { event.preventDefault(); ask(input.value); });
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
});
document
  .getElementById('quickPrompts')
  .addEventListener('click', event => {
    const button = event.target.closest('button');

    if (!button) return;

    if (button.dataset.action === 'quotation') {
      showQuotationPrompt();
      return;
    }

    const question = button.dataset.q;

    if (question) {
      ask(question);
    }
  });
addWelcome();
