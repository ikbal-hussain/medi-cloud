import { z } from 'zod';

// Every API error response is { error, code, details? }. `error` is a human-readable message; `code` is stable
// and is what clients should branch on.

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'INVALID_JSON',
  'NO_TOKEN',
  'INVALID_TOKEN',
  'USER_NOT_FOUND',
  'INVALID_CREDENTIALS',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'EMAIL_TAKEN',
  'RATE_LIMITED',
  'SERVICE_UNAVAILABLE',
  'INTERNAL',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const apiErrorBodySchema = z.strictObject({
  error: z.string().meta({ description: 'A human-readable message' }),
  code: z.enum(ERROR_CODES).meta({ description: 'Stable: branch on this, not on the message' }),
  details: z
    .array(z.strictObject({ path: z.string(), message: z.string() }))
    .optional()
    .meta({ description: 'For VALIDATION_ERROR: which fields failed and why' }),
});
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

/** Codes meaning the saved session token is no good, so the client should forget it. */
export const SESSION_REJECTED_CODES: readonly ErrorCode[] = ['NO_TOKEN', 'INVALID_TOKEN', 'USER_NOT_FOUND'];
