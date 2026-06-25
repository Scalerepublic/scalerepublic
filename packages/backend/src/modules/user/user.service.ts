//Import { eq } from 'drizzle-orm' //importert equals, für die spätere DB ABfrage (Quasi Where ... = ...)

import { eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { portfolio } from '../../db/schema/portfolio/portfolio.ts';
import { holding } from '../../db/schema/portfolio/holding.ts';
import { autoTradeRule } from '../../db/schema/trade/autoTrade.ts';
import { StockService } from '../stock/stock.service.ts';

//Import { db, userProfile } from '../../db/index.ts' //db ist die DB Verbindung //danach kommt die gewünschte Tabelle
//Imports werden erst dann gebraucht, wenn wir keine Mock-Daten mehr verwenden

export type UserProfile = { //So muss ein UserProfile aussehen
  userId: string;
  name: string; //Eigentlich ein Joint von user-profile und better-auth, UserProfile besteht also aus beiden Tabellen zusammen
  cashBalance: number;
  isDefaulted: boolean;
  penaltyCounter: number;
};

export class UserService {

  private stockService = new StockService();

  //Folgende Methode bekommt einen Parameter (ID als String) und gibt das zugehörige Profil zurück
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return {  //Erstmal noch Mock-DAten
      userId,
      name: "Test User",
      cashBalance: 100_000,
      isDefaulted: false,
      penaltyCounter: 0,
    };
  }

  //Networth muss bestimmt werden:
  async getUserNetworth(userId: string): Promise<number> {
    if (!userId) {
      return 0;
    }
    return 100;
  }

  //this method revokes all active auto trade commands of the user
  private async cancelAutoTrades(userId: string): Promise<void> {
    const[userPortfolio] = await db
      .select()
      .from(portfolio)
      .where(eq(portfolio.userId, userId))
      .limit(1);

    if(!userPortfolio) return;

    await db
      .update(autoTradeRule)
      .set({ status: 'CANCELLED' })
      .where(eq(autoTradeRule.portfolioId, userPortfolio.id));
  }


  //this method sells every stock of the user based on the current price
  private async sellAllHoldings(userId: string): Promise<void> {
    const [userPortfolio] = await db 
      .select()
      .from(portfolio)
      .where(eq(portfolio.userId, userId))
      .limit(1);

    if(!userPortfolio) return;
    
    const holdings = await db
      .select()
      .from(holding)
      .where(eq(holding.portfolioId, userPortfolio.id));


      //skip the positions where quantity is 0
      const activeHoldings = holdings.filter((h) => h.quantity > 0);

      //sell every holding
      await Promise.allSettled(
        activeHoldings.map((h) =>
        this.stockService.sell(h.stockId, h.quantity, userId)
      )
    );
  }

  //stops the account: revoke auto trades, set portfolio to DEFAULT
  async pauseAccount(userId: string): Promise<boolean> {
    try {
      await this.cancelAutoTrades(userId);

      await db
        .update(portfolio)
        .set({ status: 'DEFAULTED' })
        .where(eq(portfolio.userId, userId));

      return true;
    } catch{
      return false;
    }
  }

  //delete the account: first sell the stocks, revoke auto trades, then delete user

  async deleteAccount(userId: string): Promise<boolean> {
    try {
      await this.cancelAutoTrades(userId);
      await this.sellAllHoldings(userId);

      await db
        .delete(user)
        .where(eq(user.id, userId));

      return true;
    }
    catch {
      return false;
    }
  }
}
