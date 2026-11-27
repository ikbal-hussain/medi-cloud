import jwt from 'jsonwebtoken';
import { z } from 'zod';

/**
 * Every setting the API reads, validated once at startup. Empty values count as unset.
 * Documented for operators in .env.example.
 */

/** True on Vercel or with NODE_ENV=production: local-dev fallbacks below must never be used there. */
export const isDeployed = Boolean(process.env['VERCEL']) || process.env['NODE_ENV'] === 'production';

const DEV_JWT_SECRET = 'local-dev-only-jwt-secret';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string({ error: 'DATABASE_URL is required (see apps/api/.env.example)' }).min(1),
  JWT_SECRET: z.string().optional(),
  /** Whole number = seconds; otherwise a duration like 30m, 12h or 7d. Checked against the token library now,
   *  so a typo stops the server at startup instead of failing every login. */
  JWT_EXPIRES_IN: z
    .string()
    .default('7d')
    .transform((v) => (/^\d+$/.test(v) ? Number(v) : v))
    .refine(
      (v) => {
        try {
          jwt.sign({}, 'probe', { expiresIn: v as jwt.SignOptions['expiresIn'] });
          return true;
        } catch {
          return false;
        }
      },
      { error: 'JWT_EXPIRES_IN must be seconds (e.g. 3600) or a duration like 12h or 7d' },
    ),
  /** Comma-separated browser origins allowed to call the API; `*` matches within one host label. */
  CORS_ORIGINS: z.string().default('https://medi-cloud-app.netlify.app'),
  /** Login/register attempts per IP per 15 minutes; 0 turns the limit off. */
  AUTH_RATE_LIMIT: z.coerce.number().int().min(0).default(20),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).optional(),
  /** Proxies in front of the API whose X-Forwarded-For to trust for the client IP (rate limits). 0 = none.
   *  Defaults to 1 on Vercel; set it when running behind nginx or a load balancer. */
  TRUST_PROXY: z.coerce.number().int().min(0).optional(),
});

export type Env = Omit<z.infer<typeof schema>, 'JWT_SECRET' | 'LOG_LEVEL' | 'TRUST_PROXY'> & {
  JWT_SECRET: string;
  LOG_LEVEL: NonNullable<z.infer<typeof schema>['LOG_LEVEL']>;
  TRUST_PROXY: number;
  corsOrigins: string[];
};

export function loadEnv(source: NodeJS.ProcessEnv): Env {
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value.trim() !== ''),
  );
  const parsed = schema.safeParse(cleaned);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid API configuration:\n${problems}`);
  }
  const value = parsed.data;
  // Deployed, a missing JWT_SECRET stops the server: the dev fallback is public, so tokens signed with it could be forged.
  if (!value.JWT_SECRET && isDeployed) throw new Error('Invalid API configuration:\n  JWT_SECRET: required when deployed');
  return {
    ...value,
    JWT_SECRET: value.JWT_SECRET ?? DEV_JWT_SECRET,
    LOG_LEVEL: value.LOG_LEVEL ?? (value.NODE_ENV === 'test' ? 'silent' : 'info'),
    TRUST_PROXY: value.TRUST_PROXY ?? (source['VERCEL'] ? 1 : 0),
    corsOrigins: value.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  };
}

export const env = loadEnv(process.env);
