import { z } from 'zod';
import { notFound } from './errors';

const uuid = z.uuid();

export const isUuid = (value: unknown): value is string => uuid.safeParse(value).success;

/** A record id from the URL. Anything that isn't a UUID can't exist, so it's a 404 rather than a database error. */
export function parseId(value: unknown, what: string): string {
  if (!isUuid(value)) throw notFound(what);
  return value;
}
