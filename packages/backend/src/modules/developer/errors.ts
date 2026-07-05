export class DeveloperNotEnabledError extends Error {
  override readonly name = 'DeveloperNotEnabledError';
  constructor(userId: string) {
    super(`Developer mode is not enabled for user ${userId}`);
  }
}

export class ApiKeyNotFoundError extends Error {
  override readonly name = 'ApiKeyNotFoundError';
  constructor(keyId: string) {
    super(`API key not found: ${keyId}`);
  }
}

export class ApiKeyLimitReachedError extends Error {
  override readonly name = 'ApiKeyLimitReachedError';
  constructor(limit: number) {
    super(`Maximum of ${limit} API keys allowed`);
  }
}

export class ApiKeyRateLimitError extends Error {
  override readonly name = 'ApiKeyRateLimitError';
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super('API key rate limit exceeded');
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ApiKeyScopeError extends Error {
  override readonly name = 'ApiKeyScopeError';
  constructor(scope: string) {
    super(`API key missing required scope: ${scope}`);
  }
}
