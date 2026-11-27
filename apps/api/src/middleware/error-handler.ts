import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import type { ApiErrorBody } from '@medi-cloud/shared';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

const send = (res: Response, status: number, body: ApiErrorBody) => res.status(status).json(body);

/** Connection-level failures (database down, unreachable, pool exhausted): the request may succeed if retried. */
export function isDatabaseUnavailable(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(err.code);
  }
  // With the pg driver adapter, a refused or dropped connection surfaces as the driver's own error.
  if (!(err instanceof Error)) return false;
  const text = `${err.name} ${err.message} ${String((err as { code?: unknown }).code ?? '')} ${String(err.cause ?? '')}`;
  return /ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|57P01|57P03|Connection terminated|timeout exceeded when trying to connect|DatabaseNotReachable/i.test(
    text,
  );
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  send(res, 404, { error: 'Route not found', code: 'NOT_FOUND' });
};

// Express needs all four parameters to treat this as an error handler.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return send(res, err.status, { error: err.message, code: err.code, ...(err.details && { details: err.details }) });
  }
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return send(res, 400, { error: details[0]?.message ?? 'Invalid request', code: 'VALIDATION_ERROR', details });
  }
  const type = (err as { type?: unknown } | null)?.type;
  if (type === 'entity.parse.failed') return send(res, 400, { error: 'Invalid JSON body', code: 'INVALID_JSON' });
  if (type === 'entity.too.large') return send(res, 413, { error: 'Request body is too large', code: 'VALIDATION_ERROR' });

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Races the route's own checks didn't catch, e.g. two sign-ups with the same email at once.
    if (err.code === 'P2002') {
      return /email/.test(JSON.stringify(err.meta ?? {}))
        ? send(res, 409, { error: 'Email already registered', code: 'EMAIL_TAKEN' })
        : send(res, 409, { error: 'That already exists', code: 'CONFLICT' });
    }
    if (err.code === 'P2003') return send(res, 409, { error: 'Other records still refer to this one', code: 'CONFLICT' });
    if (err.code === 'P2025') return send(res, 404, { error: 'Not found', code: 'NOT_FOUND' });
  }

  if (isDatabaseUnavailable(err)) {
    logger.warn({ err, path: req.path }, 'database unavailable');
    return send(res, 503, { error: 'Database unavailable, try again shortly', code: 'SERVICE_UNAVAILABLE' });
  }

  // Anything else is a bug: log it in full, but never send internals to the client.
  logger.error({ err, method: req.method, path: req.path }, 'unhandled error');
  return send(res, 500, { error: 'Something went wrong', code: 'INTERNAL' });
};
