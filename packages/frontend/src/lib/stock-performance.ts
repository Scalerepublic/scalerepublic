/**
 * Purpose: Convert a percentage price change into its corresponding currency amount.
 */
export function periodChangeToAmount(price: number, periodChangePercent: number): number {
	return price - price / (1 + periodChangePercent / 100);
}
