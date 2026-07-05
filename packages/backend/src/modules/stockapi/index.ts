export { AlphaVantageClient, createAlphaVantageClient } from './vantage/vantage.client.ts'
export { AlphaVantageStockClient } from './vantage/vantage-stock-client.ts'
export { UniStockClient } from './uni-stock-client.ts'
export { SyntheticQuoteClient, SYNTHETIC_QUOTE_SOURCE } from './synthetic-quote-client.ts'
export { createStockQuoteClient } from './create-stock-quote-client.ts'
export { fetchQuotesInBatches, readQuoteBatchOptions } from './batch-quote-fetch.ts'
export type { StockQuoteClient } from './stock-quote-client.ts'
export type { StockDataClient, StockMeta, StockQuote } from './stock-data-client.ts'
export type {
    Daily,
    DailyAdjusted,
    GlobalQuote,
    IndexData,
    IndexInterval,
    IndexSymbol,
    Intraday,
    IntradayInterval,
    MarketStatus,
    MarketStatusEntry,
    Monthly,
    MonthlyAdjusted,
    OhlcvBar,
    OhlcvAdjustedBar,
    OhlcIndexBar,
    OutputSize,
    SymbolMatch,
    SymbolSearch,
    Weekly,
    WeeklyAdjusted,
} from './vantage/vantage.schema.ts'
