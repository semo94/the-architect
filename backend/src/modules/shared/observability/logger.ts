import { context, trace } from '@opentelemetry/api';
import type { Logger, LoggerOptions } from 'pino';
import stdSerializers from 'pino-std-serializers';
import {
  configureUptraceLogExporterEnv,
  uptraceLogResourceAttributes,
} from './uptrace-log-export.js';

/** Load Pino when called so OTel can start before the pino module is first required. */
function createPino(options?: LoggerOptions): Logger {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pino = require('pino') as (opts?: LoggerOptions) => Logger;
  return pino(options);
}

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

function createUptracePinoLogger(opts: LoggerOptions): Logger {
  configureUptraceLogExporterEnv();

  return createPino({
    ...opts,
    transport: {
      targets: [
        {
          target: 'pino/file',
          options: { destination: 1 },
        },
        {
          target: 'pino-opentelemetry-transport',
          options: {
            resourceAttributes: uptraceLogResourceAttributes(),
          },
        },
      ],
    },
  });
}

/**
 * Fallback root logger before `setRootLogger` runs (e.g. early process hooks).
 */
export function getRootLogger(): Logger {
  if (!rootLogger) {
    const level =
      process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info');
    const baseOpts: LoggerOptions = {
      ...baseLoggerOptions(),
      level,
    };

    rootLogger = configureUptraceLogExporterEnv()
      ? createUptracePinoLogger(baseOpts)
      : createPino(baseOpts);
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

  if (configureUptraceLogExporterEnv()) {
    return createUptracePinoLogger(opts);
  }

  if (options.usePretty) {
    return createPino({
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

  return createPino(opts);
}

export function getModuleLogger(module: string): Logger {
  return getRootLogger().child({ module });
}
