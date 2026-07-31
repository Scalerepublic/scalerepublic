/**
 * Purpose: Expose this backend module's supported public entry points.
 */
export {
    AutoTradeService,
    type AutoTradeRecord,
    type AutoTradeRuleType,
    type AutoTradeTriggerDirection,
} from './autotrade.service.ts';
export { AutoTradeNotFoundError, InvalidAutoTradeError } from './errors.ts';
