import { LoggerService } from '@nestjs/common';
import { RequestContext } from './request-context';

type JsonLogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

export type JsonLogRecord = {
  timestamp: string;
  level: JsonLogLevel;
  service?: string;
  context?: string;
  requestId?: string;
  userId?: string;
  message: any;
  meta?: Record<string, any>;
};

function safeSerialize(value: any) {
  try {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }
    return value;
  } catch {
    return String(value);
  }
}

export class JsonLogger implements LoggerService {
  constructor(private readonly serviceName?: string) {}

  log(message: any, context?: string) {
    this.write('log', message, context);
  }

  error(message: any, stack?: string, context?: string) {
    const meta: Record<string, any> = {};
    if (stack) meta.stack = stack;
    this.write('error', message, context, meta);
  }

  warn(message: any, context?: string) {
    this.write('warn', message, context);
  }

  debug(message: any, context?: string) {
    this.write('debug', message, context);
  }

  verbose(message: any, context?: string) {
    this.write('verbose', message, context);
  }

  private write(
    level: JsonLogLevel,
    message: any,
    context?: string,
    meta?: Record<string, any>,
  ) {
    const ctx = RequestContext.get();
    const record: JsonLogRecord = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      context,
      requestId: ctx?.requestId,
      userId: ctx?.userId,
      message: safeSerialize(message),
      ...(meta && Object.keys(meta).length > 0 ? { meta: safeSerialize(meta) } : {}),
    };

    const line = JSON.stringify(record);
    if (level === 'error') {
      // eslint-disable-next-line no-console
      console.error(line);
    } else {
      // eslint-disable-next-line no-console
      console.log(line);
    }
  }
}
