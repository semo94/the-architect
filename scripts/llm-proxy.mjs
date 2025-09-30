#!/usr/bin/env node
import cors from 'cors';
import 'dotenv/config';
import express from 'express';

// Env
const PORT = process.env.LLM_PROXY_PORT || 8787;
const PROVIDER = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase();
const API_KEY = process.env.LLM_API_KEY;
const API_URL = process.env.LLM_API_URL || (PROVIDER === 'anthropic'
  ? 'https://api.anthropic.com/v1/messages'
  : 'https://api.openai.com/v1/chat/completions');
const MODEL = process.env.LLM_MODEL || (PROVIDER === 'anthropic'
  ? 'claude-3-5-sonnet-20241022'
  : 'gpt-4o-mini');

if (!API_KEY) {
  console.error('[llm-proxy] Missing LLM_API_KEY');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: true }));
app.options('*', cors({ origin: true }));
app.use((req, _res, next) => {
  console.log(`[llm-proxy] ${req.method} ${req.url}`);
  next();
});
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, provider: PROVIDER, model: MODEL });
});

app.post('/api/llm', async (req, res) => {
  try {
    const body = req.body || {};

    let targetUrl = API_URL;
    let headers = { 'Content-Type': 'application/json' };
    let payload = body;

    if (PROVIDER === 'anthropic') {
      headers['x-api-key'] = API_KEY;
      headers['anthropic-version'] = '2023-06-01';
      payload = {
        model: body.model || MODEL,
        max_tokens: body.max_tokens ?? 4000,
        temperature: body.temperature ?? 0.7,
        messages: body.messages || [],
      };
    } else {
      headers['Authorization'] = `Bearer ${API_KEY}`;
      payload = {
        model: body.model || MODEL,
        messages: body.messages || [],
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 4000,
      };
    }

    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    try {
      res.type('application/json').send(JSON.parse(text));
    } catch {
      res.type('text/plain').send(text);
    }
  } catch (err) {
    console.error('[llm-proxy] Error:', err);
    res.status(500).json({ error: 'Proxy error', message: err?.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`[llm-proxy] Listening on http://localhost:${PORT}`);
});


