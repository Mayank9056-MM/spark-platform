import argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}

// Computed once, lazily, and cached — never hardcoded as a string, since
// that would tie this file to one exact argon2 parameter encoding forever.
let dummyHashPromise: Promise<string> | null = null;

function getDummyHash(): Promise<string> {
  dummyHashPromise ??= argon2.hash('timing-attack-mitigation', ARGON2_OPTIONS);
  return dummyHashPromise;
}

/**
 * Called when a login attempt targets an email that doesn't exist. Runs a
 * real Argon2 verify anyway so response time is indistinguishable from the
 * "user exists, wrong password" path — without this, "user not found"
 * responds measurably faster, which is a real, exploitable enumeration
 * channel via response-timing analysis.
 */
export async function verifyDummyPassword(plain: string): Promise<void> {
  const hash = await getDummyHash();
  await argon2.verify(hash, plain).catch(() => undefined);
}
