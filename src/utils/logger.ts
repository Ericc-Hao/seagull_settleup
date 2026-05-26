import { getErrorMessage } from './errors';
import { maskEmail } from './validation';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>, error?: unknown) => void;
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => void;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  namespace: string;
  message: string;
  context?: Record<string, unknown>;
  error?: string;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

const PRODUCTION_MIN_LEVEL: LogLevel = 'warn';
const DEVELOPMENT_MIN_LEVEL: LogLevel = 'debug';

const SENSITIVE_KEY_FRAGMENTS = [
  'password',
  'token',
  'access_token',
  'refresh_token',
  'session',
  'authorization',
  'apikey',
  'api_key',
  'secret',
  'service_role',
  'anon_key',
  'publishable_key',
] as const;

let remoteLogHandler: ((entry: LogEntry) => void) | null = null;

export function setRemoteLogHandler(handler: ((entry: LogEntry) => void) | null): void {
  remoteLogHandler = handler;
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function sanitizeValue(key: string, value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return '[truncated]';
  }

  if (value == null) {
    return value;
  }

  if (isSensitiveKey(key)) {
    return '[redacted]';
  }

  if (typeof value === 'string') {
    if (key.toLowerCase().includes('email') && value.includes('@')) {
      return maskEmail(value);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return { length: value.length };
  }

  if (typeof value === 'object') {
    if ('access_token' in value || 'refresh_token' in value || 'provider_token' in value) {
      return '[redacted session object]';
    }
    return sanitizeContext(value as Record<string, unknown>, depth + 1);
  }

  return value;
}

export function sanitizeContext(context?: Record<string, unknown>, depth = 0): Record<string, unknown> | undefined {
  if (!context) {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    sanitized[key] = sanitizeValue(key, value, depth);
  }
  return sanitized;
}

function shouldLog(level: LogLevel): boolean {
  const minLevel = IS_DEV ? DEVELOPMENT_MIN_LEVEL : PRODUCTION_MIN_LEVEL;
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
}

function buildEntry(
  level: LogLevel,
  namespace: string,
  message: string,
  context?: Record<string, unknown>,
  error?: unknown,
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    namespace,
    message,
    context: sanitizeContext(context),
    error: error ? getErrorMessage(error) : undefined,
  };
}

function writeLog(entry: LogEntry): void {
  if (!shouldLog(entry.level)) {
    return;
  }

  remoteLogHandler?.(entry);

  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.namespace}] ${entry.message}`;
  const details = [
    entry.context ? entry.context : null,
    entry.error ? { error: entry.error } : null,
  ].filter(Boolean);

  switch (entry.level) {
    case 'debug':
      console.debug(prefix, ...details);
      break;
    case 'info':
      console.info(prefix, ...details);
      break;
    case 'warn':
      console.warn(prefix, ...details);
      break;
    case 'error':
      console.error(prefix, ...details);
      break;
  }
}

export function createLogger(namespace: string): Logger {
  return {
    debug(message, context) {
      writeLog(buildEntry('debug', namespace, message, context));
    },
    info(message, context) {
      writeLog(buildEntry('info', namespace, message, context));
    },
    warn(message, context, error) {
      writeLog(buildEntry('warn', namespace, message, context, error));
    },
    error(message, error, context) {
      writeLog(buildEntry('error', namespace, message, context, error));
    },
  };
}
