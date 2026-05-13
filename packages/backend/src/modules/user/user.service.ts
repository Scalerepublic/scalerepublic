import { eq } from 'drizzle-orm' //importert equals, für die spätere DB ABfrage (Quasi Where ... = ...)

import { db, userProfile } from '../../db/index.ts' //db ist die DB Verbindung //danach kommt die gewünschte Tabelle
//imports werden erst dann gebraucht, wenn wir keine Mock-Daten mehr verwenden

export type UserProfile = { //so muss ein UserProfile aussehen
  userId: string;
  name: string; //eigentlich ein Joint von user-profile und better-auth, UserProfile besteht also aus beiden Tabellen zusammen
  cashBalance: number;
  isDefaulted: boolean;
  penaltyCounter: number;
};

export class UserService {
  //folgende Methode bekommt einen Parameter (ID als String) und gibt das zugehörige Profil zurück
  async getUserProfile(userId: string): Promise<UserProfile> {
    return {  //erstmal noch Mock-DAten
      userId,
      name: "Test User",
      cashBalance: 100_000,
      isDefaulted: false,
      penaltyCounter: 0,
    };
  }

  //Networth muss bestimmt werden:
  async getUserNetworth(userId: string): Promise<number> {
    return 100; //Mock
  }
}
