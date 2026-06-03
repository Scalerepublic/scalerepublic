export const isMarketDebugEnabled = (): boolean =>
    process.env.STOCK_DEBUG === 'true' ||
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV !== 'production';
