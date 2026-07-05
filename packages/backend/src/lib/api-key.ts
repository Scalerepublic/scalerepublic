const API_KEY_PREFIX = 'sr_';
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const randomBase62 = (byteLength: number): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  let value = '';
  for (const byte of bytes) {
    value += BASE62[byte % BASE62.length]!;
  }
  return value;
};

export const generateApiKeySecret = (): string => `${API_KEY_PREFIX}${randomBase62(32)}`;

export const extractApiKeyPrefix = (secret: string): string => secret.slice(0, 12);

export const hashApiKeySecret = async (secret: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const parseBearerApiKey = (authorizationHeader: string | undefined): string | null => {
  if (authorizationHeader === undefined || authorizationHeader === '') {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
  if (match === null) {
    return null;
  }
  const token = match[1]?.trim();
  if (token === undefined || token === '' || !token.startsWith(API_KEY_PREFIX)) {
    return null;
  }
  return token;
};
