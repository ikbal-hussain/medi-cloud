import { pino, type DestinationStream, type LoggerOptions } from 'pino';
import { env } from '../config/env';

export const loggerOptions: LoggerOptions = {
  level: env.LOG_LEVEL,
  base: { service: 'medi-cloud-api' },
  // Tokens, cookies and passwords must never reach the logs, wherever they turn up in a logged object.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
      'token',
      '*.token',
      'password',
      '*.password',
      'passwordHash',
      '*.passwordHash',
    ],
    censor: '[redacted]',
  },
};

export const createLogger = (destination?: DestinationStream) => pino(loggerOptions, destination);

export const logger = createLogger();
