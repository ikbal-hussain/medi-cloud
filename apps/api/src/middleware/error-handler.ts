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
    // P2037: PostgreSQL ran out of connections (SQLSTATE 53300); retrying shortly usually works.
    return ['P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2037'].includes(err.code);
  }
  // With the pg driver adapter, a refused or dropped connection surfaces as the driver's own error.
  if (!(err instanceof Error)) return false;
  const text = `${err.name} ${err.message} ${String((err as { code?: unknown }).code ?? '')} ${String(err.cause ?? '')}`;
  return /ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|57P01|57P03|Connection terminated|timeout exceeded when trying to connect|DatabaseNotReachable|too many (database )?connections|53300/i.test(
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
  const log = req.log ?? logger;
  const type = (err as { type?: unknown } | null)?.type;
  if (type === 'entity.parse.failed') return send(res, 400, { error: 'Invalid JSON body', code: 'INVALID_JSON' });

  // Other client mistakes Express or body-parser already rejected with a 4xx (bad URL encoding, unsupported
  // charset, body too large, aborted upload): keep their status, with a plain message.
  const status = (err as { status?: unknown; statusCode?: unknown } | null)?.status ?? (err as { statusCode?: unknown } | null)?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    log.warn({ err, path: req.path }, 'rejected request');
    const message = { 413: 'Request body is too large', 415: 'Unsupported content type' }[status] ?? 'Bad request';
    return send(res, status, { error: message, code: 'VALIDATION_ERROR' });
  }

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
    log.warn({ err, path: req.path }, 'database unavailable');
    return send(res, 503, { error: 'Database unavailable, try again shortly', code: 'SERVICE_UNAVAILABLE' });
  }

  // Anything else is a bug: log it in full, but never send internals to the client.
  log.error({ err, method: req.method, path: req.path }, 'unhandled error');
  return send(res, 500, { error: 'Something went wrong', code: 'INTERNAL' });
};
