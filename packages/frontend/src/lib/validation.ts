/**
 * Purpose: Convert Zod issues into field-level messages suitable for Svelte forms.
 */
import type { ZodType } from 'zod';

/** First validation issue for a non-empty value, or null while the field is empty or valid. */
export function firstIssue(schema: ZodType<string>, value: string): string | null {
	if (value.length === 0) return null;
	return schema.safeParse(value).error?.issues[0]?.message ?? null;
}
