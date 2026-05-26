import { zValidator } from "@hono/zod-validator";

import { useCtx, type App } from "../../context.ts";

import { userIdParamSchema } from "./user.schema.ts";

export const registerUserRoutes = (app: App) => {
  //GET-Endpunkt (:id ist variabel)
  //ZValidator überprüft Parameter von GET mit dem gegebenen Schema, dann wird die async Funktion aufgerufen, c ist Hono context
  app.get("/api/v1/users/:id", zValidator("param", userIdParamSchema), async (c) => {
    //Bereits  geprüfte id wird genommen
    const {id} = c.req.valid("param");
    //Jetzt wird der Service aufgerufen
    const { userService } = useCtx(c);
    const userProfile = await userService.getUserProfile(id);
    if (!userProfile) { //Falls es kein User-Profil gibt
      return c.json({error: "User not found"}, 404);
    }
    return c.json({ data: userProfile});
  });

  //Nun Networth abfragen über GET
  app.get("/api/v1/users/:id/net-worth", zValidator("param", userIdParamSchema), async (c) => {
    const { id} = c.req.valid("param");
    const { userService } = useCtx(c);
    const netWorth = await userService.getUserNetworth(id);
    return c.json({
      data: {
        userId: id,
        netWorth,
      },
    });
  });
}
