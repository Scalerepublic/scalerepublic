import { z } from "zod";

import { emailSchema, passwordSchema } from "../../lib/validation.ts";

export const resetPasswordSchema = z.object({
  email: emailSchema,
  newPassword: passwordSchema,
});

export const emailAvailableSchema = z.object({
  email: emailSchema,
});
