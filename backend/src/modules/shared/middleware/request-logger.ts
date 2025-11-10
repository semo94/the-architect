import { FastifyRequest, FastifyReply } from 'fastify';

export async function requestLogger(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  request.log.info({
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    platform: request.headers['x-platform'],
  });
}
