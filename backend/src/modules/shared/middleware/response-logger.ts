import { FastifyReply, FastifyRequest } from 'fastify';
import { splitUrlForAccessLog } from '../utils/http-log.utils.js';

export async function responseLogger(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { urlPath, queryPresent } = splitUrlForAccessLog(request.url);
  request.log.info(
    {
      component: 'http_server',
      phase: 'response',
      method: request.method,
      urlPath,
      queryPresent,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      route: request.routeOptions?.url,
      requestId: request.id,
    },
    'request completed'
  );
}
