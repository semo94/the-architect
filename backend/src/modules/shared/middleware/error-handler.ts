import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export async function errorHandler(
  error: FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Log error
  request.log.error(error);

  // Handle known errors
  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    });
    return;
  }

  // Handle Fastify validation errors
  if (error.validation) {
    reply.status(400).send({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: error.validation,
    });
    return;
  }

  // Handle other Fastify errors
  if (error.statusCode) {
    reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    });
    return;
  }

  // Handle unknown errors
  reply.status(500).send({
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
    statusCode: 500,
  });
}
