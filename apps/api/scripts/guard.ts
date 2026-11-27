/** True when the database URL points at this machine or the Docker Compose service, not a hosted database. */
export function isLocalDatabase(url: string): boolean {
  try {
    return ['localhost', '127.0.0.1', '::1', 'postgres'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** The URL with its password hidden, for messages. */
export const redact = (url: string) => url.replace(/\/\/([^:@/]*):[^@/]*@/, '//$1:***@');
