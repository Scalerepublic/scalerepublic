/**
 * Purpose: Distinguish expected automatic-order failures for consistent API error translation.
 */
export class AutoTradeNotFoundError extends Error {
    override readonly name = 'AutoTradeNotFoundError';
    constructor(ruleId: string) {
        super(`No active auto-trade rule found: ${ruleId}`);
    }
}

export class InvalidAutoTradeError extends Error {
    override readonly name = 'InvalidAutoTradeError';
    constructor(reason: string) {
        super(`Invalid auto-trade rule: ${reason}`);
    }
}
