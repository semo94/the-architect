import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { authRoutes } from './modules/auth/auth.routes.js';
import { jwtGuard } from './modules/auth/guards/jwt.guard.js';
import { llmRoutes } from './modules/llm/llm.routes.js';
import { quizRoutes } from './modules/quiz/quiz.routes.js';
import { RATE_LIMITS } from './modules/shared/config/constants.js';
import { env } from './modules/shared/config/env.js';
import { errorHandler } from './modules/shared/middleware/error-handler.js';
import { requestLogger } from './modules/shared/middleware/request-logger.js';
import { topicRoutes } from './modules/topic/topic.routes.js';
import { userRoutes } from './modules/user/user.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'debug' : 'info',
      transport: env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    },
    trustProxy: true,
  });

  // Register helmet for security headers
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    } : false,
  });

  // Register CORS
  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Platform'],
  });

  // Register rate limiting
  await app.register(rateLimit, {
    max: RATE_LIMITS.GLOBAL.MAX,
    timeWindow: RATE_LIMITS.GLOBAL.TIME_WINDOW,
  });

  // Register cookie support
  await app.register(cookie, {
    secret: env.JWT_ACCESS_SECRET,
    parseOptions: {},
  });

  // Register JWT
  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    cookie: {
      cookieName: 'access_token',
      signed: false,
    },
    decode: { complete: true },
  });

  // Add authenticate decorator
  app.decorate('authenticate', jwtGuard);

  // Custom middleware
  app.addHook('onRequest', requestLogger);
  app.setErrorHandler(errorHandler);

  // Health check
  app.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  }));

  // Register routes
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(userRoutes, { prefix: '/users' });
  await app.register(topicRoutes, { prefix: '/topics' });
  await app.register(quizRoutes, { prefix: '/quizzes' });
  await app.register(llmRoutes, { prefix: '/llm' });

  return app;
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof jwtGuard;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      sub: string;
      githubId: string;
      username: string;
      email?: string;
      platform?: 'web' | 'mobile';
      iat: number;
      exp: number;
    };
  }
}
