export type MarketSectorId =
    | 'technology'
    | 'media'
    | 'finance'
    | 'healthcare'
    | 'energy'
    | 'consumer'

export type MarketSectorDefinition = {
    id: MarketSectorId
    label: string
    description: string
    tickers: readonly string[]
}

export const MARKET_SECTORS: readonly MarketSectorDefinition[] = [
    {
        id: 'technology',
        label: 'Technology',
        description: 'Software, semiconductors, and platform leaders',
        tickers: [
            'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'AVGO', 'ORCL', 'CRM',
            'AMD', 'INTC', 'CSCO', 'IBM', 'QCOM', 'TXN', 'ADI', 'MU', 'AMAT', 'LRCX',
            'KLAC', 'SNPS', 'CDNS', 'PANW', 'CRWD', 'SNOW', 'NOW', 'UBER', 'ABNB', 'SHOP',
            'PLTR', 'NET', 'DDOG', 'ZS', 'MDB', 'TEAM', 'ADBE', 'INTU', 'SAP', 'ASML',
        ],
    },
    {
        id: 'media',
        label: 'Media & Entertainment',
        description: 'Streaming, studios, and live experiences',
        tickers: [
            'DIS', 'NFLX', 'WBD', 'PARA', 'CMCSA', 'FOX', 'FOXA', 'SPOT', 'ROKU', 'LYV',
            'EA', 'TTWO', 'RBLX', 'MTCH', 'PINS', 'SNAP', 'TMUS', 'VZ', 'T', 'OMC',
            'IPG', 'WPP', 'NWSA', 'NWS', 'SIRI', 'LGF-A', 'IMAX', 'MSGS', 'FWONK', 'FWONA',
        ],
    },
    {
        id: 'finance',
        label: 'Finance',
        description: 'Banks, payments, and market infrastructure',
        tickers: [
            'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'BLK', 'SCHW', 'V', 'MA',
            'AXP', 'COF', 'USB', 'PNC', 'TFC', 'BK', 'STT', 'CME', 'ICE', 'MCO',
            'SPGI', 'MSCI', 'CB', 'MMC', 'AON', 'PGR', 'TRV', 'ALL', 'MET', 'PRU',
            'AIG', 'BX', 'KKR', 'APO', 'COIN', 'HOOD', 'SOFI', 'PYPL', 'SQ', 'FIS',
        ],
    },
    {
        id: 'healthcare',
        label: 'Healthcare',
        description: 'Pharma, biotech, and care delivery',
        tickers: [
            'UNH', 'JNJ', 'LLY', 'PFE', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'BMY',
            'AMGN', 'GILD', 'VRTX', 'REGN', 'ISRG', 'CVS', 'CI', 'ELV', 'HUM', 'ZTS',
            'MDT', 'BSX', 'SYK', 'BDX', 'EW', 'DXCM', 'IDXX', 'HCA', 'MCK', 'CAH',
            'BIIB', 'MRNA', 'ILMN', 'ALNY', 'SGEN', 'EXAS', 'VEEV', 'IQV', 'CRL', 'WAT',
        ],
    },
    {
        id: 'energy',
        label: 'Energy',
        description: 'Oil, gas, utilities, and renewables',
        tickers: [
            'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'OXY', 'HAL',
            'BKR', 'KMI', 'WMB', 'OKE', 'DVN', 'FANG', 'APA', 'EQT', 'HES', 'MRO',
            'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'XEL', 'PCG', 'ED',
            'ENPH', 'FSLR', 'RUN', 'PLUG', 'BE', 'NOVA', 'ARRY', 'CSIQ', 'SEDG', 'GE',
        ],
    },
    {
        id: 'consumer',
        label: 'Consumer',
        description: 'Retail, staples, and household brands',
        tickers: [
            'WMT', 'COST', 'TGT', 'HD', 'LOW', 'NKE', 'SBUX', 'MCD', 'KO', 'PEP',
            'PG', 'CL', 'EL', 'ULTA', 'TJX', 'ROST', 'DG', 'DLTR', 'YUM', 'CMG',
            'LULU', 'DECK', 'ON', 'TPR', 'RL', 'PVH', 'GPS', 'ANF', 'BBY', 'F',
            'GM', 'STLA', 'RIVN', 'LCID', 'MAR', 'HLT', 'BKNG', 'EXPE', 'CCL', 'RCL',
        ],
    },
] as const

const sectorById = new Map(MARKET_SECTORS.map((sector) => [sector.id, sector]))

export const getMarketSector = (id: string): MarketSectorDefinition | undefined =>
    sectorById.get(id as MarketSectorId)

export const getSectorTickers = (id: string): string[] => {
    const sector = getMarketSector(id)
    if (sector === undefined) {
        return []
    }
    return [...sector.tickers]
}
