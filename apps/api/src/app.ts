import cors from 'cors';
import express, { type RequestHandler, type Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { ApiErrorBody } from '@medi-cloud/shared';
import { env, isDeployed } from './config/env';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { authRoutes } from './modules/auth/routes';
import { docsRoutes } from './modules/docs/routes';
import { healthRoutes } from './modules/health/routes';
import { patientsRoutes } from './modules/patients/routes';
import { prescriptionsRoutes } from './modules/prescriptions/routes';
import { tenantsRoutes } from './modules/tenants/routes';
import { usersRoutes } from './modules/users/routes';

export interface AppOptions {
  /** Overrides AUTH_RATE_LIMIT (tests). */
  authRateLimit?: number;
  /** Overrides CORS_ORIGINS (tests). */
  corsOrigins?: string[];
  /** Overrides TRUST_PROXY (tests). */
  trustProxy?: number;
  /** Overrides API_DOCS (tests). */
  apiDocs?: boolean;
}

/** Every API router and where it is mounted. A test checks that the API docs list exactly these routes. */
export function apiRouters(limitAttempts: RequestHandler): [path: string, router: Router][] {
  return [
    ['/api/health', healthRoutes],
    ['/api/auth', authRoutes(limitAttempts)],
    ['/api/users', usersRoutes],
    ['/api/tenants', tenantsRoutes],
    ['/api/patients', patientsRoutes],
    ['/api/prescriptions', prescriptionsRoutes],
  ];
}

/**
 * Browser origins allowed to call the API. Each pattern may use `*` for part of one host label, e.g.
 * https://deploy-preview-*--medi-cloud-app.netlify.app. Locally, any http://localhost port is allowed too.
 */
export function originAllowed(patterns: string[], allowLocalhost: boolean) {
  const escape = (s: string) => s.replace(/[.+?^${}()|[\]\\/]/g, '\\$&');
  const regexes = patterns.map((p) => new RegExp(`^${p.split('*').map(escape).join('[a-z0-9-]*')}$`, 'i'));
  return (origin: string) =>
    regexes.some((r) => r.test(origin)) ||
    (allowLocalhost && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  // Only behind a known proxy may X-Forwarded-For give the client IP; otherwise a client could fake it to dodge rate limits.
  const hops = options.trustProxy ?? env.TRUST_PROXY;
  app.set('trust proxy', hops > 0 ? hops : false);

  // First, so every request gets a log line, even one that fails body parsing.
  // One line per request: method, URL, status and timing. No headers or bodies (patient data, tokens).
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url?.startsWith('/api/health') ?? false },
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  const allowed = originAllowed(options.corsOrigins ?? env.corsOrigins, !isDeployed);
  app.use(helmet());
  app.use(cors({ origin: (origin, done) => done(null, !origin || allowed(origin)) }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  const attempts = options.authRateLimit ?? env.AUTH_RATE_LIMIT;
  const limitAttempts: RequestHandler =
    attempts > 0
      ? rateLimit({
          windowMs: 15 * 60 * 1000,
          limit: attempts,
          standardHeaders: 'draft-8',
          legacyHeaders: false,
          handler: (_req, res) => {
            const body: ApiErrorBody = { error: 'Too many attempts. Try again in a few minutes', code: 'RATE_LIMITED' };
            res.status(429).json(body);
          },
        })
      : (_req, _res, next) => next();

  for (const [path, router] of apiRouters(limitAttempts)) app.use(path, router);
  if (options.apiDocs ?? env.API_DOCS) app.use('/api', docsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
