import jwt from 'jsonwebtoken';
import { env } from '../config/env';

interface TokenPayload {
  userId: string;
}

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });

/** The token's payload, or null if it's malformed, expired or signed with another secret. */
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === 'object' && decoded !== null && typeof decoded['userId'] === 'string') {
      return { userId: decoded['userId'] };
    }
    return null;
  } catch {
    return null;
  }
};
