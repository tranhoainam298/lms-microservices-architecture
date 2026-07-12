import express from 'express';
import 'dotenv/config';

const app = express();
const port = Number(process.env.PORT) || 5005;
const provider = (process.env.AI_PROVIDER || 'openai').trim().toLowerCase();
const model = (process.env.AI_MODEL || 'gpt-4o-mini').trim();
const baseUrl = (process.env.AI_BASE_URL || 'https://api.openai.com').replace(/\/+$/, '');
const timeoutMs = Math.min(60000, Math.max(1000, Number(process.env.AI_REQUEST_TIMEOUT_MS) || 15000));
const temperature = Math.min(2, Math.max(0, Number(process.env.AI_TEMPERATURE) || 0.3));
const maxOutputTokens = Math.min(4000, Math.max(1, Number(process.env.AI_MAX_OUTPUT_TOKENS) || 600));

app.use(express.json({ limit: '64kb' }));

function providerConfigured() {
  const apiKey = process.env.AI_API_KEY?.trim();
  return provider === 'openai' && Boolean(apiKey) && !apiKey.startsWith('your_');
}

function buildUserInput(question, context) {
  return [
    `Course title: ${context.courseTitle || 'Not provided'}`,
    `Course description: ${context.courseDescription || 'Not provided'}`,
    `Lesson title: ${context.lessonTitle || 'Not provided'}`,
    `Lesson content: ${context.lessonContent || 'Not provided'}`,
    `Lesson resources: ${JSON.stringify(Array.isArray(context.lessonResources) ? context.lessonResources : [])}`,
    `Course progress: ${Number.isFinite(Number(context.progressPercent)) ? Number(context.progressPercent) : 0}%`,
    '',
    `Student question: ${question}`
  ].join('\n');
}

export async function callRealAiProvider({ question, context }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxOutputTokens,
        messages: [
          {
            role: 'system',
            content: 'You are an LMS learning assistant. Answer only using the provided course and lesson context. If the context is insufficient, say what information is missing. Keep answers clear and helpful for students.'
          },
          { role: 'user', content: buildUserInput(question, context) }
        ]
      })
    });

    if (!response.ok) {
      console.error(`AI provider request failed with HTTP ${response.status}.`);
      const error = new Error('AI provider request failed.');
      error.code = 'AI_PROVIDER_UNAVAILABLE';
      throw error;
    }

    const body = await response.json().catch(() => null);
    const answer = body?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) {
      const error = new Error('AI provider returned an invalid response.');
      error.code = 'AI_PROVIDER_RESPONSE_INVALID';
      throw error;
    }

    return {
      answer: answer.trim(),
      model,
      provider,
      usage: {
        inputTokens: body?.usage?.prompt_tokens ?? null,
        outputTokens: body?.usage?.completion_tokens ?? null
      }
    };
  } catch (error) {
    if (error.code) throw error;
    const providerError = new Error('AI provider request failed.');
    providerError.code = 'AI_PROVIDER_UNAVAILABLE';
    throw providerError;
  } finally {
    clearTimeout(timer);
  }
}

app.get('/', (req, res) => res.json({ status: providerConfigured() ? 'healthy' : 'degraded' }));
app.get('/health', (req, res) => res.json({
  status: providerConfigured() ? 'healthy' : 'degraded',
  configured: providerConfigured(),
  provider,
  model
}));

app.post('/chat', async (req, res) => {
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  const context = req.body?.context;
  if (!question || question.length > 1000 || !context || typeof context !== 'object' || Array.isArray(context)) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'A valid question and lesson context are required.' });
  }
  if (!providerConfigured()) {
    return res.status(503).json({ code: 'AI_PROVIDER_NOT_CONFIGURED', message: 'AI support is not configured.' });
  }

  try {
    const result = await callRealAiProvider({ question, context });
    return res.status(200).json(result);
  } catch (error) {
    if (error.code === 'AI_PROVIDER_RESPONSE_INVALID') {
      return res.status(502).json({ code: error.code, message: 'AI support returned an invalid response.' });
    }
    return res.status(502).json({ code: 'AI_PROVIDER_UNAVAILABLE', message: 'AI support is unavailable right now.' });
  }
});

app.listen(port, () => {
  console.log(`External AI chatbot system listening on port ${port}.`);
});
