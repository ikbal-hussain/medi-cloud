import { Router } from 'express';
import { openApiDocument } from './openapi';

// Interactive API docs: GET /api/docs renders /api/openapi.json with Scalar (https://scalar.com).
// Scalar loads from a CDN, pinned to one version and checked with Subresource Integrity, so a tampered
// file is refused by the browser. To upgrade: change the version and recompute the hash:
//   curl -sL <url> | openssl dgst -sha384 -binary | openssl base64 -A
const SCALAR = {
  src: 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.78.1/dist/browser/standalone.js',
  integrity: 'sha384-HVpqul+lojb2wwVK554SYr5rD2XqgJZqkYKGl4MyZarBSg+rHR9F0x1LVgzgj7JZ',
};

// Nothing leaves the page except the API calls themselves: no telemetry, web fonts, AI agent or hosted client.
const SCALAR_CONFIG = {
  telemetry: false,
  withDefaultFonts: false,
  agent: { disabled: true },
  hideClientButton: true,
  showDeveloperTools: 'never',
  // Show the bearer-token box straight away: most endpoints need it.
  authentication: { preferredSecurityScheme: 'bearerAuth' },
  metaData: { title: 'Medi Cloud API' },
};

// Stricter than the API's default: the page may run Scalar from the CDN and call this API, nothing else.
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export const docsRoutes = Router();

docsRoutes.get('/openapi.json', (_req, res) => {
  res.json(openApiDocument());
});

docsRoutes.get('/docs', (req, res) => {
  // An absolute path under the API's own mount point (/api), like the document's `servers` entry. A proxy in
  // front must keep the /api prefix, as the bundled nginx config does.
  const specUrl = `${req.baseUrl}/openapi.json`;
  res.setHeader('Content-Security-Policy', CSP);
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Medi Cloud API</title>
    <!-- No favicon: stops the browser asking the API for one. -->
    <link rel="icon" href="data:," />
  </head>
  <body>
    <script id="api-reference" type="application/json" data-url="${escapeAttribute(specUrl)}" data-configuration="${escapeAttribute(JSON.stringify(SCALAR_CONFIG))}"></script>
    <script src="${SCALAR.src}" integrity="${SCALAR.integrity}" crossorigin="anonymous"></script>
  </body>
</html>
`);
});
