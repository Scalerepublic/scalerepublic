import { z } from "zod";

/**
 * Shared field validation rules. Imported by both the backend (route input
 * validation) and the frontend (form feedback) so the rules and their messages
 * have a single source of truth.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.");

export const emailSchema = z.email("Enter a valid email address.");
