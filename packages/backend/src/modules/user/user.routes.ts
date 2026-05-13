import type { Hono } from "hono";
//der folgende Import verbindet Hono und Zod, also es wird über Zod validiert
import { zValidator } from '@hono/zod-validator'

import { UserService } from "./user.service.ts";
import { userIdParamSchema } from "./user.schema.ts";

const userService = new UserService()

export const registerUserRoutes = (app: Hono) => {
  //GET-Endpunkt (:id ist variabel)
  //zValidator überprüft Parameter von GET mit dem gegebenen Schema, dann wird die async Funktion aufgerufen, c ist Hono context
  app.get("/api/v1/users/:id", zValidator("param", userIdParamSchema), async (c) => {
    //bereits  geprüfte id wird genommen
    const {id} = c.req.valid("param");
    //jetzt wird der Service aufgerufen
    const userProfile = await userService.getUserProfile(id);
    if (!userProfile) { //falls es kein User-Profil gibt
      return c.json({error: "User not found"}, 404);
    }
    return c.json({ data: userProfile});
  });

  //nun Networth abfragen über GET
  app.get("/api/v1/users/:id/net-worth", zValidator("param", userIdParamSchema), async (c) => {
    const { id} = c.req.valid("param");
    const netWorth = await userService.getUserNetworth(id);
    return c.json({
      data: {
        userId: id,
        netWorth,
      },
    });
  });
}