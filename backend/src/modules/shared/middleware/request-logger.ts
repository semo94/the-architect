import { FastifyReply, FastifyRequest } from 'fastify';
import { splitUrlForAccessLog } from '../utils/http-log.utils.js';

export async function requestLogger(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const { urlPath, queryPresent } = splitUrlForAccessLog(request.url);
  request.log.info({
    component: 'http_server',
    phase: 'request',
    method: request.method,
    urlPath,
    queryPresent,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    platform: request.headers['x-platform'],
    requestId: request.id,
  });
}
