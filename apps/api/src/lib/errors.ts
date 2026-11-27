import type { ApiErrorBody, ErrorCode } from '@medi-cloud/shared';

/** An error the API answers with on purpose: its status, code and message go to the client as they are. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ApiErrorBody['details'],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (what: string) => new AppError(404, 'NOT_FOUND', `${what} not found`);
export const forbidden = (message = 'Insufficient permissions') => new AppError(403, 'FORBIDDEN', message);
export const badRequest = (message: string) => new AppError(400, 'VALIDATION_ERROR', message);
export const conflict = (message: string) => new AppError(409, 'CONFLICT', message);
export const emailTaken = () => new AppError(409, 'EMAIL_TAKEN', 'Email already registered');
