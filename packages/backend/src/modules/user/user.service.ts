//Import { eq } from 'drizzle-orm' //importert equals, für die spätere DB ABfrage (Quasi Where ... = ...)

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
}
