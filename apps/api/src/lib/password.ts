import bcrypt from 'bcryptjs';

const ROUNDS = 10;

export const hashPassword = (password: string) => bcrypt.hash(password, ROUNDS);

// Compared against when the email doesn't exist, so a login takes as long for an unknown email as for a wrong
// password and response times don't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', ROUNDS);

export const verifyPassword = (password: string, hash: string | undefined) =>
  bcrypt.compare(password, hash ?? DUMMY_HASH).then((ok) => ok && hash !== undefined);
