export const getMarketDebugOperatorEmail = (): string =>
    (process.env.MARKET_DEBUG_OPERATOR_EMAIL ?? 'test@test.com').trim().toLowerCase();

export const isMarketDebugEnabled = (): boolean => process.env.STOCK_DEBUG === 'true';

export const DEBUG_MARKET_PRICE_SOURCE = 'debug_gbm';
