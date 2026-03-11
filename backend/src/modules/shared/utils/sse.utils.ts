import { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';

/**
 * Initialises a Server-Sent Events (SSE) response on the raw Node.js socket.
 *
 * Must be called before any streaming writes. It:
 *   - reflects the request Origin in CORS headers when the origin is
 *     included in ALLOWED_ORIGINS
 *   - writes the SSE status line and required headers
 *
 * Note: does NOT call reply.hijack() — Fastify awaits the async handler
 * naturally, and its post-handler send attempt against the already-ended
 * raw response is silently ignored by Node.js.
 */
export function startSseResponse(request: FastifyRequest, reply: FastifyReply): void {
  const origin = request.headers['origin'];
  const corsHeaders: Record<string, string> = {};

  if (origin && env.ALLOWED_ORIGINS.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  }

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    ...corsHeaders,
  });
}
