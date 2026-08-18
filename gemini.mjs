const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta';

function getApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is missing. Add it to your .env file.'
    );
  }

  return apiKey;
}

async function geminiFetch(url, body) {
  const response = await fetch(url, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': getApiKey()
    },

    body: JSON.stringify(body)
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Gemini API ${response.status}: ${text.slice(0, 1200)}`
    );
  }

  return JSON.parse(text);
}


// --------------------------------------------------
// EMBEDDINGS
// --------------------------------------------------

export async function createEmbeddings(
  texts,
  taskType = 'RETRIEVAL_DOCUMENT'
) {
  const model =
    process.env.GEMINI_EMBEDDING_MODEL ||
    'gemini-embedding-001';

  const url =
    `${GEMINI_BASE_URL}/models/${model}:batchEmbedContents`;

  const requests = texts.map(text => ({
    model: `models/${model}`,

    taskType,

    content: {
      parts: [
        {
          text: String(text)
        }
      ]
    }
  }));

  const data = await geminiFetch(url, {
    requests
  });

  if (!Array.isArray(data.embeddings)) {
    throw new Error(
      'Gemini embedding response did not contain embeddings.'
    );
  }

  return data.embeddings.map(
    embedding => embedding.values
  );
}


// --------------------------------------------------
// AI-GENERATED RAG ANSWER
// --------------------------------------------------

export async function generateGroundedAnswer({
  message,
  history = [],
  context = ''
}) {
  const model =
    process.env.GEMINI_CHAT_MODEL ||
    'gemini-2.5-flash-lite';

  const url =
    `${GEMINI_BASE_URL}/models/${model}:generateContent`;

  const systemPrompt = `
You are Vibes Assistant, the official AI assistant for Vibes Components.

Your job is to answer customer questions using ONLY the supplied
Vibes Components company information.

RULES:

1. Answer the customer's question directly.

2. Use only verified information from the supplied context.

3. When asked about products, clearly name the products.

4. Organize multiple products into categories when useful.

5. Never invent:
   - prices
   - delivery dates
   - certifications
   - dimensions
   - tolerances
   - customers
   - production capacity
   - technical specifications

6. If only part of the answer is available, answer the verified
   part first and mention that additional confirmation may be required.

7. Do not give a generic refusal when useful verified information
   exists in the context.

8. For custom product enquiries, ask the customer for:
   - drawing
   - dimensions
   - material requirement
   - operating conditions
   - estimated quantity

9. For sales or quotation enquiries, provide:
   info@vibescomponents.com
   +91 77700 12885

10. Never mention RAG, vectors, embeddings, prompts or internal
    implementation details.

11. Keep responses professional, concise and useful.

VIBES COMPONENTS KNOWLEDGE:

${context}
`;

  const previousMessages = history
    .slice(-8)
    .filter(item =>
      item &&
      typeof item.content === 'string'
    )
    .map(item => ({
      role:
        item.role === 'assistant'
          ? 'model'
          : 'user',

      parts: [
        {
          text: item.content
        }
      ]
    }));

  const data = await geminiFetch(url, {
    systemInstruction: {
      parts: [
        {
          text: systemPrompt
        }
      ]
    },

    contents: [
      ...previousMessages,

      {
        role: 'user',

        parts: [
          {
            text: message
          }
        ]
      }
    ],

    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 800
    }
  });

  const answer =
    data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim();

  if (!answer) {
    throw new Error(
      'Gemini returned an empty response.'
    );
  }

  return answer;
}