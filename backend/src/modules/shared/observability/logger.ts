import { context, trace } from '@opentelemetry/api';
import pino, { type Logger, type LoggerOptions } from 'pino';
import stdSerializers from 'pino-std-serializers';

let rootLogger: Logger | undefined;

function traceContextMixin(): Record<string, string | undefined> {
  const span = trace.getSpan(context.active());
  if (!span) {
    return {};
  }
  const sc = span.spanContext();
  if (!sc.traceId) {
    return {};
  }
  return {
    trace_id: sc.traceId,
    span_id: sc.spanId,
  };
}

const baseLoggerOptions = (): LoggerOptions => ({
  mixin: traceContextMixin,
  serializers: {
    err: stdSerializers.errWithCause,
  },
});

/**
 * Fallback root logger before `setRootLogger` runs (e.g. early process hooks).
 */
export function getRootLogger(): Logger {
  if (!rootLogger) {
    rootLogger = pino({
      ...baseLoggerOptions(),
      level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
    });
  }
  return rootLogger;
}

export function setRootLogger(logger: Logger): void {
  rootLogger = logger;
}

export function createAppLogger(options: { level: string; usePretty: boolean }): Logger {
  const opts: LoggerOptions = {
    ...baseLoggerOptions(),
    level: options.level,
  };

  if (options.usePretty) {
    return pino({
      ...opts,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  return pino(opts);
}

export function getModuleLogger(module: string): Logger {
  return getRootLogger().child({ module });
}
