import { FastifyReply, FastifyRequest } from 'fastify';
import categorySchema from './categories.js';

export class LLMController {
  async getCategories(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(categorySchema);
  }
}
