// Password hashing for the Cloudflare Workers runtime.
//
// better-auth's default hasher is a pure-JS scrypt implementation, which is
// CPU-hard enough to blow past the Workers per-request CPU budget (the cause of
// "Worker exceeded CPU time limit" on sign-up/sign-in). We instead use PBKDF2
// via the Web Crypto API (`crypto.subtle`), which runs as native code and stays
// well within the CPU budget while remaining a sound password hash.

const ITERATIONS = 100_000;
const KEY_LENGTH_BYTES = 32;
const SALT_LENGTH_BYTES = 16;
const DIGEST = "SHA-256";
const ENCODER = new TextEncoder();

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const fromHex = (hex: string): Uint8Array<ArrayBuffer> => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

const derive = async (
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    ENCODER.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: DIGEST },
    keyMaterial,
    KEY_LENGTH_BYTES * 8,
  );

  return new Uint8Array(bits);
};

// Constant-time comparison to avoid leaking timing information.
const timingSafeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) {
      diff = 1;
    }
  }
  return diff === 0;
};

// Stored format: pbkdf2$<digest>$<iterations>$<saltHex>$<hashHex>
export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${DIGEST}$${ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
};

export const verifyPassword = async ({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> => {
  const parts = hash.split("$");
  const [scheme, , iterationsRaw, saltHex, expectedHex] = parts;
  if (
    parts.length !== 5 ||
    scheme !== "pbkdf2" ||
    iterationsRaw === undefined ||
    saltHex === undefined ||
    expectedHex === undefined
  ) {
    return false;
  }

  const iterations = Number.parseInt(iterationsRaw, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const salt = fromHex(saltHex);
  const expected = fromHex(expectedHex);
  const actual = await derive(password, salt, iterations);
  return timingSafeEqual(actual, expected);
};
