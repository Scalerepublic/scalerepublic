export class PortfolioNotFoundError extends Error {
    override readonly name = 'PortfolioNotFoundError';
    constructor(portfolioId: string) {
        super(`No portfolio found: ${portfolioId}`);
    }
}

export class UserSuspendedError extends Error {
    override readonly name = 'UserSuspendedError';
    constructor(userId: string) {
        super(`User ${userId} has been suspended after exceeding the maximum number of defaults`);
    }
}

export class PortfolioDefaultedError extends Error {
    override readonly name = 'PortfolioDefaultedError';
    constructor(portfolioId: string) {
        super(`Portfolio ${portfolioId} has defaulted and cannot execute trades`);
    }
}

export class InsufficientFundsError extends Error {
    override readonly name = 'InsufficientFundsError';
    constructor(available: number, required: number) {
        super(`Insufficient funds: have $${available.toFixed(2)}, need $${required.toFixed(2)}`);
    }
}

export class InsufficientHoldingsError extends Error {
    override readonly name = 'InsufficientHoldingsError';
    constructor(stockId: string, available: number, requested: number) {
        super(`Insufficient holdings for ${stockId}: have ${available}, trying to sell ${requested}`);
    }
}

export class StockPriceUnavailableError extends Error {
    override readonly name = 'StockPriceUnavailableError';
    constructor(stockId: string) {
        super(`No current price available for stock ${stockId}`);
    }
}

export class PriceMismatchError extends Error {
    override readonly name = 'PriceMismatchError';
    constructor(expected: number, actual: number) {
        super(`Price mismatch: expected $${expected.toFixed(2)}, current price is $${actual.toFixed(2)}`);
    }
}

export class NoActivePortfolioError extends Error {
    override readonly name = 'NoActivePortfolioError';
    constructor(userId: string) {
        super(`No active portfolio for user ${userId}`);
    }
}
