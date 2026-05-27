//Einzelne Aktie im Portfolio eines Users
export type PortfolioPosition = {
    stockId: string;
    ticker: string;
    quantity: number;
    currentPrice: number;
    marketValue: number;
};

//Ergebnis von einem Kauf/Verkauf
export type TradeResult = {
    userId: string;
    stockId: string;
    tradeType: "BUY" | "SELL";
    quantity: number;
    executedPrice: number;
    totalValue: number;
};

//Portfolio-Eckdaten eines Users
export type PortfolioSummary = {
  id: string;
  userId: string;
  cashBalance: number;
  startingCapital: number;
  status: "ACTIVE" | "DEFAULTED";
};

//Alle Mock-Daten nach den Mustern der bereits gg. DB, um den spaeteren Anschluss zu erleichtern
export class PortfolioService {
    //Portfolio eines Users kriegen
    async getPortfolioByUserId(userId: string): Promise<PortfolioSummary> {
        return {
            id: "portfolio-1",
            userId,
            cashBalance: 100_000,
            startingCapital: 100_000,
            status: "ACTIVE",
        };
    }

    //Die Aktienpositionen eines Users
    async getHoldingsByUserId(userId: string): Promise<PortfolioPosition[]> {
        return[
            {
                stockId: "stock-aapl",
                ticker: "AAPL",
                quantity: 5,
                currentPrice: 210,
                marketValue: 5*210,
            },
            {
                stockId: "stock-tsla",
                ticker: "TSLA",
                quantity: 2,
                currentPrice: 330,
                marketValue: 2 * 330,
            },
        ];
    }

    //Aktienkauf
    async buyStock(userId: string, stockId: string, quantity: number): Promise<TradeResult> {
        const executedPrice = await this.getLatestPrice(stockId);
        const totalValue = executedPrice * quantity;

        return {
        userId,
        stockId,
        tradeType: "BUY",
        quantity,
        executedPrice,
        totalValue,
        };
    }

    //Bei den Trade-Services: spaeter muessen sich hier wirklich Bestaende reduzieren etc.

    //Aktienverkauf
    async sellStock(userId: string, stockId: string, quantity: number): Promise<TradeResult> {
        const executedPrice = await this.getLatestPrice(stockId);
        const totalValue = executedPrice * quantity;

        return {
        userId,
        stockId,
        tradeType: "SELL",
        quantity,
        executedPrice,
        totalValue,
        };
    }

    //Fuer das Leaderboard spaeter den exakten aktuellen Wert des Portfolios eines Users, ohne die einzelnen Daten
    //Besprechen, ob wir das nur mit diesem einen Wert hier im Leaderboard sortieren wollen
    async getPortfolioValue(userId: string): Promise<number> {
        const holdings = await this.getHoldingsByUserId(userId);

        return holdings.reduce((sum, holding) => sum + holding.marketValue, 0);
    }

    private async getLatestPrice(stockId: string): Promise<number> {
        const mockPrices: Record<string, number> = {
        "stock-aapl": 210,
        "stock-tsla": 330,
        "stock-msft": 420,
        };

        return mockPrices[stockId] ?? 100;
    }

}