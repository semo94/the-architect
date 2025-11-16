import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../shared/middleware/error-handler.js';

export async function jwtGuard(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }
}
